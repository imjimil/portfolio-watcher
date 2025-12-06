import { NextRequest, NextResponse } from 'next/server';

const YAHOO_FINANCE_BASE_URL = 'https://query1.finance.yahoo.com';

type StockQuote = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
};

type SectorResult = {
  sector: string;
  emoji: string;
  avgChange: number;
  topMover: StockQuote | null;
  stocks: StockQuote[];
};

// Key sectors with representative stocks (ordered: Tech, Finance, Consumer, Health, Industrial, Energy)
const SECTORS = [
  { sector: 'Technology', emoji: '💻', tickers: ['AAPL', 'MSFT', 'NVDA', 'GOOGL'] },
  { sector: 'Finance', emoji: '🏦', tickers: ['JPM', 'BAC', 'GS', 'V'] },
  { sector: 'Consumer', emoji: '🛒', tickers: ['AMZN', 'TSLA', 'WMT', 'HD'] },
  { sector: 'Healthcare', emoji: '🏥', tickers: ['JNJ', 'UNH', 'PFE', 'ABBV'] },
  { sector: 'Industrial', emoji: '🏭', tickers: ['CAT', 'BA', 'GE', 'UPS'] },
  { sector: 'Energy', emoji: '⚡', tickers: ['XOM', 'CVX', 'COP', 'SLB'] },
];

async function fetchQuote(symbol: string): Promise<StockQuote | null> {
  try {
    // Use chart endpoint with 1d interval to get today's data (same as stockService)
    const url = `${YAHOO_FINANCE_BASE_URL}/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`;
    const response = await fetch(url, { next: { revalidate: 120 } });
    if (!response.ok) return null;

    const data = await response.json();
    const result = data?.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta || {};
    const indicators = result.indicators || {};
    const quote = indicators.quote?.[0];
    
    // Use exact same logic as stockService.getQuoteData
    if (quote && quote.close) {
      const closes = quote.close.filter((v: number) => v !== null);
      
      if (closes.length > 0) {
        const currentPrice = closes[closes.length - 1] || meta.regularMarketPrice || 0;
        const previousClose = closes.length > 1 ? closes[closes.length - 2] : meta.previousClose || currentPrice;
        const change = currentPrice - previousClose;
        const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

        return {
          symbol,
          name: meta.shortName || meta.longName || symbol,
          price: currentPrice,
          change,
          changePercent,
        };
      }
    }
    
    // Fallback to meta data if quote data is not available (same as stockService)
    if (meta.regularMarketPrice) {
      const currentPrice = meta.regularMarketPrice;
      const previousClose = meta.previousClose || currentPrice;
      const change = meta.regularMarketPrice - previousClose;
      const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

      return {
        symbol,
        name: meta.shortName || meta.longName || symbol,
        price: currentPrice,
        change,
        changePercent,
      };
    }
    
    return null;
  } catch {
    return null;
  }
}

export async function GET(_req: NextRequest) {
  try {
    const results: SectorResult[] = await Promise.all(
      SECTORS.map(async (sectorDef) => {
        const quotes = await Promise.all(sectorDef.tickers.map(fetchQuote));
        const stocks = quotes.filter((q): q is StockQuote => q !== null);
        
        // Calculate average sector change
        const avgChange = stocks.length > 0
          ? stocks.reduce((sum, s) => sum + s.changePercent, 0) / stocks.length
          : 0;
        
        // Sort by absolute change to find biggest mover
        const sorted = [...stocks].sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
        
        return {
          sector: sectorDef.sector,
          emoji: sectorDef.emoji,
          avgChange,
          topMover: sorted[0] || null,
          stocks: stocks.slice(0, 3), // Top 3 for detail view
        };
      })
    );

    // Keep original order (Tech, Finance, Consumer, Health, Industrial, Energy)
    return NextResponse.json(results, {
      headers: {
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=240',
      },
    });
  } catch (error) {
    console.error('Error fetching sectors:', error);
    return NextResponse.json({ error: 'Failed to fetch sector data' }, { status: 500 });
  }
}
