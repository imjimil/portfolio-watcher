import { NextRequest, NextResponse } from 'next/server';

const YAHOO_FINANCE_BASE_URL = 'https://query1.finance.yahoo.com';

// Quick stats: VIX, DXY (US Dollar Index), BTC, ETH - essential market health indicators
const QUICK_STATS_SYMBOLS = [
  { symbol: '^VIX', label: 'VIX', name: 'Volatility Index' },
  { symbol: 'DX-Y.NYB', label: 'DXY', name: 'US Dollar Index' },
  { symbol: 'BTC-USD', label: 'BTC', name: 'Bitcoin' },
  { symbol: 'ETH-USD', label: 'ETH', name: 'Ethereum' },
];

type QuickStatResult = {
  symbol: string;
  label: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
  marketState?: string;
};

async function fetchQuote(symbol: string): Promise<QuickStatResult | null> {
  try {
    const url = `${YAHOO_FINANCE_BASE_URL}/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`;
    const response = await fetch(url, { next: { revalidate: 30 } });
    if (!response.ok) return null;

    const data = await response.json();
    const result = data?.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta || {};
    const config = QUICK_STATS_SYMBOLS.find((s) => s.symbol === symbol);

    const price = meta.regularMarketPrice ?? 0;
    const previousClose = meta.chartPreviousClose ?? meta.previousClose ?? price;
    const change = price - previousClose;
    const changePercent = previousClose ? (change / previousClose) * 100 : 0;

    return {
      symbol,
      label: config?.label || symbol,
      name: config?.name || meta.shortName || meta.longName || symbol,
      price,
      change,
      changePercent,
      previousClose,
      marketState: meta.marketState,
    };
  } catch (error) {
    console.error(`Error fetching ${symbol}:`, error);
    return null;
  }
}

export async function GET(_req: NextRequest) {
  try {
    const results = await Promise.all(
      QUICK_STATS_SYMBOLS.map((item) => fetchQuote(item.symbol))
    );

    const filtered = results.filter((r): r is QuickStatResult => r !== null);

    return NextResponse.json(filtered, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    });
  } catch (error) {
    console.error('Error fetching quick stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quick stats data' },
      { status: 500 }
    );
  }
}
