'use client';

import { Holding } from '@/types';
import { formatCurrency, formatPercent, formatNumber, getColorForValue, cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface HoldingsTableProps {
  holdings: Holding[];
  onRowClick?: (holding: Holding) => void;
}

export default function HoldingsTable({ holdings, onRowClick }: HoldingsTableProps) {
  if (holdings.length === 0) {
    return (
      <div className="rounded-lg border bg-white dark:bg-gray-800 p-8 text-center">
        <p className="text-gray-500 dark:text-gray-400">No holdings yet. Add a transaction to get started.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-white dark:bg-gray-800 overflow-hidden">
      <div className="overflow-x-auto -mx-3 sm:mx-0">
        <div className="inline-block min-w-full align-middle px-3 sm:px-0">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Symbol
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Qty
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Avg Cost
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Value
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  G/L
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  %
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {holdings.map((holding) => (
                <tr
                  key={holding.symbol}
                  onClick={() => onRowClick?.(holding)}
                  className={cn(
                    'hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors',
                    onRowClick && 'cursor-pointer'
                  )}
                >
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                    <div>
                      <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100">
                        {holding.symbol}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
                        {holding.name}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 dark:text-gray-100">
                    {formatNumber(holding.quantity, 2)}
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 dark:text-gray-100">
                    {formatCurrency(holding.averageCost)}
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 dark:text-gray-100">
                    {formatCurrency(holding.currentPrice)}
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100">
                    {formatCurrency(holding.currentValue)}
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      {holding.gainLoss >= 0 ? (
                        <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
                      ) : (
                        <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-red-500" />
                      )}
                      <div>
                        <div className={cn('text-xs sm:text-sm font-medium', getColorForValue(holding.gainLoss))}>
                          {formatCurrency(holding.gainLoss)}
                        </div>
                        <div className={cn('text-xs', getColorForValue(holding.gainLossPercent))}>
                          {formatPercent(holding.gainLossPercent)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1 sm:gap-2">
                      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 sm:h-2 min-w-[40px]">
                        <div
                          className="bg-blue-600 dark:bg-blue-400 h-1.5 sm:h-2 rounded-full"
                          style={{ width: `${Math.min(holding.allocation, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 w-8 sm:w-12 text-right">
                        {formatPercent(holding.allocation, 1)}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

