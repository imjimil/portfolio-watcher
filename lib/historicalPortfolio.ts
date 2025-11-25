import { Transaction, HistoricalData } from '@/types';
import { calculatePortfolioValueAtDate, calculateCostBasisAtDate } from './portfolioCalculator';
import { getHistoricalData } from './stockService';
import { parseLocalDate } from './utils';

/**
 * Calculate portfolio value over time based on actual transactions and historical prices
 * This properly accounts for when you bought/sold stocks
 */
export async function calculateHistoricalPortfolioValue(
  transactions: Transaction[],
  period: '1d' | '5d' | '1m' | '6m' | 'ytd' | 'all'
): Promise<HistoricalData[]> {
  if (transactions.length === 0) {
    return [];
  }

  // Get all unique symbols from transactions
  const symbols = Array.from(new Set(transactions.map(t => t.symbol)));
  
  if (symbols.length === 0) {
    return [];
  }

  // Convert period to days and range, and calculate target start date
  let days = 30;
  let range = '1mo';
  let targetStartDate: Date | null = null;
  
  switch (period) {
    case '1d':
      days = 1;
      range = '1d';
      targetStartDate = new Date();
      targetStartDate.setDate(targetStartDate.getDate() - 1);
      break;
    case '5d':
      days = 5;
      range = '5d';
      targetStartDate = new Date();
      targetStartDate.setDate(targetStartDate.getDate() - 5);
      break;
    case '1m':
      days = 30;
      range = '1mo';
      targetStartDate = new Date();
      targetStartDate.setMonth(targetStartDate.getMonth() - 1);
      break;
    case '6m':
      days = 180;
      range = '6mo';
      targetStartDate = new Date();
      targetStartDate.setMonth(targetStartDate.getMonth() - 6);
      break;
    case 'ytd':
      const startOfYear = new Date(new Date().getFullYear(), 0, 1);
      days = Math.ceil((Date.now() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
      range = 'ytd';
      targetStartDate = startOfYear;
      break;
    case 'all':
      days = 365 * 5;
      range = '5y';
      // For 'all', we don't need a specific start date
      break;
  }
  
  // Format target start date as YYYY-MM-DD
  const targetStartDateStr = targetStartDate 
    ? `${targetStartDate.getFullYear()}-${String(targetStartDate.getMonth() + 1).padStart(2, '0')}-${String(targetStartDate.getDate()).padStart(2, '0')}`
    : null;

  // For 1d period, fetch intraday data (today's movement)
  const isIntraday = period === '1d';
  
  // For 1d period, we also need yesterday's closing prices to show the full day's performance
  let yesterdayClosePrices: Record<string, number> = {};
  if (isIntraday) {
    // Fetch yesterday's closing prices for all symbols
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    
    const yesterdayDataPromises = symbols.map(async (symbol) => {
      try {
        // Fetch 2 days of data to get yesterday's close
        const histData = await getHistoricalData(symbol, 2, '2d', false);
        // Find yesterday's data point
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
  
  // Fetch historical data for all symbols in parallel
  const historicalDataPromises = symbols.map(symbol => 
    getHistoricalData(symbol, days, range, isIntraday).catch(() => [])
  );
  
  const allHistoricalData = await Promise.all(historicalDataPromises);
  
  // Create a map of symbol -> historical prices by date/time
  const pricesByDate = new Map<string, Map<string, number>>();
  
  for (let i = 0; i < symbols.length; i++) {
    const symbol = symbols[i];
    const histData = allHistoricalData[i];
    
    for (const dataPoint of histData) {
      if (!pricesByDate.has(dataPoint.date)) {
        pricesByDate.set(dataPoint.date, new Map());
      }
      pricesByDate.get(dataPoint.date)!.set(symbol, dataPoint.price);
    }
  }
  
  // Get all unique dates/times from all historical data
  const allDates = Array.from(pricesByDate.keys()).sort();
  
  if (allDates.length === 0) {
    return [];
  }
  
  // Calculate portfolio value for each date/time
  const portfolioHistory: HistoricalData[] = [];
  
  for (const dateTimeStr of allDates) {
    const pricesAtDate = Object.fromEntries(pricesByDate.get(dateTimeStr) || []);
    
    // For intraday, we only care about today's holdings (all current transactions)
    // For daily, check if transactions occurred before this date
    let hasTransactions = false;
    if (isIntraday) {
      // For intraday, include all current holdings (today's portfolio)
      hasTransactions = transactions.some(t => t.type !== 'dividend');
    } else {
      // For daily, only include transactions up to this date
      const dateStr = dateTimeStr.split(' ')[0]; // Extract date part if it includes time
      hasTransactions = transactions.some(t => {
        const tDate = parseLocalDate(t.date);
        const targetDate = parseLocalDate(dateStr);
        return tDate <= targetDate && t.type !== 'dividend';
      });
    }
    
    if (!hasTransactions) continue;
    
    // Calculate portfolio value and cost basis
    // For intraday, use today's date; for daily, parse the date from the string
    const dateStr = isIntraday ? new Date().toISOString().split('T')[0] : dateTimeStr.split(' ')[0];
    const targetDate = parseLocalDate(dateStr);
    const portfolioValue = calculatePortfolioValueAtDate(transactions, targetDate, pricesAtDate);
    const costBasis = calculateCostBasisAtDate(transactions, targetDate);
    
    if (portfolioValue > 0 && costBasis > 0) {
      portfolioHistory.push({
        date: dateTimeStr, // Keep full datetime string for intraday
        price: portfolioValue,
        volume: costBasis,
      });
    }
  }

  // For 1d period, add yesterday's closing portfolio value as the first data point
  if (isIntraday && Object.keys(yesterdayClosePrices).length > 0) {
    // Calculate portfolio value at yesterday's close
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    const yesterdayDate = parseLocalDate(yesterdayStr);
    
    // Calculate portfolio value and cost basis at yesterday's close
    const yesterdayPortfolioValue = calculatePortfolioValueAtDate(transactions, yesterdayDate, yesterdayClosePrices);
    const yesterdayCostBasis = calculateCostBasisAtDate(transactions, yesterdayDate);
    
    if (yesterdayPortfolioValue > 0 && yesterdayCostBasis > 0) {
      // Add yesterday's close as the first data point (use market close time: 4:00 PM ET)
      portfolioHistory.unshift({
        date: `${yesterdayStr} 16:00`, // Market close time
        price: yesterdayPortfolioValue,
        volume: yesterdayCostBasis,
      });
    }
  }
  
  // Sort by date (oldest first)
  const sortedHistory = portfolioHistory.sort((a, b) => {
    // For intraday, compare date-time strings properly
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

  // If we have a target start date and the first data point is after it (and not intraday),
  // add a data point for the target start date using the first available price
  if (targetStartDateStr && sortedHistory.length > 0 && !isIntraday) {
    const firstDate = parseLocalDate(sortedHistory[0].date);
    const targetDate = parseLocalDate(targetStartDateStr);
    
    // If the first data point is after the target start date, add a point for the target date
    if (firstDate > targetDate) {
      // Use the first available trading day's prices for the target start date
      // This represents the portfolio value as of the target date (even if market was closed)
      const firstAvailableDate = sortedHistory[0].date;
      const pricesAtFirstDate = Object.fromEntries(pricesByDate.get(firstAvailableDate) || []);
      const targetDateObj = parseLocalDate(targetStartDateStr);
      
      // Calculate portfolio value at target date using prices from first available trading day
      // This gives us the portfolio value as of the target date
      const portfolioValueAtTarget = calculatePortfolioValueAtDate(transactions, targetDateObj, pricesAtFirstDate);
      const costBasisAtTarget = calculateCostBasisAtDate(transactions, targetDateObj);
      
      if (portfolioValueAtTarget > 0 && costBasisAtTarget > 0) {
        sortedHistory.unshift({
          date: targetStartDateStr,
          price: portfolioValueAtTarget,
          volume: costBasisAtTarget,
        });
      }
    }
  }

  return sortedHistory;
}

