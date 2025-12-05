'use client';

import { useState, useEffect } from 'react';
import { Portfolio, Holding, Transaction } from '@/types';
import { getHistoricalData } from '@/lib/stockService';
import { calculateHistoricalPortfolioValue } from '@/lib/historicalPortfolio';
import { formatPercent, getColorForValue, cn, parseLocalDate } from '@/lib/utils';

interface PerformanceComparisonProps {
  portfolio: Portfolio | null;
  holdings: Holding[];
}

interface PerformanceData {
  portfolio: number;
  sp500: number;
  nasdaq: number;
}

export default function PerformanceComparison({ portfolio, holdings }: PerformanceComparisonProps) {
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'1M' | '3M' | '6M' | '1Y' | 'YTD' | 'ALL'>('1Y');

  useEffect(() => {
    const loadBenchmarkData = async () => {
      if (!portfolio || holdings.length === 0) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Map period to Yahoo Finance range parameter
        const rangeMap: Record<string, string> = {
          '1M': '1mo',
          '3M': '3mo',
          '6M': '6mo',
          '1Y': '1y',
          'YTD': 'ytd',
          'ALL': 'max',
        };
        const range = rangeMap[period] || '1y';

        // Fetch benchmark data - use appropriate days for the range
        // For YTD, we need enough days to cover from Jan 1 to today
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const ytdDays = Math.ceil((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));

        const daysMap: Record<string, number> = {
          '1M': 35,
          '3M': 95,
          '6M': 185,
          '1Y': 370,
          'YTD': Math.max(ytdDays + 10, 50), // Add buffer, minimum 50 days
          'ALL': 2000, // 5+ years
        };
        const days = daysMap[period] || 370;

        // Fetch benchmark data
        const [sp500Data, nasdaqData] = await Promise.all([
          getHistoricalData('^GSPC', days, range, false),
          getHistoricalData('^IXIC', days, range, false),
        ]);

        // Calculate portfolio historical value
        const portfolioPeriodMap: Record<string, '1d' | '5d' | '1m' | '6m' | 'ytd' | 'all'> = {
          '1M': '1m',
          '3M': '1m', // Will fetch 1m and use appropriate date
          '6M': '6m',
          '1Y': '6m', // For 1Y, we'll need to extend or use 6m as approximation
          'YTD': 'ytd',
          'ALL': 'all',
        };
        const portfolioPeriod = portfolioPeriodMap[period] || '1m';
        const portfolioHistory = await calculateHistoricalPortfolioValue(portfolio.transactions, portfolioPeriod);

        // Calculate portfolio return using change in unrealized gain
        // This properly handles cash flows (new investments during the period)
        // portfolioHistory: price = portfolio value, volume = cost basis at that time
        let portfolioReturn = 0;
        
        if (portfolioHistory.length >= 1) {
          // Get start of period data
          const startValue = portfolioHistory[0].price;
          const startCostBasis = portfolioHistory[0].volume || 0;
          const startDate = portfolioHistory[0].date;
          
          // Get current values
          const endValue = portfolio.totalValue;
          const endCostBasis = portfolio.totalCost;
          const currentUnrealizedGain = endValue - endCostBasis;
          
          // Find first transaction date to check if this is effectively "all time"
          const firstTransaction = portfolio.transactions
            ?.filter((t: Transaction) => t.type !== 'dividend')
            ?.sort((a: Transaction, b: Transaction) => a.date.localeCompare(b.date))[0];
          const firstTransactionDate = firstTransaction?.date || '';
          
          // Check if this is effectively "all time"
          const startDateOnly = startDate.includes(' ') ? startDate.split(' ')[0] : startDate;
          const isAllTime = period === 'ALL' || startDateOnly === firstTransactionDate || startDateOnly <= firstTransactionDate;
          
          if (isAllTime) {
            // ALL TIME: Return is simply current unrealized / cost basis
            if (endCostBasis > 0) {
              portfolioReturn = (currentUnrealizedGain / endCostBasis) * 100;
            }
          } else {
            // PERIOD: Return is change in unrealized gain / start value
            const startUnrealizedGain = startValue - startCostBasis;
            const periodGain = currentUnrealizedGain - startUnrealizedGain;
            if (startValue > 0) {
              portfolioReturn = (periodGain / startValue) * 100;
            }
          }
        } else {
          // Fallback to current gain/loss
          portfolioReturn = portfolio.totalGainLossPercent;
        }

        // Calculate benchmark returns
        // Note: getHistoricalData returns data with newest first (after reverse())
        // So first element is newest (end), last element is oldest (start)
        let sp500Return = 0;
        if (sp500Data.length >= 2) {
          // First element is newest (end), last element is oldest (start)
          const sp500Start = sp500Data[sp500Data.length - 1].price; // Oldest (start)
          const sp500End = sp500Data[0].price; // Newest (end)
          
          if (sp500Start > 0 && sp500Start !== sp500End) {
            sp500Return = ((sp500End - sp500Start) / sp500Start) * 100;
          }
        } else if (sp500Data.length === 1) {
          // Only one data point - can't calculate return
          console.warn('Insufficient S&P 500 data for period calculation');
        }

        let nasdaqReturn = 0;
        if (nasdaqData.length >= 2) {
          // First element is newest (end), last element is oldest (start)
          const nasdaqStart = nasdaqData[nasdaqData.length - 1].price; // Oldest (start)
          const nasdaqEnd = nasdaqData[0].price; // Newest (end)
          
          if (nasdaqStart > 0 && nasdaqStart !== nasdaqEnd) {
            nasdaqReturn = ((nasdaqEnd - nasdaqStart) / nasdaqStart) * 100;
          }
        } else if (nasdaqData.length === 1) {
          // Only one data point - can't calculate return
          console.warn('Insufficient NASDAQ data for period calculation');
        }

        // Validate returns are reasonable (between -100% and 500% to catch errors)
        // Normal market movements shouldn't exceed these bounds
        if (Math.abs(sp500Return) > 500 || Math.abs(nasdaqReturn) > 500) {
          console.error('Invalid benchmark returns calculated:', { 
            sp500Return, 
            nasdaqReturn, 
            sp500DataLength: sp500Data.length, 
            nasdaqDataLength: nasdaqData.length,
            period,
            range
          });
          // Reset to 0 if clearly wrong
          if (Math.abs(sp500Return) > 500) sp500Return = 0;
          if (Math.abs(nasdaqReturn) > 500) nasdaqReturn = 0;
        }

        setPerformanceData({
          portfolio: portfolioReturn,
          sp500: sp500Return,
          nasdaq: nasdaqReturn,
        });
      } catch (error) {
        console.error('Error loading benchmark data:', error);
        // Set fallback data
        setPerformanceData({
          portfolio: portfolio.totalGainLossPercent,
          sp500: 0,
          nasdaq: 0,
        });
      } finally {
        setLoading(false);
      }
    };

    loadBenchmarkData();
  }, [portfolio, holdings, period]);

  if (!portfolio || holdings.length === 0) return null;

  if (loading || !performanceData) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  const { portfolio: portfolioReturn, sp500: sp500Return, nasdaq: nasdaqReturn } = performanceData;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Performance vs Benchmarks</h2>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as any)}
          className="text-sm px-3 py-1 border rounded-lg bg-white dark:bg-gray-700"
        >
          <option value="1M">1 Month</option>
          <option value="3M">3 Months</option>
          <option value="6M">6 Months</option>
          <option value="1Y">1 Year</option>
          <option value="YTD">YTD</option>
          <option value="ALL">All Time</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Portfolio</div>
          <div className={cn('text-lg font-semibold', getColorForValue(portfolioReturn))}>
            {formatPercent(portfolioReturn)}
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">S&P 500</div>
          <div className={cn('text-lg font-semibold', getColorForValue(sp500Return))}>
            {formatPercent(sp500Return)}
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">NASDAQ</div>
          <div className={cn('text-lg font-semibold', getColorForValue(nasdaqReturn))}>
            {formatPercent(nasdaqReturn)}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-blue-600"></div>
            <span>Portfolio</span>
          </div>
          <div className={cn('font-medium', getColorForValue(portfolioReturn))}>
            {formatPercent(portfolioReturn)}
          </div>
        </div>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-green-600"></div>
            <span>S&P 500</span>
          </div>
          <div className={cn('font-medium', getColorForValue(sp500Return))}>
            {formatPercent(sp500Return)}
          </div>
        </div>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-yellow-600"></div>
            <span>NASDAQ</span>
          </div>
          <div className={cn('font-medium', getColorForValue(nasdaqReturn))}>
            {formatPercent(nasdaqReturn)}
          </div>
        </div>
        <div className="pt-2 border-t border-gray-200 dark:border-gray-700 mt-2">
          <div className="flex items-center justify-between text-sm font-medium">
            <span>vs S&P 500</span>
            <span className={cn(getColorForValue(portfolioReturn - sp500Return))}>
              {portfolioReturn - sp500Return >= 0 ? '+' : ''}{formatPercent(portfolioReturn - sp500Return)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm font-medium mt-1">
            <span>vs NASDAQ</span>
            <span className={cn(getColorForValue(portfolioReturn - nasdaqReturn))}>
              {portfolioReturn - nasdaqReturn >= 0 ? '+' : ''}{formatPercent(portfolioReturn - nasdaqReturn)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

