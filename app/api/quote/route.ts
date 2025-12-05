import { NextRequest, NextResponse } from 'next/server';

const YAHOO_FINANCE_BASE_URL = 'https://query1.finance.yahoo.com';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol');

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol parameter is required' }, { status: 400 });
  }

  try {
    const url = `${YAHOO_FINANCE_BASE_URL}/v8/finance/chart/${symbol.toUpperCase()}?interval=1d&range=2d`;
    // Use short revalidation for fresh data during market hours
    const response = await fetch(url, { 
      next: { revalidate: 30 } // Cache for 30 seconds server-side
    });
    
    if (!response.ok) {
      throw new Error(`Yahoo Finance API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Allow short client-side caching (30s) for better performance
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60'
      }
    });
  } catch (error) {
    console.error('Error fetching quote:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quote data' },
      { status: 500 }
    );
  }
}

