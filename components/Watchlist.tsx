'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Plus, X, TrendingUp, TrendingDown, Bell, Target, FileText, 
  Filter, ArrowUpDown, Grid, List, Table, RefreshCw, Download,
  Upload, Trash2, CheckSquare, Square, BarChart3, Eye, EyeOff,
  AlertCircle, TrendingDown as TrendingDownIcon, TrendingUp as TrendingUpIcon,
  DollarSign, Calendar, Tag, Search, Settings2, MoreVertical
} from 'lucide-react';
import { WatchlistItem, Alert, Portfolio } from '@/types';
import { getStockPriceData, searchStocks, getHistoricalData } from '@/lib/stockService';
import { getWatchlist, saveWatchlist, getAlerts, saveAlerts, getPortfolios } from '@/lib/storage';
import { formatCurrency, formatPercent, getColorForValue, cn } from '@/lib/utils';
import { LineChart, Line, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts';
import AlertModal from './AlertModal';
import TargetPriceModal from './TargetPriceModal';
import NotesModal from './NotesModal';

type SortField = 'symbol' | 'price' | 'change' | 'changePercent' | 'targetPrice' | 'dateAdded';
type FilterType = 'all' | 'gainers' | 'losers' | 'alerts' | 'targets' | 'notes';

interface WatchlistStats {
  totalItems: number;
  totalValue: number;
  avgChange: number;
  topGainer: WatchlistItem | null;
  topLoser: WatchlistItem | null;
  itemsWithAlerts: number;
  itemsNearTarget: number;
}

export default function Watchlist() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
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
  const [editingItem, setEditingItem] = useState<WatchlistItem | null>(null);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertSymbol, setAlertSymbol] = useState<string>('');
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [targetSymbol, setTargetSymbol] = useState<string>('');
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [notesSymbol, setNotesSymbol] = useState<string>('');

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
              // Only update if price actually changed
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
        // Small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      // Only update state if there were actual changes (don't save to DB on auto-refresh)
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
              // Only update if price actually changed
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
        // Small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      // Only update state and save if there were actual changes
      if (hasChanges) {
        setWatchlist(updated);
        try {
          await saveWatchlist(updated);
        } catch (error) {
          console.error('Error saving watchlist after price update:', error);
          // Don't revert - prices are updated in UI even if save fails
        }
      }
    } finally {
      setRefreshing(false);
    }
  }, [watchlist, refreshing]);

  const loadSparklines = useCallback(async (items: WatchlistItem[]) => {
    const data: Record<string, { intraday: any[]; previousClose: number }> = {};
    
    // Load intraday sparklines for all items (but with a delay to respect rate limits)
    for (const item of items) {
      try {
        // Fetch intraday data (today's price movement)
        const histData = await getHistoricalData(item.symbol, 1, '1d', true);
        
        // Fetch yesterday's closing price (1 day of daily data)
        let previousClose = item.currentPrice;
        try {
          const dailyData = await getHistoricalData(item.symbol, 1, '1d', false);
          if (dailyData.length > 0) {
            // Get the last data point which should be yesterday's close
            previousClose = dailyData[dailyData.length - 1].price;
          }
        } catch (error) {
          // If we can't get yesterday's close, calculate it from current price and change
          // previousClose = currentPrice / (1 + changePercent/100)
          if (item.changePercent !== undefined) {
            previousClose = item.currentPrice / (1 + item.changePercent / 100);
          }
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
        // Small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Failed to load sparkline for ${item.symbol}:`, error);
      }
    }
    
    setSparklineData(prev => ({ ...prev, ...data }));
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [loadedWatchlist, loadedAlerts, loadedPortfolios] = await Promise.all([
        getWatchlist(),
        getAlerts(),
        getPortfolios()
      ]);
      setWatchlist(loadedWatchlist);
      setAlerts(loadedAlerts);
      setPortfolios(loadedPortfolios);
      
      // Don't update prices on initial load - let auto-refresh handle it
      // This prevents constant state updates
      
      // Load sparkline data for visible items
      if (loadedWatchlist.length > 0) {
        loadSparklines(loadedWatchlist);
      }
    } catch (error) {
      console.error('Error loading watchlist data:', error);
    }
  }, [loadSparklines]);

  // Load data
  useEffect(() => {
    loadData();
  }, [loadData]);


  // Auto-refresh - only refresh prices, don't save to DB on every refresh
  useEffect(() => {
    if (!autoRefresh || watchlist.length === 0) return;
    
    const interval = setInterval(() => {
      // Only update prices in memory, don't save to DB on auto-refresh
      // This prevents constant DB writes and state flickering
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
      // Small delay to ensure the input is rendered
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
      return diff <= 0.05; // Within 5%
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

    // Apply filters
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
      case 'notes':
        filtered = filtered.filter(item => item.notes && item.notes.trim() !== '');
        break;
    }

    // Apply sorting
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
    // Double check - prevent duplicate adds
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
        
        // Check again before adding (race condition protection)
        if (watchlist.some(w => w.symbol === symbol)) {
          alert(`${symbol} is already in your watchlist`);
          return;
        }
        
        const updated = [...watchlist, newItem];
        // Optimistic update
        setWatchlist(updated);
        setSearchQuery('');
        setSearchResults([]);
        setIsAdding(false);
        
        try {
          await saveWatchlist(updated);
          // Load sparkline for new item after successful save
          loadSparklines([newItem]);
        } catch (error) {
          console.error('Error saving watchlist:', error);
          // Revert on error
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
    if (!confirm(`Remove ${selectedItems.size} item(s) from watchlist?`)) return;
    
    const updated = watchlist.filter(w => !selectedItems.has(w.symbol));
    setWatchlist(updated);
    await saveWatchlist(updated);
    setSelectedItems(new Set());
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
        if (next.size < 4) { // Max 4 items to compare
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
    // Optimistic update
    setWatchlist(updated);
    setShowTargetModal(false);
    
    try {
      await saveWatchlist(updated);
    } catch (error) {
      console.error('Error saving target price:', error);
      alert(`Error saving target price: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Revert on error
      setWatchlist(watchlist);
      setShowTargetModal(true);
    }
  };

  const handleSetNotes = (symbol: string) => {
    setNotesSymbol(symbol);
    setShowNotesModal(true);
  };

  const handleSaveNotes = async (symbol: string, notes: string) => {
    const updated = watchlist.map(item =>
      item.symbol === symbol ? { ...item, notes: notes.trim() || undefined } : item
    );
    // Optimistic update
    setWatchlist(updated);
    setShowNotesModal(false);
    
    try {
      await saveWatchlist(updated);
    } catch (error) {
      console.error('Error saving notes:', error);
      alert(`Error saving notes: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Revert on error
      setWatchlist(watchlist);
      setShowNotesModal(true);
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
      ['Symbol', 'Name', 'Current Price', 'Change', 'Change %', 'Target Price', 'Notes', 'Date Added'].join(','),
      ...watchlist.map(item => [
        item.symbol,
        `"${item.name}"`,
        item.currentPrice,
        item.change,
        item.changePercent,
        item.targetPrice || '',
        `"${(item.notes || '').replace(/"/g, '""')}"`,
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

  // Mini Sparkline Component - Intraday Chart
  const MiniSparkline = ({ symbol, data, currentPrice, changePercent }: { symbol: string; data: { intraday: any[]; previousClose: number } | any[]; currentPrice: number; changePercent: number }) => {
    // Handle both old format (array) and new format (object with intraday and previousClose)
    const intradayData = Array.isArray(data) ? data : (data?.intraday || []);
    const previousClose = Array.isArray(data) ? (data[0]?.price || currentPrice) : (data?.previousClose || currentPrice);
    
    if (!intradayData || intradayData.length === 0) return null;
    
    const chartData = intradayData.map((d, i) => ({ 
      index: i, 
      value: d.price,
    }));
    
    // Use yesterday's closing price as the reference line
    // Use the actual currentPrice prop to ensure consistency with displayed price
    const isPositive = currentPrice >= previousClose;
    
    const min = Math.min(...chartData.map(d => d.value), previousClose, currentPrice);
    const max = Math.max(...chartData.map(d => d.value), previousClose, currentPrice);
    const range = max - min || 1;
    // Calculate where the previousClose line falls in the range (0-100%)
    const rangePercent = range > 0 ? ((previousClose - min) / range) * 100 : 50;
    
    return (
      <ResponsiveContainer width="100%" height={40}>
        <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
          <defs>
            <linearGradient id={`gradient-${symbol}`} x1="0" y1="0" x2="0" y2="1">
              {/* Green above the reference line, red below - transition at the reference line */}
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.2} />
              <stop offset={`${Math.max(0, Math.min(100, rangePercent - 1))}%`} stopColor="#10b981" stopOpacity={0.2} />
              <stop offset={`${Math.max(0, Math.min(100, rangePercent))}%`} stopColor="#6b7280" stopOpacity={0.1} />
              <stop offset={`${Math.max(0, Math.min(100, rangePercent + 1))}%`} stopColor="#ef4444" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#ef4444" stopOpacity={0.2} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            fill={`url(#gradient-${symbol})`}
            stroke="none"
          />
          {/* Reference line for yesterday's closing price */}
          <ReferenceLine 
            y={previousClose} 
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

  // Statistics Cards
  const StatsCards = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-500 dark:text-gray-400">Total Items</div>
        <div className="text-lg font-semibold">{stats.totalItems}</div>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-500 dark:text-gray-400">Avg Change</div>
        <div className={cn('text-lg font-semibold', getColorForValue(stats.avgChange))}>
          {formatPercent(stats.avgChange)}
        </div>
      </div>
      {stats.topGainer && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400">Top Gainer</div>
          <div className="text-sm font-medium">{stats.topGainer.symbol}</div>
          <div className={cn('text-xs', getColorForValue(stats.topGainer.changePercent))}>
            {formatPercent(stats.topGainer.changePercent)}
          </div>
        </div>
      )}
      {stats.topLoser && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400">Top Loser</div>
          <div className="text-sm font-medium">{stats.topLoser.symbol}</div>
          <div className={cn('text-xs', getColorForValue(stats.topLoser.changePercent))}>
            {formatPercent(stats.topLoser.changePercent)}
          </div>
        </div>
      )}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-500 dark:text-gray-400">Alerts</div>
        <div className="text-lg font-semibold">{stats.itemsWithAlerts}</div>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-500 dark:text-gray-400">Near Target</div>
        <div className="text-lg font-semibold">{stats.itemsNearTarget}</div>
      </div>
    </div>
  );

  // Watchlist Item Card (List View)
  const WatchlistItemCard = ({ item }: { item: WatchlistItem }) => {
    const itemAlerts = getItemAlerts(item.symbol);
    const isSelected = selectedItems.has(item.symbol);
    const isComparing = comparingItems.has(item.symbol);
    const sparkline = sparklineData[item.symbol];
    const hasTarget = item.targetPrice !== undefined;
    const targetProgress = hasTarget && item.targetPrice! > 0
      ? Math.min(100, (item.currentPrice / item.targetPrice!) * 100)
      : null;

    // Swipe gesture state
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
      // Limit swipe to reasonable range
      const maxSwipe = 100;
      setSwipeOffset(Math.max(-maxSwipe, Math.min(maxSwipe, diff)));
    };

    const handleTouchEnd = () => {
      if (touchStartRef.current === null) return;
      const threshold = 50;
      
      if (swipeOffset < -threshold) {
        // Swipe left = Remove (red)
        handleRemove(item.symbol);
      } else if (swipeOffset > threshold) {
        // Swipe right = Compare (gray)
        toggleCompare(item.symbol);
      }
      
      setSwipeOffset(0);
      setIsSwiping(false);
      touchStartRef.current = null;
    };

    return (
      <div className="relative overflow-visible h-full">
        {/* Action indicators behind the card */}
        {/* Left swipe reveals red Remove on the right */}
        <div className={cn(
          'absolute right-0 top-0 bottom-0 w-20 bg-red-600 flex items-center justify-center text-white font-semibold rounded-r-lg transition-opacity duration-200 z-0 pointer-events-none',
          swipeOffset < -20 ? 'opacity-100' : 'opacity-0'
        )}>
          Remove
        </div>
        {/* Right swipe reveals gray Compare on the left */}
        <div className={cn(
          'absolute left-0 top-0 bottom-0 w-20 bg-gray-500 flex items-center justify-center text-white font-semibold rounded-l-lg transition-opacity duration-200 z-0 pointer-events-none',
          swipeOffset > 20 ? 'opacity-100' : 'opacity-0'
        )}>
          Compare
        </div>

        {/* Card that moves over the indicators */}
        <div className={cn(
          'bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md relative z-10',
          isSelected && 'ring-2 ring-blue-500 border-blue-500',
          isComparing && 'ring-2 ring-green-500 border-green-500'
        )}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(${swipeOffset}px)`,
          transition: isSwiping ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}>
          <div className="p-4">
          {/* Header: Symbol, Graph, Price, Change - All in one row */}
          <div className="flex items-center gap-3 mb-3">
            {selectedItems.size > 0 && (
              <button
                onClick={() => toggleSelect(item.symbol)}
                className="flex-shrink-0 transition-opacity hover:opacity-70"
              >
                {isSelected ? (
                  <CheckSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                ) : (
                  <Square className="h-4 w-4 text-gray-400" />
                )}
              </button>
            )}
            
            {/* Symbol and Icons - Clickable on mobile */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <h3 className="font-bold text-base text-gray-900 dark:text-gray-100">{item.symbol}</h3>
              <div className="flex items-center gap-1">
                {/* Alert icon - clickable on mobile */}
                <button
                  onClick={() => handleSetAlert(item.symbol)}
                  className="md:pointer-events-none relative group"
                  title={itemAlerts.length > 0 ? `Alert: ${itemAlerts.map(a => {
                    if (a.type === 'price_above') return `Above ${formatCurrency(a.value)}`;
                    if (a.type === 'price_below') return `Below ${formatCurrency(a.value)}`;
                    return `Change ${a.value >= 0 ? '+' : ''}${formatPercent(a.value)}`;
                  }).join(', ')}` : 'Set Alert'}
                >
                  {itemAlerts.length > 0 ? (
                    <>
                      <Bell className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500 dark:text-yellow-400 dark:fill-yellow-400" />
                      {/* Tooltip showing alert details on hover (desktop) */}
                      <div className="hidden md:block absolute left-0 top-full mt-1 p-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none z-50 whitespace-nowrap transition-opacity">
                        {itemAlerts.map(a => {
                          if (a.type === 'price_above') return `Alert: Above ${formatCurrency(a.value)}`;
                          if (a.type === 'price_below') return `Alert: Below ${formatCurrency(a.value)}`;
                          return `Alert: Change ${a.value >= 0 ? '+' : ''}${formatPercent(a.value)}`;
                        }).join(', ')}
                      </div>
                    </>
                  ) : (
                    <Bell className="h-3.5 w-3.5 text-gray-400 opacity-50 md:opacity-0" />
                  )}
                </button>
                {/* Target icon - clickable on mobile */}
                <button
                  onClick={() => handleSetTarget(item.symbol)}
                  className="md:pointer-events-none"
                >
                  <Target className={cn(
                    'h-3.5 w-3.5',
                    hasTarget 
                      ? (targetProgress && targetProgress >= 95 ? 'text-green-500 dark:text-green-400' : 'text-blue-500 dark:text-blue-400')
                      : 'text-gray-400 opacity-50 md:opacity-0'
                  )} />
                </button>
                {isInPortfolio(item.symbol) && (
                  <span className="text-[9px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-1 py-0.5 rounded font-medium">
                    P
                  </span>
                )}
              </div>
            </div>

            {/* Sparkline Graph */}
            <div className="flex-1 min-w-0 h-10">
              {sparkline && (Array.isArray(sparkline) ? sparkline.length > 0 : sparkline.intraday?.length > 0) ? (
                <MiniSparkline 
                  symbol={item.symbol} 
                  data={sparkline} 
                  currentPrice={item.currentPrice}
                  changePercent={item.changePercent}
                />
              ) : (
                <div className="h-full bg-gray-50 dark:bg-gray-900/50 rounded flex items-center justify-center">
                  <span className="text-[10px] text-gray-400">Loading...</span>
                </div>
              )}
            </div>

            {/* Price and Change */}
            <div className="text-right flex-shrink-0">
              <div className="text-base font-bold text-gray-900 dark:text-gray-100">
                {formatCurrency(item.currentPrice)}
              </div>
              <div className={cn(
                'text-xs font-semibold flex items-center justify-end gap-0.5',
                getColorForValue(item.changePercent)
              )}>
                {item.changePercent >= 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {formatPercent(item.changePercent)}
              </div>
            </div>
          </div>

          {/* Company name - hidden on mobile */}
          <p className="hidden md:block text-xs text-gray-600 dark:text-gray-400 truncate mb-3">{item.name}</p>

          {/* Target Progress (if exists) */}
          {hasTarget && (
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-600 dark:text-gray-400">Target</span>
                <span className={cn(
                  'font-semibold',
                  targetProgress && targetProgress >= 95 ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'
                )}>
                  {targetProgress ? `${targetProgress.toFixed(0)}%` : 'N/A'}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-300',
                    targetProgress && targetProgress >= 95 ? 'bg-green-500' : 'bg-blue-500'
                  )}
                  style={{ width: `${Math.min(100, targetProgress || 0)}%` }}
                />
              </div>
            </div>
          )}

          {/* Action Buttons - Hidden on mobile, shown on desktop */}
          <div className="hidden md:flex items-center gap-1.5 pt-2 border-t border-gray-100 dark:border-gray-700">
            <button
              onClick={() => handleSetAlert(item.symbol)}
              className="flex-1 text-[10px] font-medium px-2 py-1.5 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 rounded-md hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors"
            >
              Alert
            </button>
            <button
              onClick={() => handleSetTarget(item.symbol)}
              className="flex-1 text-[10px] font-medium px-2 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
            >
              Target
            </button>
            <button
              onClick={() => toggleCompare(item.symbol)}
              className={cn(
                'flex-1 text-[10px] font-medium px-2 py-1.5 rounded-md transition-colors',
                isComparing 
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30'
                  : 'bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
              )}
              disabled={!isComparing && comparingItems.size >= 4}
            >
              Compare
            </button>
            <button
              onClick={() => handleRemove(item.symbol)}
              className="flex-1 text-[10px] font-medium px-2 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
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
                {formatPercent(item.changePercent)}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with title and mobile buttons */}
      <div className="flex items-center justify-between mb-4 md:mb-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">Watchlist</h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">Track stocks you&apos;re interested in</p>
        </div>
        {/* Mobile: Icon-only buttons beside heading */}
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

      {/* Statistics */}
      <StatsCards />

      {/* Comparison View */}
      <ComparisonView />

      {/* Search - Visible on both mobile and desktop when adding */}
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

      {/* Controls - Hidden on mobile, shown on desktop */}
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

            {/* Filter */}
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
              <option value="notes">With Notes</option>
            </select>

            {/* Sort */}
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

            {/* Select All */}
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

      {/* Watchlist Items */}
      {filteredAndSorted.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400">
            {filterType !== 'all' ? 'No items match the current filter.' : 'No stocks in watchlist. Add some to track them!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-visible">
          {filteredAndSorted.map((item) => (
            <WatchlistItemCard key={item.symbol} item={item} />
          ))}
        </div>
      )}

      {/* Modals */}
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

      {showNotesModal && (
        <NotesModal
          isOpen={showNotesModal}
          onClose={() => {
            setShowNotesModal(false);
            setNotesSymbol('');
          }}
          symbol={notesSymbol}
          existingNotes={watchlist.find(w => w.symbol === notesSymbol)?.notes}
          onSave={(notes) => handleSaveNotes(notesSymbol, notes)}
        />
      )}
    </div>
  );
}
