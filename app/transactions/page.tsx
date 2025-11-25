'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Download, Search, Filter, ArrowUpDown, Trash2, X, CheckSquare, Square, Info } from 'lucide-react';
import Navbar from '@/components/Navbar';
import TransactionHistory from '@/components/TransactionHistory';
import AddTransactionModal from '@/components/AddTransactionModal';
import PortfolioSwitcher from '@/components/PortfolioSwitcher';
import CreatePortfolioModal from '@/components/CreatePortfolioModal';
import { Portfolio, Transaction, Holding, Stock } from '@/types';
import { getPortfolios, getActivePortfolioId, getPortfolio, savePortfolio, setActivePortfolioId } from '@/lib/storage';
import { getMultipleStocks, calculateHoldings } from '@/lib/stockService';
import { exportTransactionsToCSV, downloadCSV } from '@/lib/export';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp, TrendingDown, DollarSign, Activity } from 'lucide-react';
import SkeletonCard from '@/components/skeletons/SkeletonCard';
import SkeletonTransactionTable from '@/components/skeletons/SkeletonTransactionTable';

// Simple UUID generator
function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

type SortField = 'date' | 'symbol' | 'type' | 'amount';
type SortDirection = 'asc' | 'desc';

export default function TransactionsPage() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [activePortfolio, setActivePortfolio] = useState<Portfolio | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [stockData, setStockData] = useState<Record<string, Stock>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreatePortfolioModalOpen, setIsCreatePortfolioModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Filter and search states
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'buy' | 'sell' | 'dividend'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  // Sorting states
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  // Bulk selection
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Tooltip state
  const [openTooltip, setOpenTooltip] = useState<string | null>(null);

  // Refs to prevent infinite loops
  const isUpdatingRef = useRef(false);
  const lastTransactionHashRef = useRef<string>('');

  useEffect(() => {
    const loadPortfolio = async () => {
      try {
        const loadedPortfolios = await getPortfolios();
        // Load transactions for all portfolios
        const portfoliosWithTransactions = await Promise.all(
          loadedPortfolios.map(async (p) => {
            const fullPortfolio = await getPortfolio(p.id);
            return fullPortfolio || p;
          })
        );
        setPortfolios(portfoliosWithTransactions);
        
        const activeId = await getActivePortfolioId();
        const portfolio = activeId 
          ? portfoliosWithTransactions.find(p => p.id === activeId) || portfoliosWithTransactions[0]
          : portfoliosWithTransactions[0];
        
        if (portfolio) {
          setActivePortfolio(portfolio);
        }
      } catch (error) {
        console.error('Error loading portfolio:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPortfolio();
  }, []);

  // Close tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.tooltip-container')) {
        setOpenTooltip(null);
      }
    };

    if (openTooltip) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openTooltip]);

  const updateHoldings = async (portfolioOverride?: Portfolio) => {
    const portfolioToUse = portfolioOverride || activePortfolio;
    if (!portfolioToUse || isUpdatingRef.current) {
      return;
    }

    // Create a hash of transaction data to detect changes
    const currentHash = portfolioToUse.transactions
      .map(t => `${t.id}:${t.symbol}:${t.quantity}:${t.price}:${t.date}:${t.type}`)
      .sort()
      .join('|');
    
    // Skip if transactions haven't changed and we've already loaded
    if (currentHash === lastTransactionHashRef.current && holdings.length > 0 && !portfolioOverride) {
      return;
    }

    isUpdatingRef.current = true;
    lastTransactionHashRef.current = currentHash;

    try {
      const symbols = Array.from(
        new Set(portfolioToUse.transactions.map(t => t.symbol))
      );

      if (symbols.length === 0) {
        setHoldings([]);
        setStockData({});
        // Update portfolio with zero values
        const updatedPortfolio: Portfolio = {
          ...portfolioToUse,
          holdings: [],
          totalValue: 0,
          totalCost: 0,
          totalGainLoss: 0,
          totalGainLossPercent: 0,
          updatedAt: new Date().toISOString(),
        };
        await savePortfolio(updatedPortfolio);
        // Use functional update to avoid triggering useEffect
        setActivePortfolio(prev => {
          if (!prev || prev.id !== updatedPortfolio.id) return prev;
          return updatedPortfolio;
        });
        setPortfolios(prev => prev.map(p => p.id === updatedPortfolio.id ? updatedPortfolio : p));
        isUpdatingRef.current = false;
        return;
      }

      const stocks = await getMultipleStocks(symbols);
      const stockMap: Record<string, Stock> = {};
      stocks.forEach(stock => {
        stockMap[stock.symbol] = stock;
      });
      setStockData(stockMap);

      const currentPrices: Record<string, number> = {};
      stocks.forEach(stock => {
        currentPrices[stock.symbol] = stock.currentPrice;
      });

      const calculatedHoldings = calculateHoldings(
        portfolioToUse.transactions,
        currentPrices
      );
      setHoldings(calculatedHoldings);

      // Calculate portfolio totals
      const totalValue = calculatedHoldings.reduce((sum, h) => sum + h.currentValue, 0);
      const totalCost = calculatedHoldings.reduce((sum, h) => sum + h.totalCost, 0);
      const totalGainLoss = totalValue - totalCost;
      const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;

      // Update portfolio with new calculations
      const updatedPortfolio: Portfolio = {
        ...portfolioToUse,
        holdings: calculatedHoldings,
        totalValue,
        totalCost,
        totalGainLoss,
        totalGainLossPercent,
        updatedAt: new Date().toISOString(),
      };

      await savePortfolio(updatedPortfolio);
      
      // Use functional update to avoid triggering useEffect
      setActivePortfolio(prev => {
        if (!prev || prev.id !== updatedPortfolio.id) return prev;
        return updatedPortfolio;
      });
      setPortfolios(prev => prev.map(p => p.id === updatedPortfolio.id ? updatedPortfolio : p));
    } catch (error) {
      console.error('Error updating holdings:', error);
    } finally {
      isUpdatingRef.current = false;
    }
  };

  // Memoize transaction hash to use as dependency
  // Include transaction data in hash to detect content changes, not just ID changes
  const transactionHash = useMemo(() => {
    const transactions = activePortfolio?.transactions || [];
    if (!transactions.length) return '';
    // Create hash from transaction IDs and key data (symbol, quantity, price, date, type)
    // This ensures we detect when transaction content changes, not just when IDs change
    return transactions
      .map(t => `${t.id}:${t.symbol}:${t.quantity}:${t.price}:${t.date}:${t.type}`)
      .sort()
      .join('|');
  }, [activePortfolio?.transactions]);

  useEffect(() => {
    if (!activePortfolio) return;

    // Only update if transactions actually changed (hash is different) or if we haven't loaded yet
    if (transactionHash !== lastTransactionHashRef.current || holdings.length === 0) {
      updateHoldings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePortfolio?.id, transactionHash]);

  // Filter and sort transactions
  const filteredAndSortedTransactions = useMemo(() => {
    if (!activePortfolio) return [];

    let filtered = [...activePortfolio.transactions];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.symbol.toLowerCase().includes(query)
      );
    }

    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(t => t.type === typeFilter);
    }

    // Apply date range filter
    if (dateFrom) {
      filtered = filtered.filter(t => t.date >= dateFrom);
    }
    if (dateTo) {
      filtered = filtered.filter(t => t.date <= dateTo);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'date':
          aValue = new Date(a.date).getTime();
          bValue = new Date(b.date).getTime();
          break;
        case 'symbol':
          aValue = a.symbol;
          bValue = b.symbol;
          break;
        case 'type':
          aValue = a.type;
          bValue = b.type;
          break;
        case 'amount':
          aValue = a.quantity * a.price;
          bValue = b.quantity * b.price;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [activePortfolio, searchQuery, typeFilter, dateFrom, dateTo, sortField, sortDirection]);

  // Paginated transactions
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedTransactions.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedTransactions, currentPage]);

  const totalPages = Math.ceil(filteredAndSortedTransactions.length / itemsPerPage);

  // Calculate statistics
  const statistics = useMemo(() => {
    if (!activePortfolio) {
      return {
        totalSpent: 0,
        totalReceived: 0,
        netCashFlow: 0,
        costBasis: 0,
        buyCount: 0,
        sellCount: 0,
        dividendCount: 0,
        totalTransactions: 0,
      };
    }

    const transactions = activePortfolio.transactions;
    const totalSpent = transactions
      .filter(t => t.type === 'buy')
      .reduce((sum, t) => sum + (t.quantity * t.price) + (t.fees || 0), 0);
    
    const totalReceived = transactions
      .filter(t => t.type === 'sell' || t.type === 'dividend')
      .reduce((sum, t) => sum + (t.quantity * t.price) - (t.fees || 0), 0);

    // Calculate cost basis (total invested in current holdings)
    // This is total spent minus the cost basis of sold shares
    // For simplicity, we'll use the portfolio's totalCost which is already calculated
    const costBasis = activePortfolio.totalCost || 0;
    const netCashFlow = totalReceived - totalSpent;

    return {
      totalSpent,
      totalReceived,
      netCashFlow,
      costBasis,
      buyCount: transactions.filter(t => t.type === 'buy').length,
      sellCount: transactions.filter(t => t.type === 'sell').length,
      dividendCount: transactions.filter(t => t.type === 'dividend').length,
      totalTransactions: transactions.length,
    };
  }, [activePortfolio]);

  const handleSelectPortfolio = async (portfolioId: string) => {
    const portfolio = portfolios.find(p => p.id === portfolioId);
    if (portfolio) {
      setActivePortfolio(portfolio);
      await setActivePortfolioId(portfolioId);
      setSelectedTransactions(new Set());
      setCurrentPage(1);
    }
  };

  const handleAddTransaction = async (transactionData: Omit<Transaction, 'id'>, portfolioId: string) => {
    // Find the portfolio to add the transaction to
    const targetPortfolio = portfolios.find(p => p.id === portfolioId) || activePortfolio;
    if (!targetPortfolio) return;

    const newTransaction: Transaction = {
      ...transactionData,
      id: uuid(),
    };

    const updatedPortfolio: Portfolio = {
      ...targetPortfolio,
      transactions: [...targetPortfolio.transactions, newTransaction],
      updatedAt: new Date().toISOString(),
    };

    await savePortfolio(updatedPortfolio);
    
    // Update the portfolios array
    setPortfolios(prev => prev.map(p => p.id === updatedPortfolio.id ? updatedPortfolio : p));
    
    // If this is the active portfolio, update it
    if (targetPortfolio.id === activePortfolio?.id) {
      // Use functional update to avoid triggering useEffect unnecessarily
      setActivePortfolio(prev => {
        if (!prev || prev.id !== updatedPortfolio.id) return prev;
        return updatedPortfolio;
      });
      // Reset hash so updateHoldings will run in useEffect
      lastTransactionHashRef.current = '';
    }
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    if (!activePortfolio) return;

    const updatedPortfolio: Portfolio = {
      ...activePortfolio,
      transactions: activePortfolio.transactions.filter(t => t.id !== transactionId),
      updatedAt: new Date().toISOString(),
    };

    await savePortfolio(updatedPortfolio);
    // Use functional update to avoid triggering useEffect unnecessarily
    setActivePortfolio(prev => {
      if (!prev || prev.id !== updatedPortfolio.id) return prev;
      return updatedPortfolio;
    });
    // Update portfolios array
    setPortfolios(prev => prev.map(p => p.id === updatedPortfolio.id ? updatedPortfolio : p));
    // Reset hash so updateHoldings will run in useEffect
    lastTransactionHashRef.current = '';
    setSelectedTransactions(prev => {
      const next = new Set(prev);
      next.delete(transactionId);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (!activePortfolio || selectedTransactions.size === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedTransactions.size} transaction(s)?`)) {
      return;
    }

    const updatedPortfolio: Portfolio = {
      ...activePortfolio,
      transactions: activePortfolio.transactions.filter(t => !selectedTransactions.has(t.id)),
      updatedAt: new Date().toISOString(),
    };

    await savePortfolio(updatedPortfolio);
    // Use functional update to avoid triggering useEffect unnecessarily
    setActivePortfolio(prev => {
      if (!prev || prev.id !== updatedPortfolio.id) return prev;
      return updatedPortfolio;
    });
    // Update portfolios array
    setPortfolios(prev => prev.map(p => p.id === updatedPortfolio.id ? updatedPortfolio : p));
    // Reset hash so updateHoldings will run in useEffect
    lastTransactionHashRef.current = '';
    setSelectedTransactions(new Set());
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsModalOpen(true);
  };

  const handleUpdateTransaction = async (id: string, transactionData: Omit<Transaction, 'id'>) => {
    if (!activePortfolio) return;

    const updatedPortfolio: Portfolio = {
      ...activePortfolio,
      transactions: activePortfolio.transactions.map(t =>
        t.id === id ? { ...transactionData, id } : t
      ),
      updatedAt: new Date().toISOString(),
    };

    await savePortfolio(updatedPortfolio);
    // Update portfolios array first
    setPortfolios(prev => prev.map(p => p.id === updatedPortfolio.id ? updatedPortfolio : p));
    // Use functional update to avoid triggering useEffect unnecessarily
    setActivePortfolio(prev => {
      if (!prev || prev.id !== updatedPortfolio.id) return prev;
      return updatedPortfolio;
    });
    // Force updateHoldings to run immediately with updated portfolio data
    updateHoldings(updatedPortfolio);
  };

  const handleCreatePortfolio = async (name: string, description?: string) => {
    const newPortfolio: Portfolio = {
      id: uuid(),
      name,
      description,
      holdings: [],
      transactions: [],
      totalValue: 0,
      totalCost: 0,
      totalGainLoss: 0,
      totalGainLossPercent: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await savePortfolio(newPortfolio);
    const updatedPortfolios = await getPortfolios();
    const portfoliosWithTransactions = await Promise.all(
      updatedPortfolios.map(async (p) => {
        const fullPortfolio = await getPortfolio(p.id);
        return fullPortfolio || p;
      })
    );
    setPortfolios(portfoliosWithTransactions);
    setActivePortfolio(newPortfolio);
    await setActivePortfolioId(newPortfolio.id);
  };

  const toggleSelectTransaction = (id: string) => {
    setSelectedTransactions(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedTransactions.size === paginatedTransactions.length) {
      setSelectedTransactions(new Set());
    } else {
      setSelectedTransactions(new Set(paginatedTransactions.map(t => t.id)));
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setTypeFilter('all');
    setDateFrom('');
    setDateTo('');
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-7xl">
        {/* Header with Portfolio Switcher */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div className="flex-1">
              {portfolios.length > 1 ? (
                <PortfolioSwitcher
                  portfolios={portfolios}
                  activePortfolioId={activePortfolio?.id || null}
                  onSelect={handleSelectPortfolio}
                  onCreateNew={() => setIsCreatePortfolioModalOpen(true)}
                />
              ) : (
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
                  Transactions
                </h1>
              )}
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
                Manage your buy, sell, and dividend transactions
              </p>
            </div>
            <div className="flex gap-2">
              {activePortfolio && activePortfolio.transactions.length > 0 && (
                <button
                  onClick={() => {
                    const csv = exportTransactionsToCSV(activePortfolio.transactions);
                    downloadCSV(csv, `transactions-${new Date().toISOString().split('T')[0]}.csv`);
                  }}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Export CSV</span>
                  <span className="sm:hidden">Export</span>
                </button>
              )}
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <span>Add Transaction</span>
              </button>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : activePortfolio && activePortfolio.transactions.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="rounded-lg border bg-white dark:bg-gray-800 p-4 shadow-sm relative">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Spent</p>
                    <div className="relative tooltip-container">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenTooltip(openTooltip === 'totalSpent' ? null : 'totalSpent');
                        }}
                        className="focus:outline-none"
                      >
                        <Info className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help" />
                      </button>
                      {openTooltip === 'totalSpent' && (
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg z-10">
                          Total amount spent on all buy transactions, including fees
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                            <div className="border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="mt-2 text-xl font-bold text-gray-900 dark:text-gray-100">
                    {formatCurrency(statistics.totalSpent)}
                  </p>
                </div>
                <div className="rounded-full bg-red-100 dark:bg-red-900/30 p-3">
                  <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </div>
            <div className="rounded-lg border bg-white dark:bg-gray-800 p-4 shadow-sm relative">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Received</p>
                    <div className="relative tooltip-container">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenTooltip(openTooltip === 'totalReceived' ? null : 'totalReceived');
                        }}
                        className="focus:outline-none"
                      >
                        <Info className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help" />
                      </button>
                      {openTooltip === 'totalReceived' && (
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg z-10">
                          Total amount received from all sell and dividend transactions, minus fees
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                            <div className="border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="mt-2 text-xl font-bold text-gray-900 dark:text-gray-100">
                    {formatCurrency(statistics.totalReceived)}
                  </p>
                </div>
                <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-3">
                  <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>
            <div className="rounded-lg border bg-white dark:bg-gray-800 p-4 shadow-sm relative">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Cost Basis</p>
                    <div className="relative tooltip-container">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenTooltip(openTooltip === 'costBasis' ? null : 'costBasis');
                        }}
                        className="focus:outline-none"
                      >
                        <Info className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help" />
                      </button>
                      {openTooltip === 'costBasis' && (
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-56 p-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg z-10">
                          Total amount you&apos;ve invested in your current holdings. This is what you compare to Portfolio Value to calculate your gain/loss
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                            <div className="border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="mt-2 text-xl font-bold text-gray-900 dark:text-gray-100">
                    {formatCurrency(statistics.costBasis)}
                  </p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Total invested in current holdings
                  </p>
                </div>
                <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-3">
                  <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>
            <div className="rounded-lg border bg-white dark:bg-gray-800 p-4 shadow-sm relative">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Transactions</p>
                    <div className="relative tooltip-container">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenTooltip(openTooltip === 'totalTransactions' ? null : 'totalTransactions');
                        }}
                        className="focus:outline-none"
                      >
                        <Info className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help" />
                      </button>
                      {openTooltip === 'totalTransactions' && (
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg z-10">
                          Total number of transactions (buy, sell, and dividend) in this portfolio
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                            <div className="border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="mt-2 text-xl font-bold text-gray-900 dark:text-gray-100">
                    {statistics.totalTransactions}
                  </p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {statistics.buyCount} buys, {statistics.sellCount} sells, {statistics.dividendCount} dividends
                  </p>
                </div>
                <div className="rounded-full bg-purple-100 dark:bg-purple-900/30 p-3">
                  <Activity className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters and Search */}
        {!loading && activePortfolio && activePortfolio.transactions.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by symbol..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Type Filter */}
              <div className="flex gap-2">
                <select
                  value={typeFilter}
                  onChange={(e) => {
                    setTypeFilter(e.target.value as any);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Types</option>
                  <option value="buy">Buy</option>
                  <option value="sell">Sell</option>
                  <option value="dividend">Dividend</option>
                </select>
              </div>

              {/* Date Range */}
              <div className="flex gap-2">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="From"
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="To"
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Clear Filters */}
              {(searchQuery || typeFilter !== 'all' || dateFrom || dateTo) && (
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                >
                  <X className="h-4 w-4" />
                  Clear
                </button>
              )}
            </div>

            {/* Sort Options */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Sort by:</span>
              {(['date', 'symbol', 'type', 'amount'] as SortField[]).map((field) => (
                <button
                  key={field}
                  onClick={() => handleSort(field)}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors flex items-center gap-1 ${
                    sortField === field
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {field.charAt(0).toUpperCase() + field.slice(1)}
                  <ArrowUpDown className={`h-3 w-3 ${sortField === field && sortDirection === 'asc' ? 'rotate-180' : ''}`} />
                </button>
              ))}
            </div>

            {/* Results count and bulk actions */}
            <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Showing {paginatedTransactions.length} of {filteredAndSortedTransactions.length} transactions
              </div>
              {selectedTransactions.size > 0 && (
                <button
                  onClick={handleBulkDelete}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete {selectedTransactions.size} selected
                </button>
              )}
            </div>
          </div>
        )}

        {/* Transactions Table */}
        {loading ? (
          <SkeletonTransactionTable />
        ) : (
          <>
            <TransactionHistory
              transactions={paginatedTransactions}
              onDelete={handleDeleteTransaction}
              onEdit={handleEditTransaction}
              stockData={stockData}
              selectedTransactions={selectedTransactions}
              onToggleSelect={toggleSelectTransaction}
              onToggleSelectAll={toggleSelectAll}
              showSelectAll={paginatedTransactions.length > 0}
            />

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </main>

      <AddTransactionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTransaction(null);
        }}
        onAdd={handleAddTransaction}
        onEdit={handleUpdateTransaction}
        existingSymbols={holdings.map(h => h.symbol)}
        editingTransaction={editingTransaction}
        portfolios={portfolios}
        activePortfolioId={activePortfolio?.id || null}
      />

      <CreatePortfolioModal
        isOpen={isCreatePortfolioModalOpen}
        onClose={() => setIsCreatePortfolioModalOpen(false)}
        onCreate={handleCreatePortfolio}
      />
    </div>
  );
}
