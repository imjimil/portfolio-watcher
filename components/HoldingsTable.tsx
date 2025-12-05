'use client';

import { useState, useMemo } from 'react';
import { Holding, Portfolio } from '@/types';
import { formatCurrency, formatPercent, formatNumber, cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Trash2, Bell, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import AddTransactionModal from './AddTransactionModal';
import HoldingDetailModal from './HoldingDetailModal';
import { getWatchlist, saveWatchlist } from '@/lib/storage';
import { getStockPriceData } from '@/lib/stockService';

type SortField = 'symbol' | 'shares' | 'avgCost' | 'price' | 'value' | 'return' | 'allocation';
type SortDirection = 'asc' | 'desc';

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
  const [sortField, setSortField] = useState<SortField>('value');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Sort holdings
  const sortedHoldings = useMemo(() => {
    return [...holdings].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'symbol':
          comparison = a.symbol.localeCompare(b.symbol);
          break;
        case 'shares':
          comparison = a.quantity - b.quantity;
          break;
        case 'avgCost':
          comparison = a.averageCost - b.averageCost;
          break;
        case 'price':
          comparison = a.currentPrice - b.currentPrice;
          break;
        case 'value':
          comparison = a.currentValue - b.currentValue;
          break;
        case 'return':
          comparison = a.gainLossPercent - b.gainLossPercent;
          break;
        case 'allocation':
          comparison = a.allocation - b.allocation;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [holdings, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ChevronsUpDown className="h-3 w-3 text-gray-400" />;
    }
    return sortDirection === 'asc' 
      ? <ChevronUp className="h-3 w-3 text-blue-500" />
      : <ChevronDown className="h-3 w-3 text-blue-500" />;
  };

  const SortableHeader = ({ field, children, align = 'left' }: { 
    field: SortField; 
    children: React.ReactNode; 
    align?: 'left' | 'right' | 'center';
  }) => (
    <th
      onClick={() => handleSort(field)}
      className={cn(
        'px-5 py-4 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 transition-colors select-none',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        sortField === field && 'text-blue-600 dark:text-blue-400'
      )}
    >
      <div className={cn(
        'flex items-center gap-1',
        align === 'right' && 'justify-end',
        align === 'center' && 'justify-center'
      )}>
        {children}
        <SortIcon field={field} />
      </div>
    </th>
  );

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
        {sortedHoldings.map((holding) => {
          const isPositive = holding.gainLoss >= 0;
          
          return (
            <div
              key={holding.symbol}
              onClick={() => {
                setSelectedHolding(holding);
                setShowDetailModal(true);
              }}
              className="bg-white dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700/50 p-3 cursor-pointer active:scale-[0.98] transition-transform"
            >
              {/* Header: Symbol & Percentage */}
              <div className="flex items-start justify-between gap-1 mb-2">
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

              {/* Value & Return */}
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[10px] text-gray-500">Value</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">
                    {formatCurrency(holding.currentValue)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-500">Return</p>
                  <p className={cn(
                    'text-xs font-medium tabular-nums',
                    isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
                  )}>
                    {isPositive ? '+' : ''}{formatCurrency(holding.gainLoss)}
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
                <SortableHeader field="symbol">Asset</SortableHeader>
                <SortableHeader field="shares" align="right">Shares</SortableHeader>
                <SortableHeader field="avgCost" align="right">Avg Cost</SortableHeader>
                <SortableHeader field="price" align="right">Price</SortableHeader>
                <SortableHeader field="value" align="right">Value</SortableHeader>
                <SortableHeader field="return" align="right">Return</SortableHeader>
                <SortableHeader field="allocation" align="center">Alloc</SortableHeader>
                <th className="px-5 py-4 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
              {sortedHoldings.map((holding) => {
                const isPositive = holding.gainLoss >= 0;

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
