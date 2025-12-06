import { NextRequest, NextResponse } from 'next/server';

const YAHOO_FINANCE_BASE_URL = 'https://query1.finance.yahoo.com';

type QuoteResult = {
  symbol: string;
  label: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
  exchange?: string;
  marketState?: string;
};

// Keep the same set/order as before
const INDEX_SYMBOLS: { symbol: string; label: string }[] = [
  { symbol: '^GSPC', label: 'S&P 500' },
  { symbol: '^IXIC', label: 'NASDAQ' },
  { symbol: '^DJI', label: 'Dow Jones' },
  { symbol: '^GSPTSE', label: 'TSX Composite' },
  { symbol: '^FTSE', label: 'FTSE 100' },
  { symbol: '^GDAXI', label: 'DAX' },
  { symbol: '^FCHI', label: 'CAC 40' },
  { symbol: '^N225', label: 'Nikkei 225' },
  { symbol: '^HSI', label: 'Hang Seng' },
  { symbol: '^AXJO', label: 'ASX 200' },
  { symbol: '^BSESN', label: 'BSE Sensex' },
  { symbol: '^NSEI', label: 'Nifty 50' },
];

async function fetchQuote(idx: { symbol: string; label: string }): Promise<QuoteResult | null> {
  try {
    // Match futures route style: chart endpoint, 2d range to get previous close reliably
    const url = `${YAHOO_FINANCE_BASE_URL}/v8/finance/chart/${encodeURIComponent(idx.symbol)}?interval=1d&range=2d`;
    const response = await fetch(url, { next: { revalidate: 60 } });
    if (!response.ok) return null;

    const data = await response.json();
    const result = data?.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta || {};
    const indicators = result.indicators || {};
    const quote = indicators.quote?.[0];
    if (!quote?.close) return null;

    const closes = quote.close.filter((v: number) => v !== null);
    if (closes.length === 0) return null;

    const price = closes[closes.length - 1];
    const previousClose =
      meta.chartPreviousClose ??
      meta.previousClose ??
      (closes.length > 1 ? closes[closes.length - 2] : price);
    const change = price - previousClose;
    const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

    return {
      symbol: idx.symbol,
      label: idx.label,
      name: meta.shortName || meta.longName || idx.label,
      price,
      change,
      changePercent,
      previousClose,
      exchange: meta.exchangeName,
      marketState: meta.marketState,
    };
  } catch (error) {
    console.error(`Error fetching ${idx.symbol}:`, error);
    return null;
  }
}

export async function GET(_req: NextRequest) {
  try {
    const results = await Promise.all(INDEX_SYMBOLS.map(fetchQuote));
    const filtered = results.filter((r): r is QuoteResult => r !== null);

    return NextResponse.json(filtered, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (error) {
    console.error('Error fetching indices:', error);
    return NextResponse.json({ error: 'Failed to fetch indices' }, { status: 500 });
  }
}

