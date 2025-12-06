import { NextRequest, NextResponse } from 'next/server';

const YAHOO_FINANCE_BASE_URL = 'https://query1.finance.yahoo.com';

type QuoteResult = {
  symbol: string;
  label: string;
  category: 'equity' | 'commodity' | 'currency' | 'bond';
  name: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
  exchange?: string;
  marketState?: string;
};

// Organized by category for cleaner UI
const FUTURES_SYMBOLS: { symbol: string; label: string; category: QuoteResult['category'] }[] = [
  // Equity Futures
  { symbol: 'ES=F', label: 'S&P 500', category: 'equity' },
  { symbol: 'NQ=F', label: 'Nasdaq', category: 'equity' },
  { symbol: 'YM=F', label: 'Dow', category: 'equity' },
  // Commodities
  { symbol: 'GC=F', label: 'Gold', category: 'commodity' },
  { symbol: 'CL=F', label: 'Crude Oil', category: 'commodity' },
  { symbol: 'NG=F', label: 'Nat Gas', category: 'commodity' },
  // Currencies
  { symbol: 'EURUSD=X', label: 'EUR/USD', category: 'currency' },
  { symbol: 'GBPUSD=X', label: 'GBP/USD', category: 'currency' },
  { symbol: 'JPY=X', label: 'USD/JPY', category: 'currency' },
  // Bonds
  { symbol: '^TNX', label: '10Y Yield', category: 'bond' },
];

async function fetchQuote(config: typeof FUTURES_SYMBOLS[0]): Promise<QuoteResult | null> {
  try {
    // Use chart endpoint to get today's data
    const url = `${YAHOO_FINANCE_BASE_URL}/v8/finance/chart/${encodeURIComponent(config.symbol)}?interval=1d&range=2d`;
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
    
    // Get today's latest price
    const price = closes[closes.length - 1];
    
    // Get previous close
    const previousClose = meta.chartPreviousClose ?? meta.previousClose ?? (closes.length > 1 ? closes[closes.length - 2] : price);
    
    // Calculate today's change
    const change = price - previousClose;
    const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

    return {
      symbol: config.symbol,
      label: config.label,
      category: config.category,
      name: meta.shortName || meta.longName || config.label,
      price,
      change,
      changePercent,
      previousClose,
      exchange: meta.exchangeName,
      marketState: meta.marketState,
    };
  } catch (error) {
    console.error(`Error fetching ${config.symbol}:`, error);
    return null;
  }
}

export async function GET(_req: NextRequest) {
  try {
    const results = await Promise.all(FUTURES_SYMBOLS.map(fetchQuote));
    const filtered = results.filter((r): r is QuoteResult => r !== null);

    return NextResponse.json(filtered, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (error) {
    console.error('Error fetching futures:', error);
    return NextResponse.json({ error: 'Failed to fetch futures' }, { status: 500 });
  }
}
