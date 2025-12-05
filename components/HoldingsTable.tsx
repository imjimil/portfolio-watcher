'use client';

import { useState } from 'react';
import { Holding, Portfolio } from '@/types';
import { formatCurrency, formatPercent, formatNumber, cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Trash2, Bell } from 'lucide-react';
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
  const [showSellModal, setShowSellModal] = useState(false);
  const [selectedHolding, setSelectedHolding] = useState<Holding | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [addingToWatchlist, setAddingToWatchlist] = useState<string | null>(null);

  const handleQuickSell = (holding: Holding, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedHolding(holding);
    setShowSellModal(true);
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
        <div className="h-8 w-full bg-gray-50 dark:bg-gray-900/50 rounded flex items-center justify-center">
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
      <ResponsiveContainer width="100%" height={32}>
        <LineChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <defs>
            <linearGradient id={`gradient-${symbol}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0.15} />
              <stop offset="100%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0.02} />
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
            stroke="#9ca3af" 
            strokeWidth={1} 
            strokeDasharray="2 2"
          />
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke={isPositive ? '#10b981' : '#ef4444'}
            strokeWidth={1.5}
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
      <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700/50 p-8 text-center">
        <p className="text-gray-500 dark:text-gray-400">No holdings yet. Add a transaction to get started.</p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile Card View - 2 Column Grid */}
      <div className="md:hidden grid grid-cols-2 gap-2">
        {holdings.map((holding) => {
          const isPositive = holding.gainLoss >= 0;
          const sparkline = sparklineData[holding.symbol];
          
          return (
            <div
              key={holding.symbol}
              onClick={() => {
                setSelectedHolding(holding);
                setShowDetailModal(true);
              }}
              className="bg-white dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700/50 p-3 cursor-pointer active:scale-[0.98] transition-transform"
            >
              {/* Header: Symbol & Value */}
              <div className="flex items-start justify-between gap-1 mb-1">
                <div className="min-w-0">
                  <span className="font-bold text-sm text-gray-900 dark:text-white">{holding.symbol}</span>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{formatNumber(holding.quantity, 2)} shares</p>
                </div>
                <div className={cn(
                  'flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                  isPositive 
                    ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30' 
                    : 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30'
                )}>
                  {isPositive ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                  {isPositive ? '+' : ''}{formatPercent(holding.gainLossPercent)}
                </div>
              </div>

              {/* Sparkline */}
              <div className="h-7 my-2">
                {sparkline ? (
                  <MiniSparkline 
                    symbol={holding.symbol}
                    data={sparkline}
                    currentPrice={holding.currentPrice}
                    averageCost={holding.averageCost}
                  />
                ) : (
                  <div className="h-full w-full bg-gray-50 dark:bg-gray-900/50 rounded flex items-center justify-center">
                    <div className="w-full h-0.5 bg-gray-200 dark:bg-gray-700 rounded" />
                  </div>
                )}
              </div>

              {/* Value & Price */}
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[10px] text-gray-500">Value</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">
                    {formatCurrency(holding.currentValue, 0)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-500">Price</p>
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300 tabular-nums">
                    {formatCurrency(holding.currentPrice)}
                  </p>
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
                  Asset
                </th>
                <th className="px-5 py-4 text-left text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-28">
                  Trend
                </th>
                <th className="px-5 py-4 text-right text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Shares
                </th>
                <th className="px-5 py-4 text-right text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Avg Cost
                </th>
                <th className="px-5 py-4 text-right text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-5 py-4 text-right text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Value
                </th>
                <th className="px-5 py-4 text-right text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Return
                </th>
                <th className="px-5 py-4 text-center text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Alloc
                </th>
                <th className="px-5 py-4 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
              {holdings.map((holding) => {
                const isPositive = holding.gainLoss >= 0;
                const sparkline = sparklineData[holding.symbol];

                return (
                  <tr
                    key={holding.symbol}
                    onClick={() => {
                      setSelectedHolding(holding);
                      setShowDetailModal(true);
                    }}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-sm font-bold text-gray-700 dark:text-gray-300">
                          {holding.symbol.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">{holding.symbol}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 max-w-[150px] truncate">{holding.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {sparkline ? (
                        <MiniSparkline 
                          symbol={holding.symbol}
                          data={sparkline}
                          currentPrice={holding.currentPrice}
                          averageCost={holding.averageCost}
                        />
                      ) : (
                        <div className="h-8 w-full bg-gray-50 dark:bg-gray-900/50 rounded flex items-center justify-center">
                          <span className="text-[10px] text-gray-400">Loading...</span>
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="text-sm text-gray-900 dark:text-white tabular-nums">{formatNumber(holding.quantity, 2)}</span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="text-sm text-gray-900 dark:text-white tabular-nums">{formatCurrency(holding.averageCost)}</span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="text-sm font-medium text-gray-900 dark:text-white tabular-nums">{formatCurrency(holding.currentPrice)}</span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">{formatCurrency(holding.currentValue)}</span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {isPositive ? (
                          <TrendingUp className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        )}
                        <div>
                          <div className={cn(
                            'text-sm font-semibold tabular-nums',
                            isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
                          )}>
                            {isPositive ? '+' : ''}{formatCurrency(holding.gainLoss)}
                          </div>
                          <div className={cn(
                            'text-xs tabular-nums',
                            isPositive ? 'text-emerald-600/70 dark:text-emerald-400/70' : 'text-red-500/70 dark:text-red-400/70'
                          )}>
                            {isPositive ? '+' : ''}{formatPercent(holding.gainLossPercent)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                          <div
                            className="bg-blue-600 dark:bg-blue-400 h-1.5 rounded-full"
                            style={{ width: `${Math.min(holding.allocation, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600 dark:text-gray-400 w-10 tabular-nums">
                          {formatPercent(holding.allocation, 1)}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={(e) => handleAddToWatchlist(holding, e)}
                          disabled={addingToWatchlist === holding.symbol}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors disabled:opacity-50"
                          title="Add to Watchlist"
                        >
                          <Bell className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => handleQuickSell(holding, e)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title="Sell"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
