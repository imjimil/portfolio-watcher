'use client';

import { Transaction, Stock } from '@/types';
import { formatCurrency, formatDateString } from '@/lib/utils';
import { Calendar, DollarSign, Edit2, CheckSquare, Square } from 'lucide-react';

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
      <div className="rounded-lg border bg-white dark:bg-gray-800 p-8 text-center">
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

  const allSelected = showSelectAll && transactions.length > 0 && 
    transactions.every(t => selectedTransactions.has(t.id));

  return (
    <div className="rounded-lg border bg-white dark:bg-gray-800 overflow-hidden">
      <div className="overflow-x-auto -mx-3 sm:mx-0">
        <div className="inline-block min-w-full align-middle px-3 sm:px-0">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                {onToggleSelect && (
                  <th className="px-3 sm:px-6 py-3 text-left">
                    {showSelectAll && (
                      <button
                        onClick={onToggleSelectAll}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        {allSelected ? (
                          <CheckSquare className="h-5 w-5" />
                        ) : (
                          <Square className="h-5 w-5" />
                        )}
                      </button>
                    )}
                  </th>
                )}
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Symbol
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Qty
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Total
                </th>
                {stockData && Object.keys(stockData).length > 0 && (
                  <>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Current Value
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Gain/Loss
                    </th>
                  </>
                )}
                {(onDelete || onEdit) && (
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {transactions.map((transaction) => {
                const gainLoss = calculateGainLoss(transaction);
                const isSelected = selectedTransactions.has(transaction.id);

                return (
                  <tr
                    key={transaction.id}
                    className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                      isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                  >
                    {onToggleSelect && (
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                        <button
                          onClick={() => onToggleSelect(transaction.id)}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                          {isSelected ? (
                            <CheckSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          ) : (
                            <Square className="h-5 w-5" />
                          )}
                        </button>
                      </td>
                    )}
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 dark:text-gray-100">
                      <div className="flex items-center gap-1 sm:gap-2">
                        <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{formatDateString(transaction.date)}</span>
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                      <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100">
                        {transaction.symbol}
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                      <span
                        className={`px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-medium rounded ${
                          transaction.type === 'buy'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : transaction.type === 'sell'
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                            : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                        }`}
                      >
                        {transaction.type.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 dark:text-gray-100">
                      {transaction.quantity.toFixed(2)}
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 dark:text-gray-100">
                      {formatCurrency(transaction.price)}
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 sm:gap-2">
                        <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
                        <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100">
                          {formatCurrency(transaction.quantity * transaction.price)}
                        </span>
                      </div>
                      {transaction.fees && transaction.fees > 0 && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          Fees: {formatCurrency(transaction.fees)}
                        </div>
                      )}
                    </td>
                    {stockData && Object.keys(stockData).length > 0 && (
                      <>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 dark:text-gray-100">
                          {gainLoss ? (
                            <>
                              <div>{formatCurrency(gainLoss.currentValue)}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                @ {formatCurrency(gainLoss.currentPrice)}
                              </div>
                            </>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                          {gainLoss ? (
                            <div>
                              <div className={`text-xs sm:text-sm font-medium ${
                                gainLoss.gainLoss >= 0
                                  ? 'text-green-600 dark:text-green-400'
                                  : 'text-red-600 dark:text-red-400'
                              }`}>
                                {gainLoss.gainLoss >= 0 ? '+' : ''}{formatCurrency(gainLoss.gainLoss)}
                              </div>
                              <div className={`text-xs ${
                                gainLoss.gainLossPercent >= 0
                                  ? 'text-green-600 dark:text-green-400'
                                  : 'text-red-600 dark:text-red-400'
                              }`}>
                                {gainLoss.gainLossPercent >= 0 ? '+' : ''}{gainLoss.gainLossPercent.toFixed(2)}%
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </>
                    )}
                    {(onDelete || onEdit) && (
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm">
                        <div className="flex items-center gap-2 sm:gap-3">
                          {onEdit && (
                            <button
                              onClick={() => onEdit(transaction)}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1"
                              title="Edit transaction"
                            >
                              <Edit2 className="h-3 w-3 sm:h-4 sm:w-4" />
                              <span className="hidden sm:inline">Edit</span>
                            </button>
                          )}
                          {onDelete && (
                            <button
                              onClick={() => onDelete(transaction.id)}
                              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                              title="Delete transaction"
                            >
                              Delete
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
    </div>
  );
}
