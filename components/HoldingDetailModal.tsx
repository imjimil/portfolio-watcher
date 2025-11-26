'use client';

import { X } from 'lucide-react';
import { Holding, Portfolio } from '@/types';
import { formatCurrency, formatPercent, formatNumber, getColorForValue, cn } from '@/lib/utils';
import { ResponsiveContainer, LineChart, Line, Area, XAxis, YAxis, ReferenceLine, Tooltip } from 'recharts';

interface HoldingDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  holding: Holding;
  portfolio: Portfolio | null | undefined;
}

export default function HoldingDetailModal({ isOpen, onClose, holding, portfolio }: HoldingDetailModalProps) {
  if (!isOpen) return null;

  const transactions = portfolio?.transactions.filter(t => t.symbol === holding.symbol) || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">
              {holding.symbol} - {holding.name}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Detailed Holding Information
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-6">
          {/* Performance Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
              <div className="text-xs text-gray-500 dark:text-gray-400">Current Value</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {formatCurrency(holding.currentValue)}
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
              <div className="text-xs text-gray-500 dark:text-gray-400">Total Cost</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {formatCurrency(holding.totalCost)}
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
              <div className="text-xs text-gray-500 dark:text-gray-400">Gain/Loss</div>
              <div className={cn('text-lg font-semibold', getColorForValue(holding.gainLoss))}>
                {formatCurrency(holding.gainLoss)}
              </div>
              <div className={cn('text-xs', getColorForValue(holding.gainLossPercent))}>
                {formatPercent(holding.gainLossPercent)}
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
              <div className="text-xs text-gray-500 dark:text-gray-400">Allocation</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {formatPercent(holding.allocation, 1)}
              </div>
            </div>
          </div>

          {/* Extended Metrics */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Metrics</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Quantity</div>
                <div className="text-sm font-medium">{formatNumber(holding.quantity, 2)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Average Cost</div>
                <div className="text-sm font-medium">{formatCurrency(holding.averageCost)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Current Price</div>
                <div className="text-sm font-medium">{formatCurrency(holding.currentPrice)}</div>
              </div>
              {holding.peRatio && (
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">P/E Ratio</div>
                  <div className="text-sm font-medium">{holding.peRatio.toFixed(2)}</div>
                </div>
              )}
              {holding.dividendYield && (
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Dividend Yield</div>
                  <div className="text-sm font-medium">{formatPercent(holding.dividendYield)}</div>
                </div>
              )}
              {holding.marketCap && (
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Market Cap</div>
                  <div className="text-sm font-medium">{formatCurrency(holding.marketCap)}</div>
                </div>
              )}
              {holding.high52Week && (
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">52W High</div>
                  <div className="text-sm font-medium">{formatCurrency(holding.high52Week)}</div>
                  <div className="text-xs text-gray-500">
                    {formatPercent(((holding.currentPrice - holding.high52Week) / holding.high52Week) * 100)} from high
                  </div>
                </div>
              )}
              {holding.low52Week && (
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">52W Low</div>
                  <div className="text-sm font-medium">{formatCurrency(holding.low52Week)}</div>
                  <div className="text-xs text-gray-500">
                    {formatPercent(((holding.currentPrice - holding.low52Week) / holding.low52Week) * 100)} from low
                  </div>
                </div>
              )}
              {holding.daysHeld !== undefined && (
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Days Held</div>
                  <div className="text-sm font-medium">{holding.daysHeld} days</div>
                </div>
              )}
              {holding.firstPurchaseDate && (
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">First Purchase</div>
                  <div className="text-sm font-medium">
                    {new Date(holding.firstPurchaseDate).toLocaleDateString()}
                  </div>
                </div>
              )}
              {holding.realizedGain !== undefined && (
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Realized Gain</div>
                  <div className={cn('text-sm font-medium', getColorForValue(holding.realizedGain))}>
                    {formatCurrency(holding.realizedGain)}
                  </div>
                </div>
              )}
              {holding.unrealizedGain !== undefined && (
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Unrealized Gain</div>
                  <div className={cn('text-sm font-medium', getColorForValue(holding.unrealizedGain))}>
                    {formatCurrency(holding.unrealizedGain)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Transaction History */}
          {transactions.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Transaction History ({transactions.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900/50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Date</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Type</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Qty</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Price</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Total</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {transactions
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((tx) => (
                        <tr key={tx.id}>
                          <td className="px-3 py-2 text-xs text-gray-900 dark:text-gray-100">
                            {new Date(tx.date).toLocaleDateString()}
                          </td>
                          <td className="px-3 py-2 text-xs">
                            <span className={cn(
                              'px-2 py-1 rounded text-xs',
                              tx.type === 'buy' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                              tx.type === 'sell' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                              'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                            )}>
                              {tx.type.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-900 dark:text-gray-100">
                            {formatNumber(tx.quantity, 2)}
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-900 dark:text-gray-100">
                            {formatCurrency(tx.price)}
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-900 dark:text-gray-100">
                            {formatCurrency(tx.quantity * tx.price + (tx.fees || 0))}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

