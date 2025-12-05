'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, Wallet, Plus } from 'lucide-react';
import { Portfolio } from '@/types';
import { formatCurrency } from '@/lib/utils';

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
        className="flex items-center gap-1 sm:gap-2 px-0 py-0 bg-transparent border-none hover:opacity-80 transition-opacity text-left"
      >
        <h2 className="text-base sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1 sm:gap-2">
          <span className="truncate max-w-[140px] sm:max-w-none">{activePortfolio?.name || 'My Portfolio'}</span>
          <ChevronDown className={`h-4 w-4 sm:h-5 sm:w-5 text-gray-500 dark:text-gray-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
        </h2>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 sm:w-96 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 max-h-96 overflow-y-auto">
          <div className="p-2">
            <button
              onClick={() => {
                onCreateNew();
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors mb-2"
            >
              <Plus className="h-4 w-4" />
              Create New Portfolio
            </button>
            <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>
            {portfolios.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                No portfolios yet. Create one to get started!
              </div>
            ) : (
              portfolios.map((portfolio) => (
                <button
                  key={portfolio.id}
                  onClick={() => {
                    onSelect(portfolio.id);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-3 rounded-lg transition-colors ${
                    portfolio.id === activePortfolioId
                      ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-medium ${
                      portfolio.id === activePortfolioId
                        ? 'text-blue-700 dark:text-blue-300'
                        : 'text-gray-900 dark:text-white'
                    }`}>
                      {portfolio.name}
                    </span>
                    {portfolio.id === activePortfolioId && (
                      <span className="px-2 py-0.5 text-xs bg-blue-600 text-white rounded">
                        Active
                      </span>
                    )}
                  </div>
                  {portfolio.description && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 truncate">
                      {portfolio.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                    <span>{formatCurrency(portfolio.totalValue)}</span>
                    <span className={portfolio.totalGainLossPercent >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                      {portfolio.totalGainLossPercent >= 0 ? '+' : ''}
                      {portfolio.totalGainLossPercent.toFixed(2)}%
                    </span>
                    <span>{portfolio.transactions?.length || 0} transactions</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

