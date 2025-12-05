'use client';

import { useMemo, useState } from 'react';
import { Holding } from '@/types';
import { formatPercent, cn } from '@/lib/utils';
import { AlertTriangle, ChevronDown, Shield, PieChart } from 'lucide-react';

interface PortfolioHealthDashboardProps {
  holdings: Holding[];
  totalValue: number;
}

export default function PortfolioHealthDashboard({ holdings, totalValue }: PortfolioHealthDashboardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const healthMetrics = useMemo(() => {
    if (holdings.length === 0) {
      return {
        diversificationScore: 0,
        concentrationWarnings: [] as string[],
        topHoldings: [] as Holding[],
        holdingsCount: 0,
      };
    }

    const numHoldings = holdings.length;
    const maxAllocation = Math.max(...holdings.map(h => h.allocation));
    const top3Allocation = holdings
      .sort((a, b) => b.allocation - a.allocation)
      .slice(0, 3)
      .reduce((sum, h) => sum + h.allocation, 0);

    let score = 0;
    score += Math.min(40, (numHoldings / 20) * 40);
    score += Math.max(0, 30 - (maxAllocation * 0.3));
    score += Math.max(0, 30 - (top3Allocation * 0.3));

    const warnings: string[] = [];
    if (maxAllocation > 20) {
      const topHolding = holdings.find(h => h.allocation === maxAllocation);
      warnings.push(`${topHolding?.symbol} is ${formatPercent(maxAllocation, 0)} of portfolio`);
    }
    if (top3Allocation > 50) {
      warnings.push(`Top 3 represent ${formatPercent(top3Allocation, 0)} of portfolio`);
    }
    if (numHoldings < 5) {
      warnings.push(`Only ${numHoldings} holdings - consider diversifying`);
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
    if (score >= 80) return 'text-emerald-600 dark:text-emerald-400';
    if (score >= 60) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-500 dark:text-red-400';
  };

  const getScoreGradient = (score: number) => {
    if (score >= 80) return 'from-emerald-500 to-emerald-400';
    if (score >= 60) return 'from-amber-500 to-amber-400';
    return 'from-red-500 to-red-400';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    return 'Needs Work';
  };

  return (
    <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700/50 p-4 sm:p-5 mb-4">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/20">
            <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Portfolio Health
          </p>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="sm:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <ChevronDown className={cn(
            'h-4 w-4 text-gray-500 transition-transform',
            isExpanded && 'rotate-180'
          )} />
        </button>
      </div>

      {/* Score Display */}
      <div className="flex items-center gap-4 mb-4">
        <div className="relative w-16 h-16 flex-shrink-0">
          <svg className="w-16 h-16 transform -rotate-90">
            <circle
              cx="32"
              cy="32"
              r="28"
              stroke="currentColor"
              strokeWidth="6"
              fill="none"
              className="text-gray-200 dark:text-gray-700"
            />
            <circle
              cx="32"
              cy="32"
              r="28"
              stroke="url(#scoreGradient)"
              strokeWidth="6"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${(diversificationScore / 100) * 175.9} 175.9`}
            />
            <defs>
              <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" className={cn(
                  diversificationScore >= 80 ? 'stop-emerald-500' : 
                  diversificationScore >= 60 ? 'stop-amber-500' : 'stop-red-500'
                )} stopColor={diversificationScore >= 80 ? '#10b981' : diversificationScore >= 60 ? '#f59e0b' : '#ef4444'} />
                <stop offset="100%" className={cn(
                  diversificationScore >= 80 ? 'stop-emerald-400' : 
                  diversificationScore >= 60 ? 'stop-amber-400' : 'stop-red-400'
                )} stopColor={diversificationScore >= 80 ? '#34d399' : diversificationScore >= 60 ? '#fbbf24' : '#f87171'} />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={cn('text-lg font-bold tabular-nums', getScoreColor(diversificationScore))}>
              {diversificationScore}
            </span>
          </div>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={cn('text-sm font-semibold', getScoreColor(diversificationScore))}>
              {getScoreLabel(diversificationScore)}
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {holdingsCount} holdings • Diversification score out of 100
          </p>
        </div>
      </div>

      {/* Warnings */}
      {concentrationWarnings.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {concentrationWarnings.map((warning, idx) => (
            <div 
              key={idx} 
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg"
            >
              <AlertTriangle className="h-3 w-3 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <span className="text-[11px] font-medium text-amber-700 dark:text-amber-300">{warning}</span>
            </div>
          ))}
        </div>
      )}

      {/* Top Holdings - Desktop always visible, mobile expandable */}
      <div className={cn(
        'sm:block',
        isExpanded ? 'block' : 'hidden'
      )}>
        <div className="flex items-center gap-2 mb-3">
          <PieChart className="h-3.5 w-3.5 text-gray-400" />
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Top Allocations
          </span>
        </div>
        <div className="space-y-2">
          {topHoldings.map((holding, idx) => (
            <div key={holding.symbol} className="flex items-center gap-3">
              <span className="w-4 text-xs font-medium text-gray-400 tabular-nums">{idx + 1}</span>
              <div className="w-12 text-xs font-semibold text-gray-900 dark:text-white">{holding.symbol}</div>
              <div className="flex-1">
                <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full bg-gradient-to-r',
                      idx === 0 ? 'from-blue-500 to-blue-400' :
                      idx === 1 ? 'from-indigo-500 to-indigo-400' :
                      idx === 2 ? 'from-purple-500 to-purple-400' :
                      idx === 3 ? 'from-pink-500 to-pink-400' :
                      'from-gray-400 to-gray-300'
                    )}
                    style={{ width: `${Math.min(100, holding.allocation)}%` }}
                  />
                </div>
              </div>
              <span className="w-12 text-xs font-medium text-gray-600 dark:text-gray-400 text-right tabular-nums">
                {formatPercent(holding.allocation, 1)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
