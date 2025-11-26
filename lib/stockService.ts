import { Stock, HistoricalData, Transaction, Holding } from '@/types';

// Use Next.js API routes to avoid CORS issues
const API_BASE_URL = '/api';

// Request cache to prevent duplicate API calls
const requestCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 60000; // 1 minute cache for quote data
const SEARCH_CACHE_DURATION = 300000; // 5 minutes cache for search results

/**
 * Make a cached API request through Next.js API routes
 */
async function cachedFetch(endpoint: string, cacheKey: string, cacheDuration: number = CACHE_DURATION): Promise<any> {
  // Check cache first
  const cached = requestCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < cacheDuration) {
    return cached.data;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`);
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Cache successful responses
    requestCache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  } catch (error) {
    console.error(`API request failed for ${cacheKey}:`, error);
    throw error;
  }
}

/**
 * Search for stocks using Yahoo Finance search
 */
export async function searchStocks(query: string): Promise<Stock[]> {
  const upperQuery = query.toUpperCase().trim();
  
  if (upperQuery.length < 1) {
    return [];
  }

  try {
    const cacheKey = `search-${upperQuery}`;
    const endpoint = `/search?q=${encodeURIComponent(upperQuery)}`;
    
    const data = await cachedFetch(endpoint, cacheKey, SEARCH_CACHE_DURATION);
    
    if (data.quotes && data.quotes.length > 0) {
      // Process all quotes - no filtering, just ensure valid symbols
      const stocks = data.quotes
        .map((quote: any) => {
          const symbol = quote.symbol || '';
          const name = quote.longname || quote.shortname || symbol;
          
          // Only exclude if symbol is completely missing
          if (!symbol || symbol.length === 0) {
            return null;
          }
          
          return {
            symbol,
            name,
            matchScore: symbol === upperQuery ? 100 : 
                       symbol.startsWith(upperQuery) ? 50 :
                       symbol.includes(upperQuery) ? 25 : 10,
          };
        })
        .filter((item: any) => item !== null);
      
      // Sort by match score (exact matches first)
      stocks.sort((a: any, b: any) => b.matchScore - a.matchScore);

      // Return all results as basic stock info (no price data yet)
      return stocks.map((item: any) => ({
        symbol: item.symbol,
        name: item.name,
        currentPrice: 0, // Will be fetched when user selects
        previousClose: 0,
        change: 0,
        changePercent: 0,
        volume: 0,
      }));
    }
    
    return [];
  } catch (error) {
    console.error(`Error searching stocks for "${query}":`, error);
    throw error;
  }
}

/**
 * Get stock quote data from Yahoo Finance with extended metrics
 */
async function getQuoteData(symbol: string): Promise<{
  currentPrice: number;
  previousClose: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  peRatio?: number;
  dividendYield?: number;
  high52Week?: number;
  low52Week?: number;
  beta?: number;
} | null> {
  const upperSymbol = symbol.toUpperCase();

  try {
    const cacheKey = `quote-${upperSymbol}`;
    const endpoint = `/quote?symbol=${encodeURIComponent(upperSymbol)}`;
    
    const data = await cachedFetch(endpoint, cacheKey);
    
    if (data.chart && data.chart.result && data.chart.result.length > 0) {
      const result = data.chart.result[0];
      const meta = result.meta || {};
      const indicators = result.indicators || {};
      const quote = indicators.quote || [];
      
      // Extract additional metrics from meta
      const marketCap = meta.marketCap || meta.regularMarketMarketCap || undefined;
      const peRatio = meta.trailingPE || meta.forwardPE || undefined;
      const dividendYield = meta.dividendYield ? meta.dividendYield * 100 : undefined; // Convert to percentage
      const high52Week = meta.fiftyTwoWeekHigh || meta.regularMarketDayHigh || undefined;
      const low52Week = meta.fiftyTwoWeekLow || meta.regularMarketDayLow || undefined;
      const beta = meta.beta || undefined;
      
      if (quote.length > 0 && quote[0].close) {
        const closes = quote[0].close.filter((v: number) => v !== null);
        const volumes = quote[0].volume.filter((v: number) => v !== null);
        
        if (closes.length > 0) {
          const currentPrice = closes[closes.length - 1] || meta.regularMarketPrice || 0;
          const previousClose = closes.length > 1 ? closes[closes.length - 2] : meta.previousClose || currentPrice;
          const change = currentPrice - previousClose;
          const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;
          const volume = volumes.length > 0 ? volumes[volumes.length - 1] : meta.regularMarketVolume || 0;
          
          return {
            currentPrice,
            previousClose,
            change,
            changePercent,
            volume,
            marketCap,
            peRatio,
            dividendYield,
            high52Week,
            low52Week,
            beta,
          };
        }
      }
      
      // Fallback to meta data if quote data is not available
      if (meta.regularMarketPrice) {
        const currentPrice = meta.regularMarketPrice;
        const previousClose = meta.previousClose || currentPrice;
        const change = meta.regularMarketPrice - previousClose;
        const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;
        
        return {
          currentPrice,
          previousClose,
          change,
          changePercent,
          volume: meta.regularMarketVolume || 0,
          marketCap,
          peRatio,
          dividendYield,
          high52Week,
          low52Week,
          beta,
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error(`Error fetching quote data for ${upperSymbol}:`, error);
    throw error;
  }
}

/**
 * Get stock data with price information and extended metrics (1 API call)
 * Use this when you already have the name from search results
 */
export async function getStockPriceData(symbol: string, name?: string): Promise<Stock | null> {
  const upperSymbol = symbol.toUpperCase();

  try {
    const quoteData = await getQuoteData(upperSymbol);

    if (!quoteData || quoteData.currentPrice === 0) {
      return null;
    }

    return {
      symbol: upperSymbol,
      name: name || upperSymbol,
      currentPrice: quoteData.currentPrice,
      previousClose: quoteData.previousClose,
      change: quoteData.change,
      changePercent: quoteData.changePercent,
      volume: quoteData.volume,
      marketCap: quoteData.marketCap,
      peRatio: quoteData.peRatio,
      dividendYield: quoteData.dividendYield,
      high52Week: quoteData.high52Week,
      low52Week: quoteData.low52Week,
    };
  } catch (error) {
    console.error(`Error fetching stock price data for ${upperSymbol}:`, error);
    throw error;
  }
}

/**
 * Get full stock data (1 API call - same as getStockPriceData for Yahoo Finance)
 */
export async function getStockData(symbol: string): Promise<Stock | null> {
  return getStockPriceData(symbol);
}

/**
 * Get multiple stocks - processes with minimal delays
 */
export async function getMultipleStocks(symbols: string[]): Promise<Stock[]> {
  const results: Stock[] = [];
  
  // Process in parallel batches to speed up
  const batchSize = 5;
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    const stocks = await Promise.all(
      batch.map(symbol => getStockData(symbol).catch(() => null))
    );
    results.push(...stocks.filter((stock): stock is Stock => stock !== null));
    
    // Small delay between batches to avoid overwhelming the API
    if (i + batchSize < symbols.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  return results;
}

/**
 * Get historical data (daily or intraday)
 */
export async function getHistoricalData(
  symbol: string,
  days: number = 30,
  range?: string,
  intraday: boolean = false
): Promise<HistoricalData[]> {
  const upperSymbol = symbol.toUpperCase();

  try {
    const interval = intraday ? '5m' : undefined;
    const cacheKey = `historical-${upperSymbol}-${range || days}${intraday ? '-intraday' : ''}`;
    const endpoint = `/historical?symbol=${encodeURIComponent(upperSymbol)}&days=${days}${range ? `&range=${range}` : ''}${interval ? `&interval=${interval}` : ''}`;
    
    const data = await cachedFetch(endpoint, cacheKey, intraday ? CACHE_DURATION : CACHE_DURATION * 5); // Shorter cache for intraday
    
    if (data.chart && data.chart.result && data.chart.result.length > 0) {
      const result = data.chart.result[0];
      const timestamps = result.timestamp || [];
      const indicators = result.indicators || {};
      const quote = indicators.quote || [];
      
      if (quote.length > 0 && quote[0].close) {
        const closes = quote[0].close;
        const volumes = quote[0].volume || [];
        
        const historicalData: HistoricalData[] = [];
        
        if (intraday) {
          // For intraday, include timestamp for time display
          // Filter to only today's data (market hours: 9:30 AM - 4:00 PM ET)
          // Yahoo Finance timestamps are in UTC, but we need to convert to ET (UTC-5 or UTC-4 depending on DST)
          const today = new Date();
          const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
          
          for (let i = 0; i < timestamps.length; i++) {
            if (closes[i] !== null && closes[i] !== undefined) {
              const date = new Date(timestamps[i] * 1000);
              
              // Convert UTC to Eastern Time
              // ET is UTC-5 (EST) or UTC-4 (EDT)
              // Use toLocaleString with timeZone to get ET time
              const etDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }));
              const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
              
              // Calculate the offset in hours
              const offsetHours = (etDate.getTime() - utcDate.getTime()) / (1000 * 60 * 60);
              
              // Apply offset to get ET time
              const etTime = new Date(date.getTime() - (offsetHours * 60 * 60 * 1000));
              
              // Alternative: Use Intl.DateTimeFormat to get ET time directly
              const etFormatter = new Intl.DateTimeFormat('en-US', {
                timeZone: 'America/New_York',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
              });
              
              const parts = etFormatter.formatToParts(date);
              const year = parts.find(p => p.type === 'year')?.value;
              const month = parts.find(p => p.type === 'month')?.value;
              const day = parts.find(p => p.type === 'day')?.value;
              const hour = parts.find(p => p.type === 'hour')?.value;
              const minute = parts.find(p => p.type === 'minute')?.value;
              
              const dateStr = `${year}-${month}-${day}`;
              
              // Only include today's data
              if (dateStr === todayStr) {
                // Format as YYYY-MM-DD HH:MM in ET timezone
                const dateTimeStr = `${dateStr} ${hour}:${minute}`;
                
                historicalData.push({
                  date: dateTimeStr, // Include time for intraday in ET
                  price: closes[i],
                  volume: volumes[i] || 0,
                });
              }
            }
          }
        } else {
          // For daily data, use date only
          const maxPoints = range === 'all' || range === '5y' || range === 'max' ? timestamps.length : Math.min(timestamps.length, days);
          
          for (let i = 0; i < maxPoints; i++) {
            if (closes[i] !== null && closes[i] !== undefined) {
              // Convert timestamp to date string (YYYY-MM-DD)
              // Yahoo Finance timestamps are in UTC and represent the trading day
              // Use UTC methods to preserve the trading day regardless of local timezone
              const date = new Date(timestamps[i] * 1000);
              const year = date.getUTCFullYear();
              const month = String(date.getUTCMonth() + 1).padStart(2, '0');
              const day = String(date.getUTCDate()).padStart(2, '0');
              const dateStr = `${year}-${month}-${day}`;
              
              historicalData.push({
                date: dateStr,
                price: closes[i],
                volume: volumes[i] || 0,
              });
            }
          }
        }
        
        return historicalData.reverse(); // Most recent first
      }
    }
    
    return [];
  } catch (error) {
    console.error(`Error fetching historical data for ${upperSymbol}:`, error);
    throw error;
  }
}

// Re-export calculateHoldings from portfolioCalculator for backward compatibility
export { calculateHoldings } from './portfolioCalculator';
