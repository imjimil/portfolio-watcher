'use client';

import { useMemo } from 'react';
import { Holding } from '@/types';
import { formatPercent, cn } from '@/lib/utils';
import { AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';

interface PortfolioHealthDashboardProps {
  holdings: Holding[];
  totalValue: number;
}

export default function PortfolioHealthDashboard({ holdings, totalValue }: PortfolioHealthDashboardProps) {
  const healthMetrics = useMemo(() => {
    if (holdings.length === 0) {
      return {
        diversificationScore: 0,
        concentrationWarnings: [] as string[],
        topHoldings: [] as Holding[],
        holdingsCount: 0,
      };
    }

    // Calculate diversification score (0-100)
    // Based on: number of holdings, concentration, and distribution
    const numHoldings = holdings.length;
    const maxAllocation = Math.max(...holdings.map(h => h.allocation));
    const top3Allocation = holdings
      .sort((a, b) => b.allocation - a.allocation)
      .slice(0, 3)
      .reduce((sum, h) => sum + h.allocation, 0);

    // Diversification score calculation
    let score = 0;
    // More holdings = better (up to 20 holdings = 40 points)
    score += Math.min(40, (numHoldings / 20) * 40);
    // Lower max allocation = better (max 30 points)
    score += Math.max(0, 30 - (maxAllocation * 0.3));
    // Lower top 3 concentration = better (max 30 points)
    score += Math.max(0, 30 - (top3Allocation * 0.3));

    // Concentration warnings
    const warnings: string[] = [];
    if (maxAllocation > 20) {
      const topHolding = holdings.find(h => h.allocation === maxAllocation);
      warnings.push(`${topHolding?.symbol} represents ${formatPercent(maxAllocation, 1)} of portfolio (recommended: <20%)`);
    }
    if (top3Allocation > 50) {
      warnings.push(`Top 3 holdings represent ${formatPercent(top3Allocation, 1)} of portfolio (recommended: <50%)`);
    }
    if (numHoldings < 5) {
      warnings.push(`Portfolio has only ${numHoldings} holdings (recommended: 10+ for better diversification)`);
    }

    const topHoldings = holdings
      .sort((a, b) => b.allocation - a.allocation)
      .slice(0, 5);

    return {
      diversificationScore: Math.round(score),
      concentrationWarnings: warnings,
      topHoldings,
      holdingsCount: numHoldings,
    };
  }, [holdings]);

  if (holdings.length === 0) return null;

  const { diversificationScore, concentrationWarnings, topHoldings, holdingsCount } = healthMetrics;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-100 dark:bg-green-900/30';
    if (score >= 60) return 'bg-yellow-100 dark:bg-yellow-900/30';
    return 'bg-red-100 dark:bg-red-900/30';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6 mb-4">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Portfolio Health</h2>

      {/* Diversification Score */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Diversification Score</span>
          <span className={cn('text-2xl font-bold', getScoreColor(diversificationScore))}>
            {diversificationScore}/100
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
          <div
            className={cn('h-3 rounded-full transition-all', getScoreBg(diversificationScore))}
            style={{ width: `${Math.min(100, diversificationScore)}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          {diversificationScore >= 80 ? 'Excellent diversification' :
           diversificationScore >= 60 ? 'Good diversification' :
           'Consider diversifying further'}
        </p>
      </div>

      {/* Concentration Warnings */}
      {concentrationWarnings.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Concentration Warnings</span>
          </div>
          <div className="space-y-2">
            {concentrationWarnings.map((warning, idx) => (
              <div key={idx} className="text-xs text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded">
                {warning}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Holdings */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Top Holdings</span>
        </div>
        <div className="space-y-2">
          {topHoldings.map((holding, idx) => (
            <div key={holding.symbol} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-500 dark:text-gray-400 w-4">{idx + 1}.</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{holding.symbol}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full"
                    style={{ width: `${Math.min(100, holding.allocation)}%` }}
                  />
                </div>
                <span className="text-gray-600 dark:text-gray-400 w-12 text-right">
                  {formatPercent(holding.allocation, 1)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Total Holdings</div>
          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{holdingsCount}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Portfolio Value</div>
          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {formatPercent((totalValue / (totalValue || 1)) * 100, 0)}
          </div>
        </div>
      </div>
    </div>
  );
}

