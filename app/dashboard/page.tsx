'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Wallet, TrendingUp, TrendingDown, DollarSign, Activity, BarChart3, Download } from 'lucide-react';
import Navbar from '@/components/Navbar';
import StatCard from '@/components/StatCard';
import PortfolioChart from '@/components/PortfolioChart';
import AllocationChart from '@/components/AllocationChart';
import AddTransactionModal from '@/components/AddTransactionModal';
import CreatePortfolioModal from '@/components/CreatePortfolioModal';
import PortfolioSwitcher from '@/components/PortfolioSwitcher';
import SkeletonCard from '@/components/skeletons/SkeletonCard';
import SkeletonChartCard from '@/components/skeletons/SkeletonChartCard';
import SkeletonTransactionCard from '@/components/skeletons/SkeletonTransactionCard';
import SkeletonCollectiveStats from '@/components/skeletons/SkeletonCollectiveStats';
import { Portfolio, Transaction, Holding, Stock } from '@/types';
import {
  getPortfolios,
  getPortfolio,
  savePortfolio,
  getActivePortfolioId,
  setActivePortfolioId,
  getTransactions,
} from '@/lib/storage';
import {
  getMultipleStocks,
  getHistoricalData,
} from '@/lib/stockService';
import { calculateHoldings } from '@/lib/portfolioCalculator';
import { calculateHistoricalPortfolioValue } from '@/lib/historicalPortfolio';
import { formatCurrency } from '@/lib/utils';
import { exportPortfolioToCSV, downloadCSV } from '@/lib/export';
import { calculatePeriodPerformance } from '@/lib/portfolioPerformance';

// Simple UUID generator for client-side
function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function Dashboard() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [activePortfolio, setActivePortfolio] = useState<Portfolio | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [stockData, setStockData] = useState<Record<string, Stock>>({});
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [chartPeriod, setChartPeriod] = useState<'1d' | '5d' | '1m' | '6m' | 'ytd' | 'all'>('1m');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreatePortfolioModalOpen, setIsCreatePortfolioModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const isUpdatingRef = useRef(false);
  const lastTransactionHashRef = useRef<string>('');

  // Load portfolios function
  const loadPortfolios = useCallback(async () => {
    try {
      const loadedPortfolios = await getPortfolios();
      // Load transactions for all portfolios
      const portfoliosWithTransactions = await Promise.all(
        loadedPortfolios.map(async (p) => {
          const fullPortfolio = await getPortfolio(p.id);
          if (fullPortfolio) {
            return fullPortfolio;
          }
          // Fallback: if getPortfolio fails, still try to load transactions
          const transactions = await getTransactions(p.id);
          return {
            ...p,
            transactions: transactions || [],
          };
        })
      );
      setPortfolios(portfoliosWithTransactions);

      const activeId = await getActivePortfolioId();
      if (activeId) {
        const portfolio = portfoliosWithTransactions.find(p => p.id === activeId);
        if (portfolio) {
          setActivePortfolio(portfolio);
          // Reset hash to force recalculation
          lastTransactionHashRef.current = '';
        } else if (portfoliosWithTransactions.length > 0) {
          setActivePortfolio(portfoliosWithTransactions[0]);
          await setActivePortfolioId(portfoliosWithTransactions[0].id);
          lastTransactionHashRef.current = '';
        }
      } else if (portfoliosWithTransactions.length > 0) {
        setActivePortfolio(portfoliosWithTransactions[0]);
        await setActivePortfolioId(portfoliosWithTransactions[0].id);
        lastTransactionHashRef.current = '';
      } else {
        // Create default portfolio
        const defaultPortfolio: Portfolio = {
          id: uuid(),
          name: 'My Portfolio',
          holdings: [],
          transactions: [],
          totalValue: 0,
          totalCost: 0,
          totalGainLoss: 0,
          totalGainLossPercent: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await savePortfolio(defaultPortfolio);
        setPortfolios([defaultPortfolio]);
        setActivePortfolio(defaultPortfolio);
        await setActivePortfolioId(defaultPortfolio.id);
        lastTransactionHashRef.current = '';
      }
    } catch (error) {
      console.error('Error loading portfolios:', error);
      setLoading(false);
    }
  }, []);

  // Load portfolios on mount
  useEffect(() => {
    loadPortfolios();
  }, [loadPortfolios]);

  // Reload portfolios when page becomes visible (user navigates back from transactions page)
  useEffect(() => {
    let lastReloadTime = Date.now();
    const RELOAD_COOLDOWN = 500; // Prevent too frequent reloads

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !loading) {
        const now = Date.now();
        if (now - lastReloadTime > RELOAD_COOLDOWN) {
          lastReloadTime = now;
          loadPortfolios();
        }
      }
    };

    const handleFocus = () => {
      if (!loading) {
        const now = Date.now();
        if (now - lastReloadTime > RELOAD_COOLDOWN) {
          lastReloadTime = now;
          loadPortfolios();
        }
      }
    };

    // Also reload when component mounts (in case user navigated back via Next.js router)
    const handleMount = () => {
      if (!loading) {
        loadPortfolios();
      }
    };

    // Small delay to ensure we're checking after navigation
    const mountTimer = setTimeout(handleMount, 100);

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearTimeout(mountTimer);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [loadPortfolios, loading]);

  // Update portfolio when active portfolio changes
  const updatePortfolio = useCallback(async (portfolio: Portfolio) => {
    if (!portfolio || isUpdatingRef.current) {
      if (!portfolio) setLoading(false);
      return;
    }

    // Create a hash of transaction IDs to detect changes
    const transactionHash = portfolio.transactions.map(t => t.id).sort().join(',');
    
    // Skip if transactions haven't changed and we've already loaded
    if (transactionHash === lastTransactionHashRef.current && holdings.length > 0) {
      return;
    }

    isUpdatingRef.current = true;
    lastTransactionHashRef.current = transactionHash;
    setRefreshing(true);

    try {
      // Get unique symbols from transactions
      const symbols = Array.from(
        new Set(portfolio.transactions.map(t => t.symbol))
      );

      if (symbols.length === 0) {
        setHoldings([]);
        setStockData({});
        setHistoricalData([]);
        setRefreshing(false);
        setLoading(false);
        return;
      }

      // Fetch current stock prices
      const stocks = await getMultipleStocks(symbols);
      const stockMap: Record<string, Stock> = {};
      stocks.forEach(stock => {
        stockMap[stock.symbol] = stock;
      });
      setStockData(stockMap);

      // Calculate holdings
      const currentPrices: Record<string, number> = {};
      stocks.forEach(stock => {
        currentPrices[stock.symbol] = stock.currentPrice;
      });

      const calculatedHoldings = calculateHoldings(
        portfolio.transactions,
        currentPrices
      );
      setHoldings(calculatedHoldings);

      // Calculate portfolio totals
      const totalValue = calculatedHoldings.reduce((sum, h) => sum + h.currentValue, 0);
      const totalCost = calculatedHoldings.reduce((sum, h) => sum + h.totalCost, 0);
      const totalGainLoss = totalValue - totalCost;
      const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;

      // Update portfolio state - use functional update to avoid dependency issues
      setActivePortfolio(prev => {
        if (!prev || prev.id !== portfolio.id) return prev;
        return {
          ...prev,
          holdings: calculatedHoldings,
          totalValue,
          totalCost,
          totalGainLoss,
          totalGainLossPercent,
          updatedAt: new Date().toISOString(),
        };
      });

      // Save to storage
      const updatedPortfolio: Portfolio = {
        ...portfolio,
        holdings: calculatedHoldings,
        totalValue,
        totalCost,
        totalGainLoss,
        totalGainLossPercent,
        updatedAt: new Date().toISOString(),
      };
      await savePortfolio(updatedPortfolio);

      // Update the portfolios array with the updated portfolio
      setPortfolios(prev => prev.map(p => p.id === updatedPortfolio.id ? updatedPortfolio : p));

      // Historical data will be fetched when period changes
    } catch (error) {
      console.error('Error updating portfolio:', error);
    } finally {
      setRefreshing(false);
      setLoading(false);
      isUpdatingRef.current = false;
    }
  }, [holdings.length]);

  useEffect(() => {
    if (!activePortfolio) {
      setLoading(false);
      return;
    }

    const transactionHash = activePortfolio.transactions.map(t => t.id).sort().join(',');
    // Only update if transactions actually changed or if we haven't loaded yet
    if (transactionHash !== lastTransactionHashRef.current || holdings.length === 0) {
      updatePortfolio(activePortfolio);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePortfolio?.id, activePortfolio?.transactions.length]);

  // Fetch historical portfolio value when period or transactions change
  useEffect(() => {
    const fetchHistoricalPortfolioData = async () => {
      if (!activePortfolio || activePortfolio.transactions.length === 0) {
        setHistoricalData([]);
        return;
      }

      try {
        // Calculate actual portfolio value over time based on all holdings and transactions
        // This will properly account for when transactions occurred
        const histData = await calculateHistoricalPortfolioValue(
          activePortfolio.transactions,
          chartPeriod
        );
        
        setHistoricalData(histData);
      } catch (error) {
        console.error('Error fetching historical portfolio data:', error);
        setHistoricalData([]);
      }
    };

    fetchHistoricalPortfolioData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    chartPeriod, 
    activePortfolio?.id,
    // Use transaction hash to detect actual changes
    activePortfolio?.transactions.map(t => t.id).sort().join(',')
  ]);

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
    
    // If this is the active portfolio, update it
    if (targetPortfolio.id === activePortfolio?.id) {
      setActivePortfolio(updatedPortfolio);
      // Reset the hash so updatePortfolio will run
      lastTransactionHashRef.current = '';
      updatePortfolio(updatedPortfolio);
    }
    
    // Update the portfolios array with the updated portfolio (including new transaction)
    setPortfolios(prev => prev.map(p => p.id === updatedPortfolio.id ? updatedPortfolio : p));
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
    // Load transactions for all portfolios
    const portfoliosWithTransactions = await Promise.all(
      updatedPortfolios.map(async (p) => {
        const fullPortfolio = await getPortfolio(p.id);
        if (fullPortfolio) {
          return fullPortfolio;
        }
        // Fallback: if getPortfolio fails, still try to load transactions
        const transactions = await getTransactions(p.id);
        return {
          ...p,
          transactions: transactions || [],
        };
      })
    );
    setPortfolios(portfoliosWithTransactions);
    setActivePortfolio(newPortfolio);
    await setActivePortfolioId(newPortfolio.id);
    setLoading(false);
    // Reset the hash so updatePortfolio will run
    lastTransactionHashRef.current = '';
    updatePortfolio(newPortfolio);
  };

  const handleSelectPortfolio = async (portfolioId: string) => {
    const portfolio = await getPortfolio(portfolioId);
    if (portfolio) {
      setActivePortfolio(portfolio);
      // Update the portfolios array with the loaded portfolio (including transactions)
      setPortfolios(prev => prev.map(p => p.id === portfolioId ? portfolio : p));
      await setActivePortfolioId(portfolioId);
      // Reset the hash so updatePortfolio will run
      lastTransactionHashRef.current = '';
      updatePortfolio(portfolio);
    }
  };

  // Calculate collective stats across all portfolios
  const collectiveStats = portfolios.reduce(
    (acc, p) => ({
      totalValue: acc.totalValue + p.totalValue,
      totalCost: acc.totalCost + p.totalCost,
      totalGainLoss: acc.totalGainLoss + p.totalGainLoss,
      totalTransactions: acc.totalTransactions + (p.transactions?.length || 0),
    }),
    { totalValue: 0, totalCost: 0, totalGainLoss: 0, totalTransactions: 0 }
  );
  const collectiveGainLossPercent =
    collectiveStats.totalCost > 0
      ? (collectiveStats.totalGainLoss / collectiveStats.totalCost) * 100
      : 0;

  const portfolioStats = activePortfolio
    ? {
        totalValue: activePortfolio.totalValue,
        totalCost: activePortfolio.totalCost,
        totalGainLoss: activePortfolio.totalGainLoss,
        totalGainLossPercent: activePortfolio.totalGainLossPercent,
        dayChange: holdings.reduce((sum, h) => {
          const stock = stockData[h.symbol];
          return sum + (stock ? stock.change * h.quantity : 0);
        }, 0),
        dayChangePercent:
          activePortfolio.totalValue > 0
            ? (holdings.reduce((sum, h) => {
                const stock = stockData[h.symbol];
                return sum + (stock ? stock.change * h.quantity : 0);
              }, 0) /
                activePortfolio.totalValue) *
              100
            : 0,
      }
    : null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 overflow-x-hidden">
      <Navbar />
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-7xl">
        <>
          {/* Portfolio Header */}
          <div className="mb-4 sm:mb-6">
            <div className="flex items-center justify-between gap-2 sm:gap-4">
              <div className="min-w-0">
                {loading ? (
                  <div className="animate-pulse">
                    <div className="h-6 sm:h-8 lg:h-9 w-32 sm:w-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  </div>
                ) : (
                  <>
                    {portfolios.length > 0 ? (
                      <PortfolioSwitcher
                        portfolios={portfolios}
                        activePortfolioId={activePortfolio?.id || null}
                        onSelect={handleSelectPortfolio}
                        onCreateNew={() => setIsCreatePortfolioModalOpen(true)}
                      />
                    ) : (
                      <h2 className="text-lg sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100 truncate">
                        {activePortfolio?.name || 'My Portfolio'}
                      </h2>
                    )}
                  </>
                )}
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                {!loading && activePortfolio && (
                  <button
                    onClick={() => {
                      const csv = exportPortfolioToCSV(activePortfolio);
                      downloadCSV(csv, `portfolio-${activePortfolio.name}-${new Date().toISOString().split('T')[0]}.csv`);
                    }}
                    className="flex items-center justify-center p-2 sm:px-4 sm:py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Download className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="hidden sm:inline sm:ml-2">Export</span>
                  </button>
                )}
                <button
                  onClick={() => setIsModalOpen(true)}
                  disabled={loading}
                  className="flex items-center justify-center gap-1 px-2.5 sm:px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="sm:hidden">Add</span>
                  <span className="hidden sm:inline">Add Transaction</span>
                </button>
              </div>
            </div>
            {!loading && activePortfolio?.description && (
              <p className="hidden sm:block text-sm text-gray-600 dark:text-gray-400 mt-1">
                {activePortfolio.description}
              </p>
            )}
            {refreshing && (
              <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-2">
                <Activity className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                Refreshing...
              </div>
            )}
          </div>

          {/* Collective Performance (if multiple portfolios) */}
          {loading ? (
            <SkeletonCollectiveStats />
          ) : portfolios.length > 1 && (
            <div className="mb-4 sm:mb-6 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-3 sm:p-5">
              <div className="flex items-start justify-between gap-2 mb-3 sm:mb-4">
                <div>
                  <h3 className="text-sm sm:text-lg font-semibold text-gray-900 dark:text-white">
                    All Portfolios Combined
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    {portfolios.length} portfolios
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(collectiveStats.totalValue)}
                  </div>
                  <div className={`text-xs sm:text-sm font-medium ${
                    collectiveGainLossPercent >= 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {collectiveGainLossPercent >= 0 ? '+' : ''}
                    {collectiveGainLossPercent.toFixed(2)}%
                  </div>
                  <div className={`text-xs ${
                    collectiveStats.totalGainLoss >= 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {collectiveStats.totalGainLoss >= 0 ? '+' : ''}
                    {formatCurrency(collectiveStats.totalGainLoss)}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-xs sm:text-sm">
                <div>
                  <div className="text-gray-600 dark:text-gray-400">Total Cost</div>
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(collectiveStats.totalCost)}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600 dark:text-gray-400">Total Gain/Loss</div>
                  <div className={`font-semibold ${
                    collectiveStats.totalGainLoss >= 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {formatCurrency(collectiveStats.totalGainLoss)}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600 dark:text-gray-400">Transactions</div>
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {collectiveStats.totalTransactions}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600 dark:text-gray-400">Portfolios</div>
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {portfolios.length}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stats Grid */}
          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
              {[1, 2, 3, 4].map((i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : refreshing && activePortfolio && activePortfolio.transactions.length > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
              {[1, 2, 3, 4].map((i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : portfolioStats ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
              <StatCard
                title="Total Value"
                value={portfolioStats.totalValue}
                icon={Wallet}
              />
              <StatCard
                title="Total Cost"
                value={portfolioStats.totalCost}
                icon={DollarSign}
              />
              <StatCard
                title="Total Gain/Loss"
                value={portfolioStats.totalGainLoss}
                changePercent={portfolioStats.totalGainLossPercent}
                icon={portfolioStats.totalGainLoss >= 0 ? TrendingUp : TrendingDown}
              />
              <StatCard
                title="Day Change"
                value={portfolioStats.dayChange}
                changePercent={portfolioStats.dayChangePercent}
                icon={Activity}
              />
            </div>
          ) : null}

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-6 sm:mb-8">
              {/* Portfolio Performance Chart */}
              {loading ? (
                <SkeletonChartCard />
              ) : refreshing && activePortfolio && activePortfolio.transactions.length > 0 && historicalData.length > 0 ? (
                <SkeletonChartCard />
              ) : historicalData.length > 0 ? (
                <div className="rounded-lg border bg-white dark:bg-gray-800 p-3 sm:p-4 lg:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
                    <div className="flex-1">
                      <h3 className="text-base sm:text-lg font-semibold mb-2">Portfolio Performance</h3>
                      {/* Total Value */}
                      {activePortfolio?.totalValue !== undefined && (
                        <div className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">
                          {formatCurrency(activePortfolio.totalValue)}
                        </div>
                      )}
                      {/* Period Gain/Loss */}
                      {historicalData.length > 0 && activePortfolio && (
                        (() => {
                          const performance = calculatePeriodPerformance({
                            historicalData,
                            currentValue: activePortfolio.totalValue || 0,
                            currentCostBasis: activePortfolio.totalCost || 0,
                            transactions: activePortfolio.transactions || [],
                            selectedPeriod: chartPeriod,
                          });
                          
                          const isPositive = performance.periodGain >= 0;
                          
                          return (
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-sm sm:text-base font-medium ${
                                isPositive
                                  ? 'text-green-600 dark:text-green-400'
                                  : 'text-red-600 dark:text-red-400'
                              }`}>
                                {isPositive ? '+' : ''}
                                {formatCurrency(performance.periodGain)}
                              </span>
                              <span className={`text-sm sm:text-base font-medium ${
                                isPositive
                                  ? 'text-green-600 dark:text-green-400'
                                  : 'text-red-600 dark:text-red-400'
                              }`}>
                                ({isPositive ? '+' : ''}
                                {performance.periodGainPercent.toFixed(2)}%)
                              </span>
                            </div>
                          );
                        })()
                      )}
                    </div>
                    {/* Period selector - hidden on mobile, shown on desktop */}
                    <div className="hidden sm:flex flex-wrap gap-1.5 sm:gap-2">
                      {(['1d', '5d', '1m', '6m', 'ytd', 'all'] as const).map((period) => (
                        <button
                          key={period}
                          onClick={() => setChartPeriod(period)}
                          className={`px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors ${
                            chartPeriod === period
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                        >
                          {period.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                  <PortfolioChart 
                    data={historicalData} 
                    period={chartPeriod}
                    currentValue={activePortfolio?.totalValue}
                    costBasis={activePortfolio?.totalCost}
                    transactions={activePortfolio?.transactions || []}
                  />
                  {/* Period selector - shown on mobile, hidden on desktop */}
                  <div className="flex sm:hidden flex-wrap gap-1.5 justify-center mt-4">
                    {(['1d', '5d', '1m', '6m', 'ytd', 'all'] as const).map((period) => (
                      <button
                        key={period}
                        onClick={() => setChartPeriod(period)}
                        className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                          chartPeriod === period
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {period.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Allocation Chart and Recent Transactions - Side by side on mobile */}
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-3 sm:gap-6">
                {/* Allocation Chart */}
                {loading ? (
                  <SkeletonChartCard />
                ) : refreshing && holdings.length > 0 ? (
                  <SkeletonChartCard />
                ) : holdings.length > 0 ? (
                  <div className="rounded-lg border bg-white dark:bg-gray-800 p-2 sm:p-4 lg:p-6">
                    <h3 className="text-xs sm:text-base lg:text-lg font-semibold mb-2 sm:mb-3 lg:mb-4">Portfolio Allocation</h3>
                    <AllocationChart holdings={holdings} />
                  </div>
                ) : null}

                {/* Recent Transactions Summary */}
                {loading ? (
                  <SkeletonTransactionCard />
                ) : refreshing && activePortfolio && activePortfolio.transactions.length > 0 ? (
                  <SkeletonTransactionCard />
                ) : activePortfolio && activePortfolio.transactions.length > 0 ? (
                  <div className="rounded-lg border bg-white dark:bg-gray-800 p-2 sm:p-4 lg:p-6">
                    <h3 className="text-xs sm:text-base lg:text-lg font-semibold mb-2 sm:mb-3 lg:mb-4">Recent Transactions</h3>
                <div className="space-y-1.5 sm:space-y-2">
                  {activePortfolio.transactions
                    .slice(-3)
                    .reverse()
                    .map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between p-1.5 sm:p-2 lg:p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg gap-1.5 sm:gap-2"
                      >
                        <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-4 min-w-0 flex-1">
                          <div className="min-w-0">
                            <div className="text-xs sm:text-sm lg:text-base font-medium truncate">{transaction.symbol}</div>
                            <div className="text-[10px] sm:text-xs lg:text-sm text-gray-500 dark:text-gray-400">
                              {(() => {
                                const [year, month, day] = transaction.date.split('-').map(Number);
                                return new Date(year, month - 1, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                              })()}
                            </div>
                          </div>
                          <div className="text-[10px] sm:text-xs lg:text-sm flex-shrink-0">
                            <span
                              className={`px-1 sm:px-1.5 lg:px-2 py-0.5 rounded ${
                                transaction.type === 'buy'
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                  : transaction.type === 'sell'
                                  ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                  : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                              }`}
                            >
                              {transaction.type.toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-[10px] sm:text-xs lg:text-sm font-medium">
                            {transaction.quantity} @ {formatCurrency(transaction.price)}
                          </div>
                          <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                            {formatCurrency(transaction.quantity * transaction.price)}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
                  </div>
                ) : null}
              </div>
            </div>
        </>
      </main>

      <AddTransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddTransaction}
        existingSymbols={holdings.map(h => h.symbol)}
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

