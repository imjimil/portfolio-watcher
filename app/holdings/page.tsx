'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Navbar from '@/components/Navbar';
import HoldingsTable from '@/components/HoldingsTable';
import PerformanceComparison from '@/components/PerformanceComparison';
import PortfolioHealthDashboard from '@/components/PortfolioHealthDashboard';
import { Portfolio, Holding, Stock, Transaction } from '@/types';
import { getPortfolios, getActivePortfolioId, getPortfolio, savePortfolio } from '@/lib/storage';
import { getMultipleStocks, calculateHoldings, getHistoricalData } from '@/lib/stockService';
import { parseLocalDate } from '@/lib/utils';
import { exportHoldingsToCSV, exportTaxReport } from '@/lib/exportHoldings';
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
  const [activePortfolio, setActivePortfolio] = useState<Portfolio | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);
  const [sparklineData, setSparklineData] = useState<Record<string, any[]>>({});
  const [stockDataMap, setStockDataMap] = useState<Record<string, Stock>>({});
  const lastTransactionHashRef = useRef<string>('');

  useEffect(() => {
    const loadPortfolio = async () => {
      try {
        const loadedPortfolios = await getPortfolios();
        const activeId = await getActivePortfolioId();
        const portfolio = activeId 
          ? await getPortfolio(activeId) || loadedPortfolios[0]
          : loadedPortfolios[0];
        
        if (portfolio) {
          setActivePortfolio(portfolio);
        }
      } catch (error) {
        console.error('Error loading portfolio:', error);
        setLoading(false);
      }
    };

    loadPortfolio();
  }, []);

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
      setLoading(false);
      return;
    }

    const transactionHash = activePortfolio.transactions.map(t => t.id).sort().join(',');
    // Only update if transactions actually changed
    if (transactionHash === lastTransactionHashRef.current && holdings.length > 0) {
      setLoading(false);
      return;
    }

    lastTransactionHashRef.current = transactionHash;

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
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-7xl">
        <div className="mb-6 sm:mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
              Holdings
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
              View all your portfolio holdings
            </p>
          </div>
          {holdings.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => exportHoldingsToCSV(holdings)}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm"
                title="Export to CSV"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export CSV</span>
              </button>
              <button
                onClick={() => exportTaxReport(holdings, activePortfolio?.name || 'Portfolio')}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm"
                title="Export Tax Report"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Tax Report</span>
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading holdings...</p>
            </div>
          </div>
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
    </div>
  );
}

