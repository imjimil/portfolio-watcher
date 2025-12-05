import { Transaction, HistoricalData } from '@/types';
import { calculatePortfolioValueAtDate, calculateCostBasisAtDate } from './portfolioCalculator';
import { getHistoricalData } from './stockService';
import { parseLocalDate } from './utils';

/**
 * Calculate portfolio value over time based on actual transactions and historical prices
 * This properly accounts for when you bought/sold stocks
 * 
 * For each date, we calculate:
 * 1. What holdings existed at that date (only transactions up to that date)
 * 2. What the cost basis was at that date
 * 3. What the portfolio value was at that date (using historical prices)
 */
export async function calculateHistoricalPortfolioValue(
  transactions: Transaction[],
  period: '1d' | '5d' | '1m' | '6m' | 'ytd' | 'all'
): Promise<HistoricalData[]> {
  if (transactions.length === 0) {
    return [];
  }

  // Get all unique symbols from transactions
  const symbols = Array.from(new Set(transactions.map(t => t.symbol).filter(s => s)));
  
  if (symbols.length === 0) {
    return [];
  }

  // Determine the date range based on period
  let days = 30;
  let range = '1mo';
  let targetStartDate: Date | null = null;
  const today = new Date();
  
  switch (period) {
    case '1d':
      days = 1;
      range = '1d';
      // For 1d, we want yesterday's close to today
      targetStartDate = new Date(today);
      targetStartDate.setDate(targetStartDate.getDate() - 1);
      break;
    case '5d':
      days = 5;
      range = '5d';
      targetStartDate = new Date(today);
      targetStartDate.setDate(targetStartDate.getDate() - 5);
      break;
    case '1m':
      days = 30;
      range = '1mo';
      targetStartDate = new Date(today);
      targetStartDate.setMonth(targetStartDate.getMonth() - 1);
      break;
    case '6m':
      days = 180;
      range = '6mo';
      targetStartDate = new Date(today);
      targetStartDate.setMonth(targetStartDate.getMonth() - 6);
      break;
    case 'ytd':
      targetStartDate = new Date(today.getFullYear(), 0, 1);
      days = Math.ceil((today.getTime() - targetStartDate.getTime()) / (1000 * 60 * 60 * 24));
      range = 'ytd';
      break;
    case 'all':
      // Find the earliest transaction date
      const earliestTransaction = transactions
        .filter(t => t.type !== 'dividend')
        .sort((a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime())[0];
      
      if (earliestTransaction) {
        targetStartDate = parseLocalDate(earliestTransaction.date);
        const daysSinceFirst = Math.ceil((today.getTime() - targetStartDate.getTime()) / (1000 * 60 * 60 * 24));
        // For "all", use maximum available range (5y is typically the max Yahoo Finance provides)
        // Use actual days to ensure we get enough data points
        days = Math.min(daysSinceFirst, 365 * 10); // Cap at 10 years for safety, but request max range
        range = '5y'; // Always use max range for "all" period
      } else {
        return [];
      }
      break;
  }

  if (!targetStartDate) {
    return [];
  }

  let isIntraday = period === '1d';
  
  // Fetch historical data for all symbols in parallel
  // For "all" period, ensure we request maximum available data
  let historicalDataPromises = symbols.map(symbol => 
    getHistoricalData(symbol, days, range, isIntraday).catch((error) => {
      console.error(`Error fetching historical data for ${symbol}:`, error);
      return [];
    })
  );
  
  let allHistoricalData = await Promise.all(historicalDataPromises);
  
  // Check if we got any data at all
  let hasAnyData = allHistoricalData.some(data => data.length > 0);
  
  // For 1D, if no intraday data (market closed), fall back to 2-day daily data
  if (!hasAnyData && period === '1d') {
    console.log('No intraday data available, falling back to daily data');
    isIntraday = false;
    days = 2;
    range = '2d';
    
    historicalDataPromises = symbols.map(symbol => 
      getHistoricalData(symbol, days, range, false).catch((error) => {
        console.error(`Error fetching fallback data for ${symbol}:`, error);
        return [];
      })
    );
    
    allHistoricalData = await Promise.all(historicalDataPromises);
    hasAnyData = allHistoricalData.some(data => data.length > 0);
  }
  
  if (!hasAnyData) {
    console.warn('No historical data received for any symbols');
    return [];
  }
  
  // Create a map: date -> symbol -> price
  const pricesByDate = new Map<string, Map<string, number>>();
  
  for (let i = 0; i < symbols.length; i++) {
    const symbol = symbols[i];
    const histData = allHistoricalData[i];
    
    for (const dataPoint of histData) {
      const dateKey = dataPoint.date; // For intraday, includes time; for daily, just date
      
      if (!pricesByDate.has(dateKey)) {
        pricesByDate.set(dateKey, new Map());
      }
      pricesByDate.get(dateKey)!.set(symbol, dataPoint.price);
    }
  }
  
  // Get all unique dates/times, sorted chronologically
  const allDates = Array.from(pricesByDate.keys()).sort((a, b) => {
    // Handle both date-only and date-time strings
    if (a.includes(' ') && b.includes(' ')) {
      const [aDate, aTime] = a.split(' ');
      const [bDate, bTime] = b.split(' ');
      if (aDate === bDate) {
        return aTime.localeCompare(bTime);
      }
      return aDate.localeCompare(bDate);
    }
    return a.localeCompare(b);
  });
  
  if (allDates.length === 0) {
    return [];
  }
  
  // For 1d period, add yesterday's close as first data point
  let yesterdayClosePrices: Record<string, number> = {};
  if (isIntraday) {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    
    // Fetch yesterday's closing prices
    const yesterdayDataPromises = symbols.map(async (symbol) => {
      try {
        const histData = await getHistoricalData(symbol, 2, '2d', false);
        const yesterdayData = histData.find(d => d.date === yesterdayStr);
        return { symbol, price: yesterdayData?.price || null };
      } catch {
        return { symbol, price: null };
      }
    });
    
    const yesterdayResults = await Promise.all(yesterdayDataPromises);
    yesterdayResults.forEach(({ symbol, price }) => {
      if (price !== null) {
        yesterdayClosePrices[symbol] = price;
      }
    });
  }
  
  // Calculate portfolio value for each date
  const portfolioHistory: HistoricalData[] = [];
  
  for (const dateTimeStr of allDates) {
    // Extract date part (for daily data, dateTimeStr is just the date)
    const dateStr = dateTimeStr.includes(' ') ? dateTimeStr.split(' ')[0] : dateTimeStr;
    const targetDate = parseLocalDate(dateStr);
    
    // Get prices for this date
    const pricesAtDate = Object.fromEntries(pricesByDate.get(dateTimeStr) || []);
    
    // Only include transactions that occurred on or before this date
    const transactionsUpToDate = transactions.filter(t => {
      if (t.type === 'dividend') return false;
      const tDate = parseLocalDate(t.date);
      return tDate <= targetDate;
    });
    
    // Skip if no transactions up to this date
    if (transactionsUpToDate.length === 0) {
      continue;
    }
    
    // Calculate portfolio value and cost basis at this date
    const portfolioValue = calculatePortfolioValueAtDate(transactionsUpToDate, targetDate, pricesAtDate);
    const costBasis = calculateCostBasisAtDate(transactionsUpToDate, targetDate);
    
    // Only add if we have valid data
    // For "all" period, be more lenient - allow portfolio value even if some symbols don't have prices
    if (portfolioValue >= 0 && costBasis > 0) {
      portfolioHistory.push({
        date: dateTimeStr,
        price: portfolioValue,
        volume: costBasis, // Store cost basis in volume field
      });
    }
  }
  
  // For 1d period, add yesterday's close as first data point
  if (isIntraday && Object.keys(yesterdayClosePrices).length > 0) {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    const yesterdayDate = parseLocalDate(yesterdayStr);
    
    // Only include transactions up to yesterday
    const transactionsUpToYesterday = transactions.filter(t => {
      if (t.type === 'dividend') return false;
      const tDate = parseLocalDate(t.date);
      return tDate <= yesterdayDate;
    });
    
    if (transactionsUpToYesterday.length > 0) {
      const yesterdayPortfolioValue = calculatePortfolioValueAtDate(
        transactionsUpToYesterday,
        yesterdayDate,
        yesterdayClosePrices
      );
      const yesterdayCostBasis = calculateCostBasisAtDate(transactionsUpToYesterday, yesterdayDate);
      
      if (yesterdayPortfolioValue > 0 && yesterdayCostBasis > 0) {
        // Insert at the beginning
        portfolioHistory.unshift({
          date: `${yesterdayStr} 16:00`, // Market close time
          price: yesterdayPortfolioValue,
          volume: yesterdayCostBasis,
        });
      }
    }
  }
  
  // Ensure data is sorted chronologically
  portfolioHistory.sort((a, b) => {
    if (a.date.includes(' ') && b.date.includes(' ')) {
      const [aDate, aTime] = a.date.split(' ');
      const [bDate, bTime] = b.date.split(' ');
      if (aDate === bDate) {
        return aTime.localeCompare(bTime);
      }
      return aDate.localeCompare(bDate);
    }
    return parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime();
  });
  
  // If the first data point is after the target start date (and not intraday),
  // add a data point for the target start date using the first available prices
  if (!isIntraday && portfolioHistory.length > 0 && targetStartDate) {
    const firstDataPoint = portfolioHistory[0];
    const firstDateStr = firstDataPoint.date.includes(' ') 
      ? firstDataPoint.date.split(' ')[0] 
      : firstDataPoint.date;
    const firstDate = parseLocalDate(firstDateStr);
    
    if (firstDate > targetStartDate) {
      // Use prices from the first available trading day
      const firstAvailablePrices = Object.fromEntries(pricesByDate.get(firstDataPoint.date) || []);
      
      // Only include transactions up to target start date
      const transactionsUpToStart = transactions.filter(t => {
        if (t.type === 'dividend') return false;
        const tDate = parseLocalDate(t.date);
        return tDate <= targetStartDate;
      });
      
      if (transactionsUpToStart.length > 0) {
        const portfolioValueAtStart = calculatePortfolioValueAtDate(
          transactionsUpToStart,
          targetStartDate,
          firstAvailablePrices
        );
        const costBasisAtStart = calculateCostBasisAtDate(transactionsUpToStart, targetStartDate);
        
        if (portfolioValueAtStart >= 0 && costBasisAtStart > 0) {
          const targetStartDateStr = `${targetStartDate.getFullYear()}-${String(targetStartDate.getMonth() + 1).padStart(2, '0')}-${String(targetStartDate.getDate()).padStart(2, '0')}`;
          portfolioHistory.unshift({
            date: targetStartDateStr,
            price: portfolioValueAtStart,
            volume: costBasisAtStart,
          });
        }
      }
    }
  }
  
  // If we still have no data, try to add at least one data point using current/latest prices
  if (portfolioHistory.length === 0 && transactions.length > 0 && allDates.length > 0) {
    // Use the most recent date we have prices for
    const mostRecentDate = allDates[allDates.length - 1];
    const dateStr = mostRecentDate.includes(' ') ? mostRecentDate.split(' ')[0] : mostRecentDate;
    const targetDate = parseLocalDate(dateStr);
    const pricesAtDate = Object.fromEntries(pricesByDate.get(mostRecentDate) || []);
    
    const transactionsUpToDate = transactions.filter(t => {
      if (t.type === 'dividend') return false;
      const tDate = parseLocalDate(t.date);
      return tDate <= targetDate;
    });
    
    if (transactionsUpToDate.length > 0) {
      const portfolioValue = calculatePortfolioValueAtDate(transactionsUpToDate, targetDate, pricesAtDate);
      const costBasis = calculateCostBasisAtDate(transactionsUpToDate, targetDate);
      
      if (portfolioValue >= 0 && costBasis > 0) {
        portfolioHistory.push({
          date: mostRecentDate,
          price: portfolioValue,
          volume: costBasis,
        });
      }
    }
  }
  
  return portfolioHistory;
}
