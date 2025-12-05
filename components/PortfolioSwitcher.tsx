'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, Plus, Check } from 'lucide-react';
import { Portfolio } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface PortfolioSwitcherProps {
  portfolios: Portfolio[];
  activePortfolioId: string | null;
  onSelect: (portfolioId: string) => void;
  onCreateNew: () => void;
}

export default function PortfolioSwitcher({
  portfolios,
  activePortfolioId,
  onSelect,
  onCreateNew,
}: PortfolioSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const activePortfolio = portfolios.find(p => p.id === activePortfolioId);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isOpen && !target.closest('.portfolio-switcher')) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="relative portfolio-switcher">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 -ml-3 rounded-xl transition-colors',
          'hover:bg-gray-100 dark:hover:bg-gray-800',
          isOpen && 'bg-gray-100 dark:bg-gray-800'
        )}
      >
        <span className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate max-w-[200px] sm:max-w-none">
          {activePortfolio?.name || 'My Portfolio'}
        </span>
        <ChevronDown className={cn(
          'h-5 w-5 text-gray-400 transition-transform flex-shrink-0',
          isOpen && 'rotate-180'
        )} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden">
          {/* Create New Portfolio Button */}
          <div className="p-2 border-b border-gray-100 dark:border-gray-700">
            <button
              onClick={() => {
                onCreateNew();
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <Plus className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              </div>
              <span>Create New Portfolio</span>
            </button>
          </div>

          {/* Portfolio List */}
          <div className="max-h-80 overflow-y-auto p-2">
            {portfolios.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No portfolios yet. Create one to get started!
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {portfolios.map((portfolio) => {
                  const isActive = portfolio.id === activePortfolioId;
                  const isPositive = portfolio.totalGainLossPercent >= 0;
                  
                  return (
                    <button
                      key={portfolio.id}
                      onClick={() => {
                        onSelect(portfolio.id);
                        setIsOpen(false);
                      }}
                      className={cn(
                        'w-full text-left px-4 py-3 rounded-xl transition-colors',
                        isActive
                          ? 'bg-blue-50 dark:bg-blue-900/20'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              'font-semibold truncate',
                              isActive
                                ? 'text-blue-700 dark:text-blue-300'
                                : 'text-gray-900 dark:text-white'
                            )}>
                              {portfolio.name}
                            </span>
                            {isActive && (
                              <Check className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-sm font-medium text-gray-900 dark:text-white tabular-nums">
                              {formatCurrency(portfolio.totalValue)}
                            </span>
                            <span className={cn(
                              'text-xs font-semibold tabular-nums',
                              isPositive
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-red-500 dark:text-red-400'
                            )}>
                              {isPositive ? '+' : ''}{portfolio.totalGainLossPercent.toFixed(2)}%
                            </span>
                          </div>
                        </div>
                        <div className="text-right text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ml-4">
                          {portfolio.transactions?.length || 0} trades
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
