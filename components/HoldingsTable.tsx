'use client';

import { useState } from 'react';
import { Holding, Portfolio } from '@/types';
import { formatCurrency, formatPercent, formatNumber, getColorForValue, cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Eye, Plus, Trash2, Bell } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, Area, XAxis, YAxis, ReferenceLine } from 'recharts';
import AddTransactionModal from './AddTransactionModal';
import HoldingDetailModal from './HoldingDetailModal';
import { getWatchlist, saveWatchlist } from '@/lib/storage';
import { getStockPriceData } from '@/lib/stockService';

interface HoldingsTableProps {
  holdings: Holding[];
  sparklineData?: Record<string, any[]>;
  activePortfolio?: Portfolio | null;
  onRowClick?: (holding: Holding) => void;
  onAddTransaction?: (transaction: Omit<import('@/types').Transaction, 'id'>, portfolioId: string) => void;
}

export default function HoldingsTable({ 
  holdings, 
  sparklineData = {},
  activePortfolio,
  onRowClick,
  onAddTransaction
}: HoldingsTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [showSellModal, setShowSellModal] = useState(false);
  const [selectedHolding, setSelectedHolding] = useState<Holding | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showMetrics, setShowMetrics] = useState(false);
  const [addingToWatchlist, setAddingToWatchlist] = useState<string | null>(null);

  const toggleRow = (symbol: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(symbol)) {
        next.delete(symbol);
      } else {
        next.add(symbol);
      }
      return next;
    });
  };

  const handleQuickSell = (holding: Holding, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedHolding(holding);
    setShowSellModal(true);
  };

  const handleViewDetails = (holding: Holding, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedHolding(holding);
    setShowDetailModal(true);
  };

  const handleAddToWatchlist = async (holding: Holding, e: React.MouseEvent) => {
    e.stopPropagation();
    setAddingToWatchlist(holding.symbol);
    
    try {
      const watchlist = await getWatchlist();
      if (watchlist.some(w => w.symbol === holding.symbol)) {
        alert(`${holding.symbol} is already in your watchlist`);
        return;
      }

      const stock = await getStockPriceData(holding.symbol, holding.name);
      if (stock && stock.currentPrice > 0) {
        const newItem = {
          symbol: stock.symbol,
          name: stock.name,
          currentPrice: stock.currentPrice,
          change: stock.change,
          changePercent: stock.changePercent,
          dateAdded: new Date().toISOString(),
        };
        
        const updated = [...watchlist, newItem];
        await saveWatchlist(updated);
        alert(`${holding.symbol} added to watchlist`);
      }
    } catch (error) {
      console.error('Error adding to watchlist:', error);
      alert(`Error adding ${holding.symbol} to watchlist`);
    } finally {
      setAddingToWatchlist(null);
    }
  };

  const MiniSparkline = ({ symbol, data, currentPrice, averageCost }: { 
    symbol: string; 
    data: any[]; 
    currentPrice: number;
    averageCost: number;
  }) => {
    if (!data || data.length === 0) {
      return (
        <div className="h-10 w-full bg-gray-50 dark:bg-gray-900/50 rounded flex items-center justify-center">
          <span className="text-[10px] text-gray-400">No data</span>
        </div>
      );
    }

    const chartData = data.map((d, i) => ({ 
      index: i, 
      value: d.price,
    }));

    const min = Math.min(...chartData.map(d => d.value), averageCost, currentPrice);
    const max = Math.max(...chartData.map(d => d.value), averageCost, currentPrice);
    const range = max - min || 1;
    const isPositive = currentPrice >= averageCost;

    return (
      <ResponsiveContainer width="100%" height={40}>
        <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
          <defs>
            <linearGradient id={`gradient-${symbol}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0.2} />
              <stop offset="100%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            fill={`url(#gradient-${symbol})`}
            stroke="none"
          />
          <ReferenceLine 
            y={averageCost} 
            stroke="#6b7280" 
            strokeWidth={1.5} 
            strokeDasharray="3 3"
          />
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke={isPositive ? '#10b981' : '#ef4444'}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <XAxis dataKey="index" hide />
          <YAxis domain={[min - range * 0.1, max + range * 0.1]} hide />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  if (holdings.length === 0) {
    return (
      <div className="rounded-lg border bg-white dark:bg-gray-800 p-8 text-center">
        <p className="text-gray-500 dark:text-gray-400">No holdings yet. Add a transaction to get started.</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border bg-white dark:bg-gray-800 overflow-hidden mb-4">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Holdings</h2>
          <button
            onClick={() => setShowMetrics(!showMetrics)}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            {showMetrics ? 'Hide' : 'Show'} Extended Metrics
          </button>
        </div>
        <div className="overflow-x-auto -mx-3 sm:mx-0">
          <div className="inline-block min-w-full align-middle px-3 sm:px-0">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Symbol
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Chart
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
                  {showMetrics && (
                    <>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        P/E
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Div Yield
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Days Held
                      </th>
                    </>
                  )}
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {holdings.map((holding) => {
                  const isExpanded = expandedRows.has(holding.symbol);
                  const sparkline = sparklineData[holding.symbol];

                  return (
                    <>
                      <tr
                        key={holding.symbol}
                        onClick={() => onRowClick ? onRowClick(holding) : toggleRow(holding.symbol)}
                        className={cn(
                          'hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors',
                          (onRowClick || true) && 'cursor-pointer'
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
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap w-24">
                          {sparkline ? (
                            <MiniSparkline 
                              symbol={holding.symbol}
                              data={sparkline}
                              currentPrice={holding.currentPrice}
                              averageCost={holding.averageCost}
                            />
                          ) : (
                            <div className="h-10 w-full bg-gray-50 dark:bg-gray-900/50 rounded flex items-center justify-center">
                              <span className="text-[10px] text-gray-400">Loading...</span>
                            </div>
                          )}
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
                        {showMetrics && (
                          <>
                            <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 dark:text-gray-100">
                              {holding.peRatio ? holding.peRatio.toFixed(2) : 'N/A'}
                            </td>
                            <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 dark:text-gray-100">
                              {holding.dividendYield ? formatPercent(holding.dividendYield) : 'N/A'}
                            </td>
                            <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 dark:text-gray-100">
                              {holding.daysHeld !== undefined ? `${holding.daysHeld}d` : 'N/A'}
                            </td>
                          </>
                        )}
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => handleViewDetails(holding, e)}
                              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={(e) => handleAddToWatchlist(holding, e)}
                              disabled={addingToWatchlist === holding.symbol}
                              className="p-1 text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400 disabled:opacity-50"
                              title="Add to Watchlist"
                            >
                              <Bell className="h-4 w-4" />
                            </button>
                            <button
                              onClick={(e) => handleQuickSell(holding, e)}
                              className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                              title="Quick Sell"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${holding.symbol}-expanded`}>
                          <td colSpan={showMetrics ? 11 : 9} className="px-3 sm:px-6 py-4 bg-gray-50 dark:bg-gray-900/50">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              {holding.marketCap && (
                                <div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">Market Cap</div>
                                  <div className="font-medium">{formatCurrency(holding.marketCap)}</div>
                                </div>
                              )}
                              {holding.high52Week && (
                                <div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">52W High</div>
                                  <div className="font-medium">{formatCurrency(holding.high52Week)}</div>
                                  <div className="text-xs text-gray-500">
                                    {formatPercent(((holding.currentPrice - holding.high52Week) / holding.high52Week) * 100)}
                                  </div>
                                </div>
                              )}
                              {holding.low52Week && (
                                <div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">52W Low</div>
                                  <div className="font-medium">{formatCurrency(holding.low52Week)}</div>
                                  <div className="text-xs text-gray-500">
                                    {formatPercent(((holding.currentPrice - holding.low52Week) / holding.low52Week) * 100)}
                                  </div>
                                </div>
                              )}
                              {holding.realizedGain !== undefined && (
                                <div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">Realized Gain</div>
                                  <div className={cn('font-medium', getColorForValue(holding.realizedGain))}>
                                    {formatCurrency(holding.realizedGain)}
                                  </div>
                                </div>
                              )}
                              {holding.unrealizedGain !== undefined && (
                                <div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">Unrealized Gain</div>
                                  <div className={cn('font-medium', getColorForValue(holding.unrealizedGain))}>
                                    {formatCurrency(holding.unrealizedGain)}
                                  </div>
                                </div>
                              )}
                              {holding.firstPurchaseDate && (
                                <div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">First Purchase</div>
                                  <div className="font-medium">
                                    {new Date(holding.firstPurchaseDate).toLocaleDateString()}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showSellModal && selectedHolding && activePortfolio && (
        <AddTransactionModal
          isOpen={showSellModal}
          onClose={() => {
            setShowSellModal(false);
            setSelectedHolding(null);
          }}
          onAdd={async (transaction, portfolioId) => {
            if (onAddTransaction) {
              await onAddTransaction(transaction, portfolioId);
            }
            setShowSellModal(false);
            setSelectedHolding(null);
          }}
          existingSymbols={holdings.map(h => h.symbol)}
          portfolios={activePortfolio ? [activePortfolio] : []}
          activePortfolioId={activePortfolio?.id}
          prefillSymbol={selectedHolding.symbol}
          prefillType="sell"
        />
      )}

      {showDetailModal && selectedHolding && (
        <HoldingDetailModal
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedHolding(null);
          }}
          holding={selectedHolding}
          portfolio={activePortfolio}
        />
      )}
    </>
  );
}
