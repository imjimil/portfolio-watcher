'use client';

import { Transaction, Stock } from '@/types';
import { formatCurrency, formatDateString, cn } from '@/lib/utils';
import { Edit2, Trash2, TrendingUp, TrendingDown } from 'lucide-react';

interface TransactionHistoryProps {
  transactions: Transaction[];
  onDelete?: (id: string) => void;
  onEdit?: (transaction: Transaction) => void;
  stockData?: Record<string, Stock>;
  selectedTransactions?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onToggleSelectAll?: () => void;
  showSelectAll?: boolean;
}

export default function TransactionHistory({ 
  transactions, 
  onDelete, 
  onEdit,
  stockData = {},
  selectedTransactions = new Set(),
  onToggleSelect,
  onToggleSelectAll,
  showSelectAll = false,
}: TransactionHistoryProps) {
  if (transactions.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700/50 p-8 text-center">
        <p className="text-gray-500 dark:text-gray-400">No transactions found.</p>
      </div>
    );
  }

  const calculateGainLoss = (transaction: Transaction) => {
    const currentStock = stockData[transaction.symbol];
    if (!currentStock || transaction.type !== 'buy') {
      return null;
    }

    const currentValue = transaction.quantity * currentStock.currentPrice;
    const costBasis = (transaction.quantity * transaction.price) + (transaction.fees || 0);
    const gainLoss = currentValue - costBasis;
    const gainLossPercent = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;

    return {
      currentValue,
      costBasis,
      gainLoss,
      gainLossPercent,
      currentPrice: currentStock.currentPrice,
    };
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'buy':
        return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400';
      case 'sell':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
      case 'dividend':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400';
    }
  };

  return (
    <>
      {/* Mobile Card View */}
      <div className="md:hidden space-y-2">
        {transactions.map((transaction) => {
          const gainLoss = calculateGainLoss(transaction);
          const total = transaction.quantity * transaction.price;

          return (
            <div
              key={transaction.id}
              className="bg-white dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700/50 p-3"
            >
              {/* Top Row: Symbol, Type Badge, Total */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-bold text-gray-900 dark:text-white">{transaction.symbol}</span>
                  <span className={cn('px-2 py-0.5 text-[10px] font-semibold rounded-full uppercase', getTypeColor(transaction.type))}>
                    {transaction.type}
                  </span>
                </div>
                <span className="font-bold text-gray-900 dark:text-white tabular-nums">
                  {formatCurrency(total)}
                </span>
              </div>

              {/* Middle Row: Date, Qty × Price */}
              <div className="flex items-center justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
                <span>{formatDateString(transaction.date)}</span>
                <span className="tabular-nums">{transaction.quantity} × {formatCurrency(transaction.price)}</span>
              </div>

              {/* Bottom Row: Gain/Loss (if buy) + Actions */}
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-gray-700/50">
                {gainLoss ? (
                  <div className="flex items-center gap-1.5">
                    {gainLoss.gainLoss >= 0 ? (
                      <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                    )}
                    <span className={cn(
                      'text-xs font-semibold tabular-nums',
                      gainLoss.gainLoss >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
                    )}>
                      {gainLoss.gainLoss >= 0 ? '+' : ''}{formatCurrency(gainLoss.gainLoss)} ({gainLoss.gainLossPercent.toFixed(1)}%)
                    </span>
                  </div>
                ) : (
                  <div />
                )}
                <div className="flex items-center gap-1">
                  {onEdit && (
                      <button
                      onClick={() => onEdit(transaction)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => onDelete(transaction.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700/50">
                <th className="px-5 py-4 text-left text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-5 py-4 text-left text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Symbol
                </th>
                <th className="px-5 py-4 text-left text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-5 py-4 text-right text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Qty
                </th>
                <th className="px-5 py-4 text-right text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-5 py-4 text-right text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Total
                </th>
                {stockData && Object.keys(stockData).length > 0 && (
                  <th className="px-5 py-4 text-right text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Gain/Loss
                    </th>
                )}
                {(onDelete || onEdit) && (
                  <th className="px-5 py-4 w-20"></th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
              {transactions.map((transaction) => {
                const gainLoss = calculateGainLoss(transaction);

                return (
                  <tr
                    key={transaction.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                  >
                    <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {formatDateString(transaction.date)}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {transaction.symbol}
                      </span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className={cn('px-2 py-1 text-xs font-semibold rounded-full uppercase', getTypeColor(transaction.type))}>
                        {transaction.type}
                      </span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white tabular-nums">
                      {transaction.quantity.toFixed(2)}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white tabular-nums">
                      {formatCurrency(transaction.price)}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-right">
                      <span className="font-semibold text-gray-900 dark:text-white tabular-nums">
                          {formatCurrency(transaction.quantity * transaction.price)}
                        </span>
                      {transaction.fees && transaction.fees > 0 && (
                        <div className="text-xs text-gray-500">+{formatCurrency(transaction.fees)} fees</div>
                      )}
                    </td>
                    {stockData && Object.keys(stockData).length > 0 && (
                      <td className="px-5 py-4 whitespace-nowrap text-right">
                          {gainLoss ? (
                          <div className="flex items-center justify-end gap-1.5">
                            {gainLoss.gainLoss >= 0 ? (
                              <TrendingUp className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-red-500" />
                            )}
                            <div>
                              <div className={cn(
                                'text-sm font-semibold tabular-nums',
                                gainLoss.gainLoss >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
                              )}>
                                {gainLoss.gainLoss >= 0 ? '+' : ''}{formatCurrency(gainLoss.gainLoss)}
                              </div>
                              <div className={cn(
                                'text-xs tabular-nums',
                                gainLoss.gainLossPercent >= 0 ? 'text-emerald-600/70' : 'text-red-500/70'
                              )}>
                                {gainLoss.gainLossPercent >= 0 ? '+' : ''}{gainLoss.gainLossPercent.toFixed(2)}%
                              </div>
                              </div>
                            </div>
                          ) : (
                          <span className="text-gray-400">—</span>
                          )}
                        </td>
                    )}
                    {(onDelete || onEdit) && (
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {onEdit && (
                            <button
                              onClick={() => onEdit(transaction)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                          )}
                          {onDelete && (
                            <button
                              onClick={() => onDelete(transaction.id)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
