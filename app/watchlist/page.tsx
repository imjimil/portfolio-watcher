'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Navbar from '@/components/Navbar';
import { 
  Plus, TrendingUp, TrendingDown, Bell, Target,
  ArrowUpDown, RefreshCw, Download,
  Trash2, CheckSquare, Square
} from 'lucide-react';
import { WatchlistItem, Alert, Portfolio } from '@/types';
import { getStockPriceData, searchStocks, getHistoricalData, clearStaleCacheIfNeeded } from '@/lib/stockService';
import { getWatchlist, saveWatchlist, getAlerts, saveAlerts, getPortfolios } from '@/lib/storage';
import { formatCurrency, formatPercent, getColorForValue, cn } from '@/lib/utils';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, ReferenceLine } from 'recharts';
import AlertModal from '@/components/AlertModal';
import TargetPriceModal from '@/components/TargetPriceModal';
import SkeletonWatchlist from '@/components/skeletons/SkeletonWatchlist';
import DeleteToast from '@/components/DeleteToast';

type SortField = 'symbol' | 'price' | 'change' | 'changePercent' | 'targetPrice' | 'dateAdded';
type FilterType = 'all' | 'gainers' | 'losers' | 'alerts' | 'targets';

interface WatchlistStats {
  totalItems: number;
  totalValue: number;
  avgChange: number;
  topGainer: WatchlistItem | null;
  topLoser: WatchlistItem | null;
  itemsWithAlerts: number;
  itemsNearTarget: number;
}

export default function WatchlistPage() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAllResults, setShowAllResults] = useState(false);
  const [sortField, setSortField] = useState<SortField>('dateAdded');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [comparingItems, setComparingItems] = useState<Set<string>>(new Set());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(60000); // 1 minute
  const [sparklineData, setSparklineData] = useState<Record<string, { intraday: any[]; previousClose: number } | any[]>>({});
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertSymbol, setAlertSymbol] = useState<string>('');
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [targetSymbol, setTargetSymbol] = useState<string>('');
  const [removedItem, setRemovedItem] = useState<WatchlistItem | null>(null);
  const [removedCount, setRemovedCount] = useState<number>(0);
  const [removedItems, setRemovedItems] = useState<WatchlistItem[]>([]); // For bulk removal

  const searchInputRef = useRef<HTMLInputElement>(null);

  const INITIAL_RESULTS_COUNT = 8;

  // Update prices only in memory (for auto-refresh)
  const updatePricesOnly = useCallback(async (items: WatchlistItem[]) => {
    if (refreshing) return;
    setRefreshing(true);
    
    try {
      const updated = [...watchlist];
      let hasChanges = false;
      
      for (const item of items) {
        try {
          const stock = await getStockPriceData(item.symbol, item.name);
          if (stock && stock.currentPrice > 0) {
            const index = updated.findIndex(w => w.symbol === item.symbol);
            if (index !== -1) {
              if (
                updated[index].currentPrice !== stock.currentPrice ||
                updated[index].change !== stock.change ||
                updated[index].changePercent !== stock.changePercent
              ) {
                updated[index] = {
                  ...updated[index],
                  currentPrice: stock.currentPrice,
                  change: stock.change,
                  changePercent: stock.changePercent,
                };
                hasChanges = true;
              }
            }
          }
        } catch (error) {
          console.error(`Failed to update ${item.symbol}:`, error);
        }
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      if (hasChanges) {
        setWatchlist(updated);
      }
    } finally {
      setRefreshing(false);
    }
  }, [watchlist, refreshing]);

  // Update prices and save to DB (for manual refresh)
  const updatePrices = useCallback(async (items: WatchlistItem[]) => {
    if (refreshing) return;
    setRefreshing(true);
    
    try {
      const updated = [...watchlist];
      let hasChanges = false;
      
      for (const item of items) {
        try {
          const stock = await getStockPriceData(item.symbol, item.name);
          if (stock && stock.currentPrice > 0) {
            const index = updated.findIndex(w => w.symbol === item.symbol);
            if (index !== -1) {
              if (
                updated[index].currentPrice !== stock.currentPrice ||
                updated[index].change !== stock.change ||
                updated[index].changePercent !== stock.changePercent
              ) {
                updated[index] = {
                  ...updated[index],
                  currentPrice: stock.currentPrice,
                  change: stock.change,
                  changePercent: stock.changePercent,
                };
                hasChanges = true;
              }
            }
          }
        } catch (error) {
          console.error(`Failed to update ${item.symbol}:`, error);
        }
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      if (hasChanges) {
        setWatchlist(updated);
        try {
          await saveWatchlist(updated);
        } catch (error) {
          console.error('Error saving watchlist after price update:', error);
        }
      }
    } finally {
      setRefreshing(false);
    }
  }, [watchlist, refreshing]);

  const loadSparklines = useCallback(async (items: WatchlistItem[]) => {
    const data: Record<string, { intraday: any[]; previousClose: number }> = {};
    
    for (const item of items) {
      try {
        // First try intraday data for today
        let histData = await getHistoricalData(item.symbol, 1, '1d', true);
        
        // If no intraday data (market closed/weekend/holiday), fall back to daily data
        if (!histData || histData.length === 0) {
          histData = await getHistoricalData(item.symbol, 5, '5d', false);
        }
        
        // Calculate previous close from current price and change percent
        let previousClose = item.currentPrice;
        if (item.changePercent !== undefined && item.changePercent !== 0) {
          previousClose = item.currentPrice / (1 + item.changePercent / 100);
        } else if (histData.length > 0) {
          previousClose = histData[0].price;
        }
        
        if (histData.length > 0) {
          data[item.symbol] = {
            intraday: histData.map(d => ({
              date: d.date,
              price: d.price,
            })),
            previousClose: previousClose
          };
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Failed to load sparkline for ${item.symbol}:`, error);
      }
    }
    
    setSparklineData(prev => ({ ...prev, ...data }));
  }, []);

  const hasRefreshedRef = useRef(false);

  const loadData = useCallback(async () => {
    try {
      const cacheWasStale = clearStaleCacheIfNeeded();
      
      const [loadedWatchlist, loadedAlerts, loadedPortfolios] = await Promise.all([
        getWatchlist(),
        getAlerts(),
        getPortfolios()
      ]);
      setWatchlist(loadedWatchlist);
      setAlerts(loadedAlerts);
      setPortfolios(loadedPortfolios);
      
      if (loadedWatchlist.length > 0) {
        const shouldRefresh = cacheWasStale || !hasRefreshedRef.current;
        
        if (shouldRefresh) {
          setRefreshing(true);
          
          try {
            const updated = [...loadedWatchlist];
            let hasChanges = false;
            
            for (const item of loadedWatchlist) {
              try {
                const stock = await getStockPriceData(item.symbol, item.name);
                if (stock && stock.currentPrice > 0) {
                  const index = updated.findIndex(w => w.symbol === item.symbol);
                  if (index !== -1) {
                    if (
                      updated[index].currentPrice !== stock.currentPrice ||
                      updated[index].change !== stock.change ||
                      updated[index].changePercent !== stock.changePercent
                    ) {
                      updated[index] = {
                        ...updated[index],
                        currentPrice: stock.currentPrice,
                        change: stock.change,
                        changePercent: stock.changePercent,
                      };
                      hasChanges = true;
                    }
                  }
                }
              } catch (error) {
                console.error(`Failed to refresh ${item.symbol}:`, error);
              }
              await new Promise(resolve => setTimeout(resolve, 150));
            }
            
            if (hasChanges) {
              setWatchlist(updated);
              await saveWatchlist(updated);
            }
            
            loadSparklines(updated.length > 0 ? updated : loadedWatchlist);
            hasRefreshedRef.current = true;
          } finally {
            setRefreshing(false);
          }
        } else {
          loadSparklines(loadedWatchlist);
        }
      }
    } catch (error) {
      console.error('Error loading watchlist data:', error);
    } finally {
      setPageLoading(false);
    }
  }, [loadSparklines]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || watchlist.length === 0) return;
    
    const interval = setInterval(() => {
      if (!refreshing && watchlist.length > 0) {
        updatePricesOnly(watchlist);
      }
    }, refreshInterval);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, refreshInterval, watchlist.length, refreshing]);

  // Debounced search
  useEffect(() => {
    if (!isAdding || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await searchStocks(searchQuery);
        setSearchResults(results);
        setShowAllResults(false);
      } catch (error) {
        console.error('Search failed:', error);
        setSearchResults([]);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, isAdding]);

  // Auto-focus search input when adding
  useEffect(() => {
    if (isAdding && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isAdding]);

  // Calculate statistics
  const stats = useMemo<WatchlistStats>(() => {
    const totalItems = watchlist.length;
    const totalValue = watchlist.reduce((sum, item) => sum + item.currentPrice, 0);
    const avgChange = watchlist.length > 0 
      ? watchlist.reduce((sum, item) => sum + item.changePercent, 0) / watchlist.length 
      : 0;
    
    const sortedByChange = [...watchlist].sort((a, b) => b.changePercent - a.changePercent);
    const topGainer = sortedByChange[0] || null;
    const topLoser = sortedByChange[sortedByChange.length - 1] || null;
    
    const itemsWithAlerts = watchlist.filter(item => 
      alerts.some(alert => alert.symbol === item.symbol && alert.isActive)
    ).length;
    
    const itemsNearTarget = watchlist.filter(item => {
      if (!item.targetPrice) return false;
      const diff = Math.abs(item.currentPrice - item.targetPrice) / item.targetPrice;
      return diff <= 0.05;
    }).length;

    return {
      totalItems,
      totalValue,
      avgChange,
      topGainer,
      topLoser,
      itemsWithAlerts,
      itemsNearTarget,
    };
  }, [watchlist, alerts]);

  // Filter and sort
  const filteredAndSorted = useMemo(() => {
    let filtered = [...watchlist];

    switch (filterType) {
      case 'gainers':
        filtered = filtered.filter(item => item.changePercent > 0);
        break;
      case 'losers':
        filtered = filtered.filter(item => item.changePercent < 0);
        break;
      case 'alerts':
        filtered = filtered.filter(item => 
          alerts.some(alert => alert.symbol === item.symbol && alert.isActive)
        );
        break;
      case 'targets':
        filtered = filtered.filter(item => item.targetPrice !== undefined);
        break;
    }

    filtered.sort((a, b) => {
      let aVal: any, bVal: any;
      
      switch (sortField) {
        case 'symbol':
          aVal = a.symbol;
          bVal = b.symbol;
          break;
        case 'price':
          aVal = a.currentPrice;
          bVal = b.currentPrice;
          break;
        case 'change':
          aVal = a.change;
          bVal = b.change;
          break;
        case 'changePercent':
          aVal = a.changePercent;
          bVal = b.changePercent;
          break;
        case 'targetPrice':
          aVal = a.targetPrice || 0;
          bVal = b.targetPrice || 0;
          break;
        case 'dateAdded':
          aVal = a.dateAdded ? new Date(a.dateAdded).getTime() : 0;
          bVal = b.dateAdded ? new Date(b.dateAdded).getTime() : 0;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [watchlist, filterType, sortField, sortDirection, alerts]);

  const handleAddToWatchlist = async (symbol: string, name: string) => {
    if (watchlist.some(w => w.symbol === symbol)) {
      alert(`${symbol} is already in your watchlist`);
      return;
    }

    setLoading(true);
    try {
      const stock = await getStockPriceData(symbol, name);
      
      if (stock && stock.currentPrice > 0) {
        const newItem: WatchlistItem = {
          symbol: stock.symbol,
          name: stock.name,
          currentPrice: stock.currentPrice,
          change: stock.change,
          changePercent: stock.changePercent,
          dateAdded: new Date().toISOString(),
        };
        
        if (watchlist.some(w => w.symbol === symbol)) {
          alert(`${symbol} is already in your watchlist`);
          return;
        }
        
        const updated = [...watchlist, newItem];
        setWatchlist(updated);
        setSearchQuery('');
        setSearchResults([]);
        setIsAdding(false);
        
        try {
          await saveWatchlist(updated);
          loadSparklines([newItem]);
        } catch (error) {
          console.error('Error saving watchlist:', error);
          setWatchlist(watchlist);
          setIsAdding(true);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          if (errorMessage.includes('duplicate') || errorMessage.includes('23505')) {
            alert(`${symbol} is already in your watchlist`);
          } else {
            alert(`Error adding to watchlist: ${errorMessage}`);
          }
        }
      }
    } catch (error) {
      console.error('Failed to add to watchlist:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Error adding to watchlist: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (symbol: string) => {
    const itemToRemove = watchlist.find(w => w.symbol === symbol);
    if (!itemToRemove) return;

    // Show toast immediately, before removing from UI
    setRemovedItem(itemToRemove);
    setRemovedCount(1);

    // Then remove from UI and save
    const updated = watchlist.filter(w => w.symbol !== symbol);
    setWatchlist(updated);
    await saveWatchlist(updated);
    setSelectedItems(prev => {
      const next = new Set(prev);
      next.delete(symbol);
      return next;
    });
  };

  const handleBulkRemove = async () => {
    if (selectedItems.size === 0) return;
    
    const itemsToRemove = watchlist.filter(w => selectedItems.has(w.symbol));
    const firstRemovedItem = itemsToRemove[0];
    const count = selectedItems.size;

    // Show toast immediately, before removing from UI
    if (firstRemovedItem) {
      setRemovedItem(firstRemovedItem);
      setRemovedCount(count);
      setRemovedItems(itemsToRemove); // Store all removed items for undo
    }

    // Then remove from UI and save
    const updated = watchlist.filter(w => !selectedItems.has(w.symbol));
    setWatchlist(updated);
    await saveWatchlist(updated);
    setSelectedItems(new Set());
  };

  const handleUndoRemove = async () => {
    if (!removedItem) return;

    // Restore the item(s)
    if (removedCount > 1 && removedItems.length > 0) {
      // For bulk removal, restore all items
      const symbolsToRestore = new Set(removedItems.map(item => item.symbol));
      const existingSymbols = new Set(watchlist.map(w => w.symbol));
      
      // Filter out items that already exist
      const itemsToRestore = removedItems.filter(item => !existingSymbols.has(item.symbol));
      
      if (itemsToRestore.length > 0) {
        const restored = [...watchlist, ...itemsToRestore].sort((a, b) => {
          const dateA = new Date(a.dateAdded || 0).getTime();
          const dateB = new Date(b.dateAdded || 0).getTime();
          return dateB - dateA; // Most recent first
        });
        setWatchlist(restored);
        await saveWatchlist(restored);
      }
    } else {
      // Single item removal - restore it
      const itemExists = watchlist.some(w => w.symbol === removedItem.symbol);
      if (!itemExists) {
        const restored = [...watchlist, removedItem].sort((a, b) => {
          const dateA = new Date(a.dateAdded || 0).getTime();
          const dateB = new Date(b.dateAdded || 0).getTime();
          return dateB - dateA; // Most recent first
        });
        setWatchlist(restored);
        await saveWatchlist(restored);
      }
    }

    setRemovedItem(null);
    setRemovedCount(0);
    setRemovedItems([]);
  };

  const handleCloseToast = () => {
    setRemovedItem(null);
    setRemovedCount(0);
    setRemovedItems([]);
  };

  const toggleSelect = (symbol: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(symbol)) {
        next.delete(symbol);
      } else {
        next.add(symbol);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === filteredAndSorted.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredAndSorted.map(item => item.symbol)));
    }
  };

  const toggleCompare = (symbol: string) => {
    setComparingItems(prev => {
      const next = new Set(prev);
      if (next.has(symbol)) {
        next.delete(symbol);
      } else {
        if (next.size < 4) {
          next.add(symbol);
        }
      }
      return next;
    });
  };

  const handleSetTarget = (symbol: string) => {
    setTargetSymbol(symbol);
    setShowTargetModal(true);
  };

  const handleSaveTarget = async (symbol: string, targetPrice: number) => {
    const updated = watchlist.map(item =>
      item.symbol === symbol ? { ...item, targetPrice: targetPrice > 0 ? targetPrice : undefined } : item
    );
    setWatchlist(updated);
    setShowTargetModal(false);
    
    try {
      await saveWatchlist(updated);
    } catch (error) {
      console.error('Error saving target price:', error);
      alert(`Error saving target price: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setWatchlist(watchlist);
      setShowTargetModal(true);
    }
  };

  const handleSetAlert = (symbol: string) => {
    setAlertSymbol(symbol);
    setShowAlertModal(true);
  };

  const handleSaveAlert = async (alert: Omit<Alert, 'id' | 'createdAt'>) => {
    const newAlert: Alert = {
      ...alert,
      id: `alert-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    const updated = [...alerts, newAlert];
    setAlerts(updated);
    await saveAlerts(updated);
    setShowAlertModal(false);
  };

  const handleDeleteAlert = async (alertId: string) => {
    const updated = alerts.filter(a => a.id !== alertId);
    setAlerts(updated);
    await saveAlerts(updated);
  };

  const exportWatchlist = () => {
    const csv = [
      ['Symbol', 'Name', 'Current Price', 'Change', 'Change %', 'Target Price', 'Date Added'].join(','),
      ...watchlist.map(item => [
        item.symbol,
        `"${item.name}"`,
        item.currentPrice,
        item.change,
        item.changePercent,
        item.targetPrice || '',
        item.dateAdded || '',
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `watchlist-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getItemAlerts = (symbol: string) => {
    return alerts.filter(a => a.symbol === symbol && a.isActive);
  };

  const isInPortfolio = (symbol: string) => {
    return portfolios.some(p => 
      p.holdings?.some(h => h.symbol === symbol) || 
      p.transactions?.some(t => t.symbol === symbol)
    );
  };

  // Mini Sparkline Component
  const MiniSparkline = ({ symbol, data, currentPrice, changePercent }: { symbol: string; data: { intraday: any[]; previousClose: number } | any[]; currentPrice: number; changePercent: number }) => {
    const rawIntradayData = Array.isArray(data) ? data : (data?.intraday || []);
    
    // Data comes in most-recent-first, but we need oldest-first for chart to show progression
    const intradayData = [...rawIntradayData].reverse();
    
    // Calculate previous close from change percent (most reliable)
    let previousClose: number;
    if (!Array.isArray(data) && data?.previousClose) {
      previousClose = data.previousClose;
    } else if (changePercent !== undefined && changePercent !== 0) {
      previousClose = currentPrice / (1 + changePercent / 100);
    } else {
      previousClose = currentPrice;
    }
    
    if (!intradayData || intradayData.length === 0) return null;
    
    const chartData = intradayData.map((d, i) => ({ 
      index: i, 
      value: d.price,
    }));
    
    // Determine color based on change percent (most reliable)
    const isPositive = changePercent >= 0;
    const lineColor = isPositive ? '#10b981' : '#ef4444';
    
    const min = Math.min(...chartData.map(d => d.value), previousClose);
    const max = Math.max(...chartData.map(d => d.value), previousClose);
    const range = max - min || 1;
    
    return (
      <ResponsiveContainer width="100%" height={28}>
        <LineChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <ReferenceLine 
            y={previousClose} 
            stroke="#9ca3af" 
            strokeWidth={1} 
            strokeDasharray="2 2"
          />
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke={lineColor}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
          <XAxis dataKey="index" hide />
          <YAxis domain={[min - range * 0.05, max + range * 0.05]} hide />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  // Statistics Cards - Modern compact style
  const StatsCards = () => (
    <div className="mb-4 md:mb-6">
      {/* Mobile: Horizontal scroll */}
      <div className="flex md:hidden gap-2 overflow-x-auto pb-2 -mx-3 px-3 scrollbar-hide">
        <div className="flex-shrink-0 bg-white dark:bg-gray-800/50 rounded-xl px-4 py-3 min-w-[100px]">
          <div className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">Watching</div>
          <div className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">{stats.totalItems}</div>
        </div>
        <div className="flex-shrink-0 bg-white dark:bg-gray-800/50 rounded-xl px-4 py-3 min-w-[100px]">
          <div className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">Avg Change</div>
          <div className={cn('text-xl font-bold mt-0.5', stats.avgChange >= 0 ? 'text-emerald-600' : 'text-red-500')}>
            {stats.avgChange >= 0 ? '+' : ''}{stats.avgChange.toFixed(2)}%
          </div>
        </div>
        {stats.topGainer && (
          <div className="flex-shrink-0 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl px-4 py-3 min-w-[110px]">
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Top Gainer</div>
            <div className="text-base font-bold text-gray-900 dark:text-white mt-0.5">{stats.topGainer.symbol}</div>
            <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              +{stats.topGainer.changePercent.toFixed(2)}%
            </div>
          </div>
        )}
        {stats.topLoser && stats.topLoser.changePercent < 0 && (
          <div className="flex-shrink-0 bg-red-50 dark:bg-red-900/20 rounded-xl px-4 py-3 min-w-[110px]">
            <div className="text-[11px] text-red-500 dark:text-red-400 uppercase tracking-wide">Top Loser</div>
            <div className="text-base font-bold text-gray-900 dark:text-white mt-0.5">{stats.topLoser.symbol}</div>
            <div className="text-sm font-semibold text-red-500 dark:text-red-400">
              {stats.topLoser.changePercent.toFixed(2)}%
            </div>
          </div>
        )}
      </div>
      
      {/* Desktop: Grid */}
      <div className="hidden md:grid md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400">Watching</div>
          <div className="text-2xl font-bold mt-1">{stats.totalItems}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400">Avg Change</div>
          <div className={cn('text-2xl font-bold mt-1', stats.avgChange >= 0 ? 'text-emerald-600' : 'text-red-500')}>
            {stats.avgChange >= 0 ? '+' : ''}{stats.avgChange.toFixed(2)}%
          </div>
        </div>
        {stats.topGainer && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
            <div className="text-xs text-gray-500 dark:text-gray-400">Top Gainer</div>
            <div className="text-lg font-bold mt-1">{stats.topGainer.symbol}</div>
            <div className="text-sm font-semibold text-emerald-600">+{stats.topGainer.changePercent.toFixed(2)}%</div>
          </div>
        )}
        {stats.topLoser && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
            <div className="text-xs text-gray-500 dark:text-gray-400">Top Loser</div>
            <div className="text-lg font-bold mt-1">{stats.topLoser.symbol}</div>
            <div className="text-sm font-semibold text-red-500">{stats.topLoser.changePercent.toFixed(2)}%</div>
          </div>
        )}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400">Active Alerts</div>
          <div className="text-2xl font-bold mt-1">{stats.itemsWithAlerts}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400">Near Target</div>
          <div className="text-2xl font-bold mt-1">{stats.itemsNearTarget}</div>
        </div>
      </div>
    </div>
  );

  // Watchlist Item Card - Modern Fintech Style
  const WatchlistItemCard = ({ item }: { item: WatchlistItem }) => {
    const itemAlerts = getItemAlerts(item.symbol);
    const isSelected = selectedItems.has(item.symbol);
    const isComparing = comparingItems.has(item.symbol);
    const sparkline = sparklineData[item.symbol];
    const hasTarget = item.targetPrice !== undefined;
    const targetProgress = hasTarget && item.targetPrice! > 0
      ? Math.min(100, (item.currentPrice / item.targetPrice!) * 100)
      : null;

    const [swipeOffset, setSwipeOffset] = useState(0);
    const [isSwiping, setIsSwiping] = useState(false);
    const touchStartRef = useRef<number | null>(null);

    const handleTouchStart = (e: React.TouchEvent) => {
      touchStartRef.current = e.touches[0].clientX;
      setIsSwiping(true);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
      if (touchStartRef.current === null) return;
      const diff = e.touches[0].clientX - touchStartRef.current;
      const maxSwipe = 80;
      setSwipeOffset(Math.max(-maxSwipe, Math.min(maxSwipe, diff)));
    };

    const handleTouchEnd = () => {
      if (touchStartRef.current === null) return;
      const threshold = 40;
      
      if (swipeOffset < -threshold) {
        handleRemove(item.symbol);
      } else if (swipeOffset > threshold) {
        toggleCompare(item.symbol);
      }
      
      setSwipeOffset(0);
      setIsSwiping(false);
      touchStartRef.current = null;
    };

    return (
      <div className="relative overflow-hidden">
        {/* Swipe actions - Mobile only */}
        <div className={cn(
          'absolute right-0 top-0 bottom-0 w-16 bg-red-500 flex items-center justify-center transition-opacity duration-150 md:hidden',
          swipeOffset < -15 ? 'opacity-100' : 'opacity-0'
        )}>
          <Trash2 className="h-5 w-5 text-white" />
        </div>
        <div className={cn(
          'absolute left-0 top-0 bottom-0 w-16 bg-blue-500 flex items-center justify-center transition-opacity duration-150 md:hidden',
          swipeOffset > 15 ? 'opacity-100' : 'opacity-0'
        )}>
          <Bell className="h-5 w-5 text-white" />
        </div>

        <div 
          className={cn(
            'bg-white dark:bg-gray-800/50 relative transition-all duration-150',
            // Mobile: clean list item style
            'md:rounded-xl md:border md:border-gray-100 md:dark:border-gray-700/50 md:shadow-sm md:hover:shadow-md',
            isSelected && 'bg-blue-50 dark:bg-blue-900/20',
            isComparing && 'bg-green-50 dark:bg-green-900/20'
          )}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            transform: `translateX(${swipeOffset}px)`,
            transition: isSwiping ? 'none' : 'transform 0.2s ease-out'
          }}
        >
          {/* Mobile Layout - Clean list style like Robinhood */}
          <div className="md:hidden">
            <div className="flex items-center px-4 py-3.5 active:bg-gray-50 dark:active:bg-gray-700/30">
              {/* Left: Symbol & Name */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[15px] text-gray-900 dark:text-white tracking-tight">
                    {item.symbol}
                  </span>
                  {itemAlerts.length > 0 && (
                    <Bell className="h-3 w-3 text-amber-500 fill-amber-500" />
                  )}
                  {isInPortfolio(item.symbol) && (
                    <span className="text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-full">
                      Owned
                    </span>
                  )}
                </div>
                <p className="text-[13px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                  {item.name}
                </p>
              </div>

              {/* Center: Sparkline */}
              <div className="w-20 h-8 mx-3">
                {sparkline && (Array.isArray(sparkline) ? sparkline.length > 0 : sparkline.intraday?.length > 0) ? (
                  <MiniSparkline 
                    symbol={item.symbol} 
                    data={sparkline} 
                    currentPrice={item.currentPrice}
                    changePercent={item.changePercent}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <div className="w-full h-[1px] bg-gray-200 dark:bg-gray-700" />
                  </div>
                )}
              </div>

              {/* Right: Price & Change */}
              <div className="text-right min-w-[80px]">
                <div className="font-semibold text-[15px] text-gray-900 dark:text-white tabular-nums">
                  {formatCurrency(item.currentPrice)}
                </div>
                <div className={cn(
                  'text-[13px] font-medium tabular-nums',
                  item.changePercent >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
                )}>
                  {item.changePercent >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
                </div>
              </div>
            </div>

            {/* Target progress - only if set */}
            {hasTarget && (
              <div className="px-4 pb-3">
                <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 mb-1">
                  <span>Target: {formatCurrency(item.targetPrice!)}</span>
                  <span className={cn(
                    'font-medium',
                    targetProgress && targetProgress >= 95 ? 'text-emerald-600' : ''
                  )}>
                    {targetProgress?.toFixed(0)}%
                  </span>
                </div>
                <div className="h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      'h-full rounded-full transition-all',
                      targetProgress && targetProgress >= 95 ? 'bg-emerald-500' : 'bg-blue-500'
                    )}
                    style={{ width: `${Math.min(100, targetProgress || 0)}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Desktop Layout - Card style with actions */}
          <div className="hidden md:block p-4">
            <div className="flex items-center gap-4">
              {selectedItems.size > 0 && (
                <button onClick={() => toggleSelect(item.symbol)} className="flex-shrink-0">
                  {isSelected ? (
                    <CheckSquare className="h-4 w-4 text-blue-600" />
                  ) : (
                    <Square className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              )}
              
              {/* Symbol & Name */}
              <div className="min-w-[120px]">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-gray-900 dark:text-gray-100">{item.symbol}</h3>
                  {itemAlerts.length > 0 && (
                    <Bell className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                  )}
                  {hasTarget && (
                    <Target className={cn(
                      'h-3.5 w-3.5',
                      targetProgress && targetProgress >= 95 ? 'text-emerald-500' : 'text-blue-500'
                    )} />
                  )}
                  {isInPortfolio(item.symbol) && (
                    <span className="text-[9px] font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded">
                      Owned
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{item.name}</p>
              </div>

              {/* Sparkline */}
              <div className="flex-1 h-10">
                {sparkline && (Array.isArray(sparkline) ? sparkline.length > 0 : sparkline.intraday?.length > 0) ? (
                  <MiniSparkline 
                    symbol={item.symbol} 
                    data={sparkline} 
                    currentPrice={item.currentPrice}
                    changePercent={item.changePercent}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <div className="w-full h-[1px] bg-gray-200 dark:bg-gray-700" />
                  </div>
                )}
              </div>

              {/* Price & Change */}
              <div className="text-right min-w-[100px]">
                <div className="text-base font-bold text-gray-900 dark:text-gray-100 tabular-nums">
                  {formatCurrency(item.currentPrice)}
                </div>
                <div className={cn(
                  'text-sm font-medium tabular-nums',
                  item.changePercent >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
                )}>
                  {item.changePercent >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
                </div>
              </div>
            </div>

            {/* Target progress bar - Desktop */}
            {hasTarget && (
              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700/50">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                  <span>Target: {formatCurrency(item.targetPrice!)}</span>
                  <span className={cn(
                    'font-medium',
                    targetProgress && targetProgress >= 95 ? 'text-emerald-600' : ''
                  )}>
                    {targetProgress?.toFixed(0)}% reached
                  </span>
                </div>
                <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      'h-full rounded-full',
                      targetProgress && targetProgress >= 95 ? 'bg-emerald-500' : 'bg-blue-500'
                    )}
                    style={{ width: `${Math.min(100, targetProgress || 0)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Action buttons - Desktop */}
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700/50">
              <button
                onClick={() => handleSetAlert(item.symbol)}
                className="flex-1 text-xs font-medium py-2 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
              >
                Alert
              </button>
              <button
                onClick={() => handleSetTarget(item.symbol)}
                className="flex-1 text-xs font-medium py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
              >
                Target
              </button>
              <button
                onClick={() => toggleCompare(item.symbol)}
                className={cn(
                  'flex-1 text-xs font-medium py-2 rounded-lg transition-colors',
                  isComparing 
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                    : 'bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 hover:bg-gray-100'
                )}
                disabled={!isComparing && comparingItems.size >= 4}
              >
                {isComparing ? 'Comparing' : 'Compare'}
              </button>
              <button
                onClick={() => handleRemove(item.symbol)}
                className="flex-1 text-xs font-medium py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Comparison View
  const ComparisonView = () => {
    const comparing = filteredAndSorted.filter(item => comparingItems.has(item.symbol));
    if (comparing.length === 0) return null;

    return (
      <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Comparing {comparing.length} stocks</h3>
          <button
            onClick={() => setComparingItems(new Set())}
            className="text-sm text-red-600 hover:text-red-800"
          >
            Clear
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {comparing.map(item => (
            <div key={item.symbol} className="border rounded-lg p-3">
              <div className="font-semibold">{item.symbol}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">{item.name}</div>
              <div className="mt-2 text-lg font-semibold">{formatCurrency(item.currentPrice)}</div>
              <div className={cn('text-sm', getColorForValue(item.changePercent))}>
                {item.changePercent >= 0 ? '+' : ''}{formatPercent(item.changePercent)}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <main className="container mx-auto px-4 pt-2 pb-20 sm:pt-6 md:pb-6 max-w-7xl">
        {pageLoading ? (
          <SkeletonWatchlist />
        ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-4 md:mb-0">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">Watchlist</h1>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">Track stocks you&apos;re interested in</p>
            </div>
            <div className="flex items-center gap-2 md:hidden">
              <button
                onClick={() => setIsAdding(!isAdding)}
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                title="Add Stock"
              >
                <Plus className="h-5 w-5" />
              </button>
              <button
                onClick={exportWatchlist}
                className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                title="Export"
              >
                <Download className="h-5 w-5" />
              </button>
              <button
                onClick={() => updatePrices(watchlist)}
                disabled={refreshing}
                className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw className={cn('h-5 w-5', refreshing && 'animate-spin')} />
              </button>
            </div>
          </div>

          <StatsCards />
          <ComparisonView />

          {isAdding && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 relative z-50">
              <div className="relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search stocks (e.g., AAPL, MSFT) - Type at least 2 characters"
                  className="w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                {loading && (
                  <div className="absolute right-3 top-2.5 text-sm text-gray-500">Searching...</div>
                )}
                {searchResults.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border rounded-lg shadow-xl max-h-60 overflow-y-auto">
                    {(showAllResults ? searchResults : searchResults.slice(0, INITIAL_RESULTS_COUNT)).map((stock) => (
                      <button
                        key={stock.symbol}
                        onClick={() => handleAddToWatchlist(stock.symbol, stock.name)}
                        disabled={loading || watchlist.some(w => w.symbol === stock.symbol)}
                        className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div>
                          <div className="font-medium">{stock.symbol}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{stock.name}</div>
                        </div>
                        {watchlist.some(w => w.symbol === stock.symbol) && (
                          <span className="text-xs text-gray-500">Added</span>
                        )}
                      </button>
                    ))}
                    {!showAllResults && searchResults.length > INITIAL_RESULTS_COUNT && (
                      <button
                        onClick={() => setShowAllResults(true)}
                        className="w-full px-4 py-2 text-center text-sm text-blue-600 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 border-t"
                      >
                        See more ({searchResults.length - INITIAL_RESULTS_COUNT} more)
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="hidden md:block bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setIsAdding(!isAdding)}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Add Stock
                </button>

                {selectedItems.size > 0 && (
                  <button
                    onClick={handleBulkRemove}
                    className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove ({selectedItems.size})
                  </button>
                )}

                <button
                  onClick={exportWatchlist}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Export
                </button>

                <button
                  onClick={() => updatePrices(watchlist)}
                  disabled={refreshing}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
                  Refresh
                </button>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as FilterType)}
                  className="px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
                >
                  <option value="all">All</option>
                  <option value="gainers">Gainers</option>
                  <option value="losers">Losers</option>
                  <option value="alerts">With Alerts</option>
                  <option value="targets">With Targets</option>
                </select>

                <select
                  value={sortField}
                  onChange={(e) => setSortField(e.target.value as SortField)}
                  className="px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
                >
                  <option value="dateAdded">Date Added</option>
                  <option value="symbol">Symbol</option>
                  <option value="price">Price</option>
                  <option value="change">Change</option>
                  <option value="changePercent">Change %</option>
                  <option value="targetPrice">Target Price</option>
                </select>

                <button
                  onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                  className="p-2 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <ArrowUpDown className="h-4 w-4" />
                </button>

                {filteredAndSorted.length > 0 && (
                  <button
                    onClick={toggleSelectAll}
                    className="p-2 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    title="Select All"
                  >
                    {selectedItems.size === filteredAndSorted.length ? (
                      <CheckSquare className="h-4 w-4" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {filteredAndSorted.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
              <div className="text-gray-400 dark:text-gray-500 mb-2">
                <TrendingUp className="h-12 w-12 mx-auto opacity-50" />
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {filterType !== 'all' ? 'No items match the current filter.' : 'No stocks in watchlist yet'}
              </p>
              {filterType === 'all' && (
                <button 
                  onClick={() => setIsAdding(true)}
                  className="mt-4 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Add your first stock
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Mobile: Clean list with dividers */}
              <div className="md:hidden bg-white dark:bg-gray-800 rounded-xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-700/50">
                {filteredAndSorted.map((item) => (
                  <WatchlistItemCard key={item.symbol} item={item} />
                ))}
              </div>
              
              {/* Desktop: Card grid */}
              <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAndSorted.map((item) => (
                  <WatchlistItemCard key={item.symbol} item={item} />
                ))}
              </div>
            </>
          )}

          {showAlertModal && (
            <AlertModal
              isOpen={showAlertModal}
              onClose={() => {
                setShowAlertModal(false);
                setAlertSymbol('');
              }}
              symbol={alertSymbol}
              currentPrice={watchlist.find(w => w.symbol === alertSymbol)?.currentPrice || 0}
              existingAlerts={alerts.filter(a => a.symbol === alertSymbol)}
              onSave={handleSaveAlert}
              onDelete={handleDeleteAlert}
            />
          )}

          {showTargetModal && (
            <TargetPriceModal
              isOpen={showTargetModal}
              onClose={() => {
                setShowTargetModal(false);
                setTargetSymbol('');
              }}
              symbol={targetSymbol}
              currentPrice={watchlist.find(w => w.symbol === targetSymbol)?.currentPrice || 0}
              existingTarget={watchlist.find(w => w.symbol === targetSymbol)?.targetPrice}
              onSave={(price) => handleSaveTarget(targetSymbol, price)}
            />
          )}

          {/* Remove Toast with Undo */}
          <DeleteToast
            item={removedItem}
            itemId={removedItem?.symbol}
            title={removedCount > 1 ? `${removedCount} items removed` : 'Item removed'}
            subtitle={removedCount > 1 ? 'from watchlist' : removedItem ? `${removedItem.symbol} • ${removedItem.name || 'Watchlist'}` : undefined}
            count={removedCount > 1 ? removedCount : undefined}
            onUndo={handleUndoRemove}
            onClose={handleCloseToast}
          />
        </div>
        )}
      </main>
    </div>
  );
}
