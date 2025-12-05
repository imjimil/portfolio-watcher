'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Download, Search, ArrowUpDown, Trash2, X } from 'lucide-react';
import Navbar from '@/components/Navbar';
import TransactionHistory from '@/components/TransactionHistory';
import AddTransactionModal from '@/components/AddTransactionModal';
import PortfolioSwitcher from '@/components/PortfolioSwitcher';
import CreatePortfolioModal from '@/components/CreatePortfolioModal';
import DeleteTransactionModal from '@/components/DeleteTransactionModal';
import DeleteToast from '@/components/DeleteToast';
import { Portfolio, Transaction, Holding, Stock } from '@/types';
import { getPortfolios, getActivePortfolioId, getPortfolio, savePortfolio, updatePortfolioStats, setActivePortfolioId } from '@/lib/storage';
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
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [deletedTransaction, setDeletedTransaction] = useState<Transaction | null>(null);
  const [deletedTransactionPortfolio, setDeletedTransactionPortfolio] = useState<Portfolio | null>(null);
  
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

      // Update portfolio stats in DB (lightweight - no transaction sync)
      await updatePortfolioStats(portfolioToUse.id, {
        totalValue,
        totalCost,
        totalGainLoss,
        totalGainLossPercent,
      });

      // Update local state
      const updatedPortfolio: Portfolio = {
        ...portfolioToUse,
        holdings: calculatedHoldings,
        totalValue,
        totalCost,
        totalGainLoss,
        totalGainLossPercent,
        updatedAt: new Date().toISOString(),
      };
      
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

  const handleDeleteTransaction = (transactionId: string) => {
    if (!activePortfolio) return;

    // Find the transaction to show details in confirmation
    const transaction = activePortfolio.transactions.find(t => t.id === transactionId);
    if (!transaction) return;

    // Open confirmation modal
    setTransactionToDelete(transaction);
    setDeleteModalOpen(true);
  };

  const confirmDeleteTransaction = async () => {
    if (!activePortfolio || !transactionToDelete) return;

    // Store deleted transaction for undo
    setDeletedTransaction(transactionToDelete);
    setDeletedTransactionPortfolio(activePortfolio);

    const updatedPortfolio: Portfolio = {
      ...activePortfolio,
      transactions: activePortfolio.transactions.filter(t => t.id !== transactionToDelete.id),
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
      next.delete(transactionToDelete.id);
      return next;
    });

    // Close modal
    setDeleteModalOpen(false);
    setTransactionToDelete(null);
  };

  const handleUndoDelete = async () => {
    if (!deletedTransaction) return;

    // Get the current portfolio state (not the snapshot)
    const currentPortfolio = portfolios.find(p => p.id === deletedTransactionPortfolio?.id) || activePortfolio;
    if (!currentPortfolio) {
      setDeletedTransaction(null);
      setDeletedTransactionPortfolio(null);
      return;
    }

    // Check if transaction already exists (prevent duplicates)
    const transactionExists = currentPortfolio.transactions.some(t => t.id === deletedTransaction.id);
    if (transactionExists) {
      // Transaction already exists, just clear undo state
      setDeletedTransaction(null);
      setDeletedTransactionPortfolio(null);
      return;
    }

    // Insert transaction in chronological order (sorted by date)
    const updatedTransactions = [...currentPortfolio.transactions, deletedTransaction].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateA !== dateB) return dateA - dateB;
      // If same date, maintain insertion order for transactions on the same day
      return 0;
    });

    const updatedPortfolio: Portfolio = {
      ...currentPortfolio,
      transactions: updatedTransactions,
      updatedAt: new Date().toISOString(),
    };

    await savePortfolio(updatedPortfolio);
    setActivePortfolio(updatedPortfolio);
    setPortfolios(prev => prev.map(p => p.id === updatedPortfolio.id ? updatedPortfolio : p));
    lastTransactionHashRef.current = '';

    // Clear undo state AFTER all async operations complete
    // This ensures the toast stays visible until undo is fully complete
    setDeletedTransaction(null);
    setDeletedTransactionPortfolio(null);
  };

  const handleCloseToast = () => {
    setDeletedTransaction(null);
    setDeletedTransactionPortfolio(null);
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

  const handleCreatePortfolioWithTransactions = async (
    name: string, 
    importedTransactions: Omit<Transaction, 'id'>[], 
    description?: string
  ) => {
    const transactions: Transaction[] = importedTransactions.map(t => ({
      ...t,
      id: uuid(),
    }));

    const portfolioId = uuid();
    const newPortfolio: Portfolio = {
      id: portfolioId,
      name,
      description,
      holdings: [],
      transactions,
      totalValue: 0,
      totalCost: 0,
      totalGainLoss: 0,
      totalGainLossPercent: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await savePortfolio(newPortfolio);
    
    // Reload the portfolio from DB to get the saved transactions
    const savedPortfolio = await getPortfolio(portfolioId);
    if (!savedPortfolio) {
      throw new Error('Failed to load created portfolio');
    }
    
    // Reload all portfolios
    const updatedPortfolios = await getPortfolios();
    const portfoliosWithTransactions = await Promise.all(
      updatedPortfolios.map(async (p) => {
        if (p.id === portfolioId) {
          return savedPortfolio;
        }
        const fullPortfolio = await getPortfolio(p.id);
        return fullPortfolio || p;
      })
    );
    
    setPortfolios(portfoliosWithTransactions);
    setActivePortfolio(savedPortfolio);
    await setActivePortfolioId(portfolioId);
    // Reset hash to trigger holdings update
    lastTransactionHashRef.current = '';
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
      <main className="container mx-auto px-4 pt-2 pb-20 sm:pt-6 md:pb-6 max-w-7xl">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              {portfolios.length > 1 ? (
                <PortfolioSwitcher
                  portfolios={portfolios}
                  activePortfolioId={activePortfolio?.id || null}
                  onSelect={handleSelectPortfolio}
                  onCreateNew={() => setIsCreatePortfolioModalOpen(true)}
                />
              ) : (
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                  Activity
                </h1>
              )}
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {statistics.totalTransactions} transactions • {statistics.buyCount} buys, {statistics.sellCount} sells
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {activePortfolio && activePortfolio.transactions.length > 0 && (
                <button
                  onClick={() => {
                    const csv = exportTransactionsToCSV(activePortfolio.transactions);
                    downloadCSV(csv, `transactions-${new Date().toISOString().split('T')[0]}.csv`);
                  }}
                  className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  title="Export CSV"
                >
                  <Download className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </button>
              )}
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl hover:opacity-90 transition-opacity"
              >
                <span className="hidden sm:inline">Add Transaction</span>
                <span className="sm:hidden">Add</span>
              </button>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : activePortfolio && activePortfolio.transactions.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700/50 p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Total Spent
                  </p>
                  <p className="mt-1.5 text-lg sm:text-xl font-bold text-gray-900 dark:text-white tabular-nums truncate">
                    {formatCurrency(statistics.totalSpent)}
                  </p>
                </div>
                <div className="p-2 sm:p-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 flex-shrink-0">
                  <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 text-red-500 dark:text-red-400" />
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700/50 p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Total Received
                  </p>
                  <p className="mt-1.5 text-lg sm:text-xl font-bold text-gray-900 dark:text-white tabular-nums truncate">
                    {formatCurrency(statistics.totalReceived)}
                  </p>
                </div>
                <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex-shrink-0">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700/50 p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Cost Basis
                  </p>
                  <p className="mt-1.5 text-lg sm:text-xl font-bold text-gray-900 dark:text-white tabular-nums truncate">
                    {formatCurrency(statistics.costBasis)}
                  </p>
                </div>
                <div className="p-2 sm:p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex-shrink-0">
                  <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700/50 p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Trades
                  </p>
                  <p className="mt-1.5 text-lg sm:text-xl font-bold text-gray-900 dark:text-white tabular-nums">
                    {statistics.totalTransactions}
                  </p>
                </div>
                <div className="p-2 sm:p-2.5 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex-shrink-0">
                  <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters and Search */}
        {!loading && activePortfolio && activePortfolio.transactions.length > 0 && (
          <div className="mb-4 sm:mb-6 space-y-3">
            {/* Search Bar - Full Width */}
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
                className="w-full pl-10 pr-4 py-3 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filter Pills Row - Horizontal Scroll on Mobile */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
              {/* Type Filter Pills */}
              {(['all', 'buy', 'sell', 'dividend'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    setTypeFilter(type);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-all ${
                    typeFilter === type
                      ? type === 'buy' 
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                        : type === 'sell'
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                        : type === 'dividend'
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                        : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}

              {/* Divider */}
              <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 flex-shrink-0" />

              {/* Sort Pills */}
              {(['date', 'symbol', 'amount'] as SortField[]).map((field) => (
                <button
                  key={field}
                  onClick={() => handleSort(field)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-all flex items-center gap-1 ${
                    sortField === field
                      ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {field.charAt(0).toUpperCase() + field.slice(1)}
                  {sortField === field && (
                    <ArrowUpDown className={`h-3 w-3 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} />
                  )}
                </button>
              ))}

              {/* Clear if any filter active */}
              {(searchQuery || typeFilter !== 'all' || dateFrom || dateTo) && (
                <button
                  onClick={clearFilters}
                  className="px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all flex items-center gap-1"
                >
                  <X className="h-3 w-3" />
                  Clear
                </button>
              )}
            </div>

            {/* Results count */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {filteredAndSortedTransactions.length} {filteredAndSortedTransactions.length === 1 ? 'transaction' : 'transactions'}
              </p>
              {selectedTransactions.size > 0 && (
                <button
                  onClick={handleBulkDelete}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs font-medium"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete ({selectedTransactions.size})
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
                  className="px-4 py-2 text-sm font-medium border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 tabular-nums">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 text-sm font-medium border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
        onCreateWithTransactions={handleCreatePortfolioWithTransactions}
      />

      {/* Delete Confirmation Modal */}
      <DeleteTransactionModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setTransactionToDelete(null);
        }}
        onConfirm={confirmDeleteTransaction}
        transaction={transactionToDelete}
      />

      {/* Delete Toast with Undo */}
      <DeleteToast
        item={deletedTransaction}
        itemId={deletedTransaction?.id}
        title="Transaction deleted"
        subtitle={deletedTransaction ? `${deletedTransaction.symbol} • ${deletedTransaction.type}` : undefined}
        onUndo={handleUndoDelete}
        onClose={handleCloseToast}
      />
    </div>
  );
}
