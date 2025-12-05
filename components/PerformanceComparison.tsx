'use client';

import { useState, useEffect } from 'react';
import { Portfolio, Holding } from '@/types';
import { getHistoricalData } from '@/lib/stockService';
import { calculateHistoricalPortfolioValue } from '@/lib/historicalPortfolio';
import { formatPercent, cn } from '@/lib/utils';
import { calculatePeriodPerformance } from '@/lib/portfolioPerformance';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

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
        const rangeMap: Record<string, string> = {
          '1M': '1mo',
          '3M': '3mo',
          '6M': '6mo',
          '1Y': '1y',
          'YTD': 'ytd',
          'ALL': 'max',
        };
        const range = rangeMap[period] || '1y';

        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const ytdDays = Math.ceil((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));

        const daysMap: Record<string, number> = {
          '1M': 35,
          '3M': 95,
          '6M': 185,
          '1Y': 370,
          'YTD': Math.max(ytdDays + 10, 50),
          'ALL': 2000,
        };
        const days = daysMap[period] || 370;

        const [sp500Data, nasdaqData] = await Promise.all([
          getHistoricalData('^GSPC', days, range, false),
          getHistoricalData('^IXIC', days, range, false),
        ]);

        const portfolioPeriodMap: Record<string, '1d' | '5d' | '1m' | '6m' | 'ytd' | 'all'> = {
          '1M': '1m',
          '3M': '1m',
          '6M': '6m',
          '1Y': '6m',
          'YTD': 'ytd',
          'ALL': 'all',
        };
        const portfolioPeriod = portfolioPeriodMap[period] || '1m';
        const portfolioHistory = await calculateHistoricalPortfolioValue(portfolio.transactions, portfolioPeriod);

        const performance = calculatePeriodPerformance({
          historicalData: portfolioHistory,
          currentValue: portfolio.totalValue,
          currentCostBasis: portfolio.totalCost,
          transactions: portfolio.transactions || [],
          selectedPeriod: period,
        });
        const portfolioReturn = performance.periodGainPercent;

        let sp500Return = 0;
        if (sp500Data.length >= 2) {
          const sp500Start = sp500Data[sp500Data.length - 1].price;
          const sp500End = sp500Data[0].price;
          if (sp500Start > 0 && sp500Start !== sp500End) {
            sp500Return = ((sp500End - sp500Start) / sp500Start) * 100;
          }
        }

        let nasdaqReturn = 0;
        if (nasdaqData.length >= 2) {
          const nasdaqStart = nasdaqData[nasdaqData.length - 1].price;
          const nasdaqEnd = nasdaqData[0].price;
          if (nasdaqStart > 0 && nasdaqStart !== nasdaqEnd) {
            nasdaqReturn = ((nasdaqEnd - nasdaqStart) / nasdaqStart) * 100;
          }
        }

        if (Math.abs(sp500Return) > 500) sp500Return = 0;
        if (Math.abs(nasdaqReturn) > 500) nasdaqReturn = 0;

        setPerformanceData({
          portfolio: portfolioReturn,
          sp500: sp500Return,
          nasdaq: nasdaqReturn,
        });
      } catch (error) {
        console.error('Error loading benchmark data:', error);
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

  const periods = ['1M', '3M', '6M', '1Y', 'YTD', 'ALL'] as const;

  if (loading || !performanceData) {
    return (
      <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700/50 p-5 mb-4">
        <div className="flex items-center justify-center h-40">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  const { portfolio: portfolioReturn, sp500: sp500Return, nasdaq: nasdaqReturn } = performanceData;
  const vsSP500 = portfolioReturn - sp500Return;
  const vsNasdaq = portfolioReturn - nasdaqReturn;

  const getIcon = (value: number) => {
    if (value > 0.5) return <TrendingUp className="h-4 w-4" />;
    if (value < -0.5) return <TrendingDown className="h-4 w-4" />;
    return <Minus className="h-4 w-4" />;
  };

  const getColor = (value: number) => {
    if (value > 0) return 'text-emerald-600 dark:text-emerald-400';
    if (value < 0) return 'text-red-500 dark:text-red-400';
    return 'text-gray-500 dark:text-gray-400';
  };

  return (
    <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700/50 p-4 sm:p-5 mb-4">
      {/* Header with Period Selector */}
      <div className="flex items-center justify-between mb-5">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Performance Comparison
        </p>
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
          {periods.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                'px-2 py-1 text-[10px] sm:text-xs font-semibold rounded-md transition-all',
                period === p
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Performance Cards */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {/* Portfolio */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-3 text-center">
          <div className="text-[10px] font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1">
            Portfolio
          </div>
          <div className={cn('text-lg sm:text-xl font-bold tabular-nums', getColor(portfolioReturn))}>
            {portfolioReturn >= 0 ? '+' : ''}{formatPercent(portfolioReturn)}
          </div>
        </div>

        {/* S&P 500 */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 text-center">
          <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
            S&P 500
          </div>
          <div className={cn('text-lg sm:text-xl font-bold tabular-nums', getColor(sp500Return))}>
            {sp500Return >= 0 ? '+' : ''}{formatPercent(sp500Return)}
          </div>
        </div>

        {/* NASDAQ */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 text-center">
          <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
            NASDAQ
          </div>
          <div className={cn('text-lg sm:text-xl font-bold tabular-nums', getColor(nasdaqReturn))}>
            {nasdaqReturn >= 0 ? '+' : ''}{formatPercent(nasdaqReturn)}
          </div>
        </div>
      </div>

      {/* Comparison Row */}
      <div className="flex gap-3">
        <div className={cn(
          'flex-1 flex items-center justify-between px-3 py-2.5 rounded-xl',
          vsSP500 >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'
        )}>
          <span className="text-xs font-medium text-gray-600 dark:text-gray-300">vs S&P 500</span>
          <div className={cn('flex items-center gap-1 text-sm font-bold tabular-nums', getColor(vsSP500))}>
            {getIcon(vsSP500)}
            {vsSP500 >= 0 ? '+' : ''}{formatPercent(vsSP500)}
          </div>
        </div>
        <div className={cn(
          'flex-1 flex items-center justify-between px-3 py-2.5 rounded-xl',
          vsNasdaq >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'
        )}>
          <span className="text-xs font-medium text-gray-600 dark:text-gray-300">vs NASDAQ</span>
          <div className={cn('flex items-center gap-1 text-sm font-bold tabular-nums', getColor(vsNasdaq))}>
            {getIcon(vsNasdaq)}
            {vsNasdaq >= 0 ? '+' : ''}{formatPercent(vsNasdaq)}
          </div>
        </div>
      </div>
    </div>
  );
}
