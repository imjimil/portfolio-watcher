'use client';

import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import Navbar from '@/components/Navbar';
import TransactionHistory from '@/components/TransactionHistory';
import AddTransactionModal from '@/components/AddTransactionModal';
import { Portfolio, Transaction, Holding } from '@/types';
import { getPortfolios, getActivePortfolioId, getPortfolio, savePortfolio } from '@/lib/storage';
import { getMultipleStocks, calculateHoldings } from '@/lib/stockService';
import { exportTransactionsToCSV, downloadCSV } from '@/lib/export';

// Simple UUID generator
function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function TransactionsPage() {
  const [activePortfolio, setActivePortfolio] = useState<Portfolio | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);

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
      } finally {
        setLoading(false);
      }
    };

    loadPortfolio();
  }, []);

  const updateHoldings = async () => {
    if (!activePortfolio) return;

    try {
      const symbols = Array.from(
        new Set(activePortfolio.transactions.map(t => t.symbol))
      );

      if (symbols.length === 0) {
        setHoldings([]);
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
      console.error('Error updating holdings:', error);
    }
  };

  useEffect(() => {
    if (activePortfolio) {
      updateHoldings();
    }
  }, [activePortfolio]);

  const handleAddTransaction = async (transactionData: Omit<Transaction, 'id'>) => {
    if (!activePortfolio) return;

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
    updateHoldings();
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    if (!activePortfolio) return;

    const updatedPortfolio: Portfolio = {
      ...activePortfolio,
      transactions: activePortfolio.transactions.filter(t => t.id !== transactionId),
      updatedAt: new Date().toISOString(),
    };

    await savePortfolio(updatedPortfolio);
    setActivePortfolio(updatedPortfolio);
    updateHoldings();
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
    setActivePortfolio(updatedPortfolio);
    updateHoldings();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-7xl">
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
              Transactions
            </h1>
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

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading transactions...</p>
            </div>
          </div>
        ) : (
          <TransactionHistory
            transactions={activePortfolio?.transactions || []}
            onDelete={handleDeleteTransaction}
            onEdit={handleEditTransaction}
          />
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
      />
    </div>
  );
}

