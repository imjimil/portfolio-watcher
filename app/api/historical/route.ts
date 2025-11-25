import { NextRequest, NextResponse } from 'next/server';

const YAHOO_FINANCE_BASE_URL = 'https://query1.finance.yahoo.com';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol');
  const days = searchParams.get('days') || '30';
  const range = searchParams.get('range'); // Optional: 1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol parameter is required' }, { status: 400 });
  }

  try {
    // Use provided range or calculate from days
    let finalRange = range;
    if (!finalRange) {
      const daysNum = parseInt(days);
      if (daysNum <= 1) finalRange = '1d';
      else if (daysNum <= 5) finalRange = '5d';
      else if (daysNum <= 30) finalRange = '1mo';
      else if (daysNum <= 90) finalRange = '3mo';
      else if (daysNum <= 180) finalRange = '6mo';
      else if (daysNum <= 365) finalRange = '1y';
      else if (daysNum <= 730) finalRange = '2y';
      else if (daysNum <= 1825) finalRange = '5y';
      else finalRange = 'max';
    }
    
    const url = `${YAHOO_FINANCE_BASE_URL}/v8/finance/chart/${symbol.toUpperCase()}?interval=1d&range=${finalRange}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Yahoo Finance API error: ${response.status}`);
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching historical data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch historical data' },
      { status: 500 }
    );
  }
}

