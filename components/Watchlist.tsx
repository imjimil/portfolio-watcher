'use client';

import { useState, useEffect } from 'react';
import { Plus, X, TrendingUp, TrendingDown } from 'lucide-react';
import { WatchlistItem } from '@/types';
import { getStockData, getStockPriceData, searchStocks } from '@/lib/stockService';
import { getWatchlist, saveWatchlist } from '@/lib/storage';
import { formatCurrency, formatPercent, getColorForValue, cn } from '@/lib/utils';

export default function Watchlist() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAllResults, setShowAllResults] = useState(false);
  const INITIAL_RESULTS_COUNT = 8; // Show first 8 results initially

  useEffect(() => {
    const loaded = getWatchlist();
    setWatchlist(loaded);
    updatePrices(loaded);
  }, []);

  // Debounced search - only search after user stops typing for 500ms
  useEffect(() => {
    if (!isAdding) {
      setSearchResults([]);
      return;
    }

    if (searchQuery.length === 0) {
      setSearchResults([]);
      return;
    }

    // Minimum 2 characters to search
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await searchStocks(searchQuery);
        setSearchResults(results);
        setShowAllResults(false); // Reset when new search
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Search failed:', errorMessage);
        // Show error to user
        alert(`Search failed: ${errorMessage}`);
        setSearchResults([]);
      } finally {
        setLoading(false);
      }
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(timeoutId);
  }, [searchQuery, isAdding]);

  const updatePrices = async (items: WatchlistItem[]) => {
    // Update prices with delay between requests to respect Alpha Vantage rate limits
    // Free tier: 5 calls per minute = ~13 seconds between calls
    for (const item of items) {
      try {
        // Use getStockPriceData with existing name (only 1 API call per item)
        const stock = await getStockPriceData(item.symbol, item.name);
        if (stock && stock.currentPrice > 0) {
          setWatchlist(prev =>
            prev.map(w =>
              w.symbol === item.symbol
                ? {
                    ...w,
                    currentPrice: stock.currentPrice,
                    change: stock.change,
                    changePercent: stock.changePercent,
                  }
                : w
            )
          );
        }
      } catch (error) {
        // Silently fail for price updates - don't spam user with errors
        console.error(`Failed to update ${item.symbol}:`, error);
      }
      // Wait 13 seconds between requests to respect rate limits
      if (items.indexOf(item) < items.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 13000));
      }
    }
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
  };

  const handleAddToWatchlist = async (symbol: string, name: string) => {
    if (watchlist.some(w => w.symbol === symbol)) {
      return;
    }

    setLoading(true);
    try {
      // Use getStockPriceData with the name from search results (only 1 API call)
      const stock = await getStockPriceData(symbol, name);
      
      if (stock && stock.currentPrice > 0) {
        const newItem: WatchlistItem = {
          symbol: stock.symbol,
          name: stock.name,
          currentPrice: stock.currentPrice,
          change: stock.change,
          changePercent: stock.changePercent,
        };
        const updated = [...watchlist, newItem];
        setWatchlist(updated);
        saveWatchlist(updated);
        setSearchQuery('');
        setSearchResults([]);
        setIsAdding(false);
      } else {
        throw new Error(`Unable to fetch price data for ${symbol}. Please try again.`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Failed to add to watchlist:', error);
      
      // Show user-friendly error message
      if (errorMessage.includes('rate limit')) {
        alert('API rate limit reached. Please wait a moment and try again.');
      } else {
        alert(`Error: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = (symbol: string) => {
    const updated = watchlist.filter(w => w.symbol !== symbol);
    setWatchlist(updated);
    saveWatchlist(updated);
  };

  return (
    <div className="rounded-lg border bg-white dark:bg-gray-800 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base sm:text-lg font-semibold">Watchlist</h3>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          Add
        </button>
      </div>

      {isAdding && (
        <div className="mb-4 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search stocks (e.g., AAPL, MSFT) - Type at least 2 characters"
            className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {loading && (
            <div className="absolute right-3 top-2.5 text-sm text-gray-500">Searching...</div>
          )}
          {searchResults.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {(showAllResults ? searchResults : searchResults.slice(0, INITIAL_RESULTS_COUNT)).map((stock) => (
                <button
                  key={stock.symbol}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!loading && !watchlist.some(w => w.symbol === stock.symbol)) {
                      handleAddToWatchlist(stock.symbol, stock.name);
                    }
                  }}
                  disabled={loading || watchlist.some(w => w.symbol === stock.symbol)}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <div>
                    <div className="font-medium">{stock.symbol}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{stock.name}</div>
                  </div>
                  {watchlist.some(w => w.symbol === stock.symbol) && (
                    <span className="text-xs text-gray-500">Added</span>
                  )}
                  {loading && (
                    <span className="text-xs text-gray-500">Loading...</span>
                  )}
                </button>
              ))}
              {!showAllResults && searchResults.length > INITIAL_RESULTS_COUNT && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowAllResults(true);
                  }}
                  className="w-full px-4 py-2 text-center text-sm text-blue-600 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 border-t"
                >
                  See more ({searchResults.length - INITIAL_RESULTS_COUNT} more)
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {watchlist.length === 0 ? (
        <p className="text-center text-sm sm:text-base text-gray-500 dark:text-gray-400 py-6 sm:py-8">
          No stocks in watchlist. Add some to track them!
        </p>
      ) : (
        <div className="space-y-2">
          {watchlist.map((item) => (
            <div
              key={item.symbol}
              className="flex items-center justify-between p-2.5 sm:p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors gap-2"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="text-sm sm:text-base font-medium truncate">{item.symbol}</div>
                  <button
                    onClick={() => handleRemove(item.symbol)}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded flex-shrink-0"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">{item.name}</div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-sm sm:text-base font-medium">{formatCurrency(item.currentPrice)}</div>
                <div className={cn('text-xs sm:text-sm flex items-center gap-1', getColorForValue(item.changePercent))}>
                  {item.changePercent >= 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {formatPercent(item.changePercent)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

