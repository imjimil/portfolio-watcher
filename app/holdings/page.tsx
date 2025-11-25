'use client';

import { useState, useEffect, useRef } from 'react';
import Navbar from '@/components/Navbar';
import HoldingsTable from '@/components/HoldingsTable';
import { Portfolio, Holding, Stock } from '@/types';
import { getPortfolios, getActivePortfolioId, savePortfolio } from '@/lib/storage';
import { getMultipleStocks, calculateHoldings } from '@/lib/stockService';

export default function HoldingsPage() {
  const [activePortfolio, setActivePortfolio] = useState<Portfolio | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);
  const lastTransactionHashRef = useRef<string>('');

  useEffect(() => {
    const loadedPortfolios = getPortfolios();
    const activeId = getActivePortfolioId();
    const portfolio = activeId 
      ? loadedPortfolios.find(p => p.id === activeId) || loadedPortfolios[0]
      : loadedPortfolios[0];
    
    if (portfolio) {
      setActivePortfolio(portfolio);
    }
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
        setHoldings(calculatedHoldings);
      } catch (error) {
        console.error('Error updating portfolio:', error);
      } finally {
        setLoading(false);
      }
    };

    updateHoldings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePortfolio?.id, activePortfolio?.transactions.length]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-7xl">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
            Holdings
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
            View all your portfolio holdings
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading holdings...</p>
            </div>
          </div>
        ) : (
          <HoldingsTable holdings={holdings} />
        )}
      </main>
    </div>
  );
}

