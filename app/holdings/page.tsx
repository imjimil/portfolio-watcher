'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Navbar from '@/components/Navbar';
import HoldingsTable from '@/components/HoldingsTable';
import PerformanceComparison from '@/components/PerformanceComparison';
import PortfolioHealthDashboard from '@/components/PortfolioHealthDashboard';
import PortfolioSwitcher from '@/components/PortfolioSwitcher';
import CreatePortfolioModal from '@/components/CreatePortfolioModal';
import SkeletonHoldings from '@/components/skeletons/SkeletonHoldings';
import { Portfolio, Holding, Stock, Transaction } from '@/types';
import { getPortfolios, getActivePortfolioId, setActivePortfolioId, getPortfolio, savePortfolio } from '@/lib/storage';
import { getMultipleStocks, calculateHoldings, getHistoricalData } from '@/lib/stockService';
import { parseLocalDate } from '@/lib/utils';
import { exportHoldingsToCSV } from '@/lib/exportHoldings';
import { Download } from 'lucide-react';

// Simple UUID generator
function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function HoldingsPage() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [activePortfolio, setActivePortfolio] = useState<Portfolio | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);
  const [sparklineData, setSparklineData] = useState<Record<string, any[]>>({});
  const [stockDataMap, setStockDataMap] = useState<Record<string, Stock>>({});
  const [isCreatePortfolioModalOpen, setIsCreatePortfolioModalOpen] = useState(false);
  const lastTransactionHashRef = useRef<string>('');

  useEffect(() => {
    const loadPortfolios = async () => {
      try {
        setLoading(true);
        const loadedPortfolios = await getPortfolios();
        setPortfolios(loadedPortfolios);
        
        const activeId = await getActivePortfolioId();
        // Use getPortfolio to ensure we get the full portfolio with transactions
        const portfolio = activeId 
          ? await getPortfolio(activeId) || loadedPortfolios[0]
          : loadedPortfolios[0];
        
        if (portfolio) {
          setActivePortfolio(portfolio);
        } else {
          // No portfolio found, but we've finished loading
          setLoading(false);
        }
      } catch (error) {
        console.error('Error loading portfolios:', error);
        setLoading(false);
      }
    };

    loadPortfolios();
  }, []);

  const handleSelectPortfolio = async (portfolioId: string) => {
    // Fetch the full portfolio with transactions
    const portfolio = await getPortfolio(portfolioId);
    if (portfolio) {
      setActivePortfolio(portfolio);
      // Update the portfolios array with the loaded portfolio
      setPortfolios(prev => prev.map(p => p.id === portfolioId ? portfolio : p));
      await setActivePortfolioId(portfolioId);
      // Reset hash to force recalculation
      lastTransactionHashRef.current = '';
    }
  };

  const handleCreatePortfolio = async (name: string, description?: string) => {
    const newPortfolio: Portfolio = {
      id: uuid(),
      name,
      description: description || '',
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
    setPortfolios(prev => [...prev, newPortfolio]);
    setActivePortfolio(newPortfolio);
    await setActivePortfolioId(newPortfolio.id);
    lastTransactionHashRef.current = '';
  };

  const handleCreatePortfolioWithTransactions = async (
    name: string,
    transactions: Omit<Transaction, 'id'>[],
    description?: string
  ) => {
    const portfolioId = uuid();
    const transactionsWithIds: Transaction[] = transactions.map(t => ({
      ...t,
      id: uuid(),
    }));

    const newPortfolio: Portfolio = {
      id: portfolioId,
      name,
      description: description || '',
      holdings: [],
      transactions: transactionsWithIds,
      totalValue: 0,
      totalCost: 0,
      totalGainLoss: 0,
      totalGainLossPercent: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await savePortfolio(newPortfolio);

    // Reload from DB to get accurate data
    const savedPortfolio = await getPortfolio(portfolioId);
    if (savedPortfolio) {
      const updatedPortfolios = [...portfolios, savedPortfolio];
      setPortfolios(updatedPortfolios);
      setActivePortfolio(savedPortfolio);
      await setActivePortfolioId(portfolioId);
      lastTransactionHashRef.current = '';
    }
  };

  // Calculate additional metrics for holdings
  const enrichHoldings = useCallback((calculatedHoldings: Holding[], stocks: Stock[], transactions: Transaction[]) => {
    const stockMap: Record<string, Stock> = {};
    stocks.forEach(stock => {
      stockMap[stock.symbol] = stock;
    });

    const enriched = calculatedHoldings.map(holding => {
      const stock = stockMap[holding.symbol];
      const holdingTransactions = transactions.filter(t => t.symbol === holding.symbol);
      const buyTransactions = holdingTransactions.filter(t => t.type === 'buy');
      const sellTransactions = holdingTransactions.filter(t => t.type === 'sell');
      
      // Find first purchase date
      const firstBuy = buyTransactions.sort((a, b) => 
        parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime()
      )[0];
      const firstPurchaseDate = firstBuy?.date;

      // Calculate days held
      const daysHeld = firstPurchaseDate 
        ? Math.floor((new Date().getTime() - parseLocalDate(firstPurchaseDate).getTime()) / (1000 * 60 * 60 * 24))
        : undefined;

      // Calculate realized gains from sell transactions
      let realizedGain = 0;
      sellTransactions.forEach(sell => {
        // For simplicity, use average cost for realized gain calculation
        const avgCost = holding.averageCost;
        const sellValue = sell.quantity * sell.price - (sell.fees || 0);
        const costBasis = sell.quantity * avgCost;
        realizedGain += sellValue - costBasis;
      });

      // Unrealized gain is current gain/loss minus realized gains
      const unrealizedGain = holding.gainLoss - realizedGain;

      return {
        ...holding,
        name: stock?.name || holding.name,
        marketCap: stock?.marketCap,
        peRatio: stock?.peRatio,
        dividendYield: stock?.dividendYield,
        high52Week: stock?.high52Week,
        low52Week: stock?.low52Week,
        daysHeld,
        realizedGain: realizedGain !== 0 ? realizedGain : undefined,
        unrealizedGain,
        firstPurchaseDate,
      };
    });

    return { enriched, stockMap };
  }, []);

  // Load sparkline data for holdings
  const loadSparklines = useCallback(async (holdingsToLoad: Holding[]) => {
    const data: Record<string, any[]> = {};
    
    for (const holding of holdingsToLoad) {
      if (!holding.firstPurchaseDate) continue;
      
      try {
        // Calculate days since purchase
        const purchaseDate = parseLocalDate(holding.firstPurchaseDate);
        const daysSincePurchase = Math.floor((new Date().getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // Fetch historical data since purchase (max 1 year for performance)
        const days = Math.min(daysSincePurchase, 365);
        if (days < 1) continue;
        
        const histData = await getHistoricalData(holding.symbol, days, undefined, false);
        if (histData.length > 0) {
          data[holding.symbol] = histData.map(d => ({
            date: d.date,
            price: d.price,
          }));
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Failed to load sparkline for ${holding.symbol}:`, error);
      }
    }
    
    setSparklineData(prev => ({ ...prev, ...data }));
  }, []);

  useEffect(() => {
    if (!activePortfolio) {
      // Keep loading true until we have a portfolio
      return;
    }

    const transactionHash = activePortfolio.transactions.map(t => t.id).sort().join(',');
    // Only update if transactions actually changed
    if (transactionHash === lastTransactionHashRef.current && holdings.length > 0) {
      setLoading(false);
      return;
    }

    lastTransactionHashRef.current = transactionHash;
    setLoading(true); // Ensure loading is true when starting to fetch

    const updateHoldings = async () => {
      try {
        const symbols = Array.from(
          new Set(activePortfolio.transactions.map(t => t.symbol))
        );

        if (symbols.length === 0) {
          setHoldings([]);
          setLoading(false);
          return;
        }

        const stocks = await getMultipleStocks(symbols);
        const currentPrices: Record<string, number> = {};
        stocks.forEach(stock => {
          currentPrices[stock.symbol] = stock.currentPrice;
        });

        const calculatedHoldings = calculateHoldings(
          activePortfolio.transactions,
          currentPrices
        );

        const { enriched, stockMap } = enrichHoldings(calculatedHoldings, stocks, activePortfolio.transactions);
        setHoldings(enriched);
        setStockDataMap(stockMap);

        // Load sparklines in background
        loadSparklines(enriched);
      } catch (error) {
        console.error('Error updating portfolio:', error);
      } finally {
        setLoading(false);
      }
    };

    updateHoldings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePortfolio?.id, activePortfolio?.transactions.length, enrichHoldings, loadSparklines]);

  const handleAddTransaction = async (transactionData: Omit<Transaction, 'id'>, portfolioId: string) => {
    if (!activePortfolio || activePortfolio.id !== portfolioId) return;

    const newTransaction: Transaction = {
      ...transactionData,
      id: uuid(),
    };

    const updatedPortfolio: Portfolio = {
      ...activePortfolio,
      transactions: [...activePortfolio.transactions, newTransaction],
      updatedAt: new Date().toISOString(),
    };

    await savePortfolio(updatedPortfolio);
    setActivePortfolio(updatedPortfolio);
    // Reset hash to trigger holdings update
    lastTransactionHashRef.current = '';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <main className="container mx-auto px-4 pt-2 pb-20 sm:pt-6 md:pb-6 max-w-7xl">
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              {loading ? (
                <div className="animate-pulse">
                  <div className="h-7 w-40 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                  <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded mt-2"></div>
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
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                      Holdings
                    </h1>
                  )}
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    {holdings.length} {holdings.length === 1 ? 'position' : 'positions'} in your portfolio
                  </p>
                </>
              )}
            </div>
            {holdings.length > 0 && !loading && (
              <button
                onClick={() => exportHoldingsToCSV(holdings)}
                className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                title="Export to CSV"
              >
                <Download className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <SkeletonHoldings />
        ) : (
          <>
            <PortfolioHealthDashboard 
              holdings={holdings}
              totalValue={activePortfolio?.totalValue || 0}
            />
            <PerformanceComparison 
              portfolio={activePortfolio}
              holdings={holdings}
            />
            <HoldingsTable 
              holdings={holdings} 
              sparklineData={sparklineData}
              activePortfolio={activePortfolio}
              onAddTransaction={handleAddTransaction}
            />
          </>
        )}
      </main>

      {/* Create Portfolio Modal */}
      <CreatePortfolioModal
        isOpen={isCreatePortfolioModalOpen}
        onClose={() => setIsCreatePortfolioModalOpen(false)}
        onCreate={handleCreatePortfolio}
        onCreateWithTransactions={handleCreatePortfolioWithTransactions}
      />
    </div>
  );
}

