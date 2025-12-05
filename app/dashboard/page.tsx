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
      <main className="container mx-auto px-4 pt-2 pb-20 sm:pt-6 md:pb-6 max-w-7xl">
        <>
          {/* Portfolio Header - Modern Fintech Style */}
          <div className="mb-4 sm:mb-6">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                {loading ? (
                  <div className="animate-pulse">
                    <div className="h-7 w-40 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
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
                      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate">
                        {activePortfolio?.name || 'My Portfolio'}
                      </h2>
                    )}
                  </>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {!loading && activePortfolio && (
                  <button
                    onClick={() => {
                      const csv = exportPortfolioToCSV(activePortfolio);
                      downloadCSV(csv, `portfolio-${activePortfolio.name}-${new Date().toISOString().split('T')[0]}.csv`);
                    }}
                    className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    title="Export"
                  >
                    <Download className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  </button>
                )}
                <button
                  onClick={() => setIsModalOpen(true)}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Add Transaction</span>
                  <span className="sm:hidden">Add</span>
                </button>
              </div>
            </div>
            {refreshing && (
              <div className="flex items-center gap-2 mt-3 text-sm text-gray-500">
                <Activity className="h-4 w-4 animate-spin" />
                <span>Updating prices...</span>
              </div>
            )}
          </div>

          {/* Collective Performance (if multiple portfolios) */}
          {loading ? (
            <SkeletonCollectiveStats />
          ) : portfolios.length > 1 && (
            <div className="mb-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl border border-blue-100 dark:border-blue-800/50 p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    All Portfolios
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {portfolios.length} portfolios combined
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tabular-nums">
                    {formatCurrency(collectiveStats.totalValue)}
                  </div>
                  <div className={`text-sm font-semibold tabular-nums ${
                    collectiveGainLossPercent >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-red-500 dark:text-red-400'
                  }`}>
                    {collectiveGainLossPercent >= 0 ? '+' : ''}
                    {formatCurrency(collectiveStats.totalGainLoss)} ({collectiveGainLossPercent >= 0 ? '+' : ''}{collectiveGainLossPercent.toFixed(2)}%)
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 sm:gap-3">
                <div className="bg-white/60 dark:bg-gray-800/50 rounded-xl p-2 sm:p-3 text-center">
                  <div className="text-[9px] sm:text-[10px] text-gray-500 uppercase tracking-wide font-medium">Cost</div>
                  <div className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white tabular-nums mt-0.5 truncate">
                    {formatCurrency(collectiveStats.totalCost)}
                  </div>
                </div>
                <div className="bg-white/60 dark:bg-gray-800/50 rounded-xl p-2 sm:p-3 text-center">
                  <div className="text-[9px] sm:text-[10px] text-gray-500 uppercase tracking-wide font-medium">Gain</div>
                  <div className={`text-xs sm:text-sm font-bold tabular-nums mt-0.5 truncate ${
                    collectiveStats.totalGainLoss >= 0 ? 'text-emerald-600' : 'text-red-500'
                  }`}>
                    {collectiveStats.totalGainLoss >= 0 ? '+' : ''}{formatCurrency(collectiveStats.totalGainLoss)}
                  </div>
                </div>
                <div className="bg-white/60 dark:bg-gray-800/50 rounded-xl p-2 sm:p-3 text-center">
                  <div className="text-[9px] sm:text-[10px] text-gray-500 uppercase tracking-wide font-medium">Trades</div>
                  <div className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white mt-0.5">
                    {collectiveStats.totalTransactions}
                  </div>
                </div>
                <div className="bg-white/60 dark:bg-gray-800/50 rounded-xl p-2 sm:p-3 text-center">
                  <div className="text-[9px] sm:text-[10px] text-gray-500 uppercase tracking-wide font-medium">Folios</div>
                  <div className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white mt-0.5">
                    {portfolios.length}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stats Grid - Modern Cards */}
          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
              {[1, 2, 3, 4].map((i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : refreshing && activePortfolio && activePortfolio.transactions.length > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
              {[1, 2, 3, 4].map((i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : portfolioStats ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
              <StatCard
                title="Portfolio Value"
                value={portfolioStats.totalValue}
                icon={Wallet}
              />
              <StatCard
                title="Total Invested"
                value={portfolioStats.totalCost}
                icon={DollarSign}
              />
              <StatCard
                title="Total Return"
                value={portfolioStats.totalGainLoss}
                changePercent={portfolioStats.totalGainLossPercent}
                icon={portfolioStats.totalGainLoss >= 0 ? TrendingUp : TrendingDown}
              />
              <StatCard
                title="Today"
                value={portfolioStats.dayChange}
                changePercent={portfolioStats.dayChangePercent}
                icon={Activity}
              />
            </div>
          ) : null}

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
              {/* Portfolio Performance Chart */}
              {loading ? (
                <SkeletonChartCard />
              ) : refreshing && activePortfolio && activePortfolio.transactions.length > 0 && historicalData.length > 0 ? (
                <SkeletonChartCard />
              ) : historicalData.length > 0 ? (
                <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700/50 p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                        Portfolio Value
                      </p>
                      {activePortfolio?.totalValue !== undefined && (
                        <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tabular-nums">
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
                              <span className={`text-sm font-semibold tabular-nums ${
                                isPositive
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-red-500 dark:text-red-400'
                              }`}>
                                {isPositive ? '+' : ''}
                                {formatCurrency(performance.periodGain)}
                              </span>
                              <span className={`px-2 py-0.5 text-xs font-semibold rounded-full tabular-nums ${
                                isPositive
                                  ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                                  : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                              }`}>
                                {isPositive ? '+' : ''}
                                {performance.periodGainPercent.toFixed(2)}%
                              </span>
                            </div>
                          );
                        })()
                      )}
                    </div>
                    {/* Period selector - Desktop */}
                    <div className="hidden sm:flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
                      {(['1d', '5d', '1m', '6m', 'ytd', 'all'] as const).map((period) => (
                        <button
                          key={period}
                          onClick={() => setChartPeriod(period)}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                            chartPeriod === period
                              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
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
                  {/* Period selector - Mobile */}
                  <div className="flex sm:hidden gap-1 justify-center mt-4 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 mx-auto w-fit">
                    {(['1d', '5d', '1m', '6m', 'ytd', 'all'] as const).map((period) => (
                      <button
                        key={period}
                        onClick={() => setChartPeriod(period)}
                        className={`px-2.5 py-1 text-[10px] font-semibold rounded-lg transition-all ${
                          chartPeriod === period
                            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                            : 'text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        {period.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Allocation Chart and Recent Transactions */}
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-3 sm:gap-4">
                {/* Allocation Chart */}
                {loading ? (
                  <SkeletonChartCard />
                ) : refreshing && holdings.length > 0 ? (
                  <SkeletonChartCard />
                ) : holdings.length > 0 ? (
                  <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700/50 p-3 sm:p-5">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Allocation</p>
                    <AllocationChart holdings={holdings} />
                  </div>
                ) : null}

                {/* Recent Transactions Summary */}
                {loading ? (
                  <SkeletonTransactionCard />
                ) : refreshing && activePortfolio && activePortfolio.transactions.length > 0 ? (
                  <SkeletonTransactionCard />
                ) : activePortfolio && activePortfolio.transactions.length > 0 ? (
                  <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700/50 p-3 sm:p-5">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Recent Activity</p>
                <div className="space-y-2">
                  {activePortfolio.transactions
                    .slice(-3)
                    .reverse()
                    .map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between p-2.5 sm:p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl gap-2"
                      >
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                          <div className="min-w-0">
                            <div className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white truncate">{transaction.symbol}</div>
                            <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                              {(() => {
                                const [year, month, day] = transaction.date.split('-').map(Number);
                                return new Date(year, month - 1, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                              })()}
                            </div>
                          </div>
                          <div className="text-[10px] sm:text-xs flex-shrink-0">
                            <span
                              className={`px-1.5 sm:px-2 py-0.5 rounded-md font-medium ${
                                transaction.type === 'buy'
                                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                                  : transaction.type === 'sell'
                                  ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                                  : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                              }`}
                            >
                              {transaction.type.toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-[10px] sm:text-xs font-semibold text-gray-900 dark:text-white tabular-nums">
                            {formatCurrency(transaction.quantity * transaction.price)}
                          </div>
                          <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                            {transaction.quantity} × {formatCurrency(transaction.price)}
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

