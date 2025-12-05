'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Transaction, Portfolio } from '@/types';
import { getStockData } from '@/lib/stockService';
import { cn } from '@/lib/utils';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (transaction: Omit<Transaction, 'id'>, portfolioId: string) => void;
  onEdit?: (id: string, transaction: Omit<Transaction, 'id'>) => void;
  existingSymbols?: string[];
  editingTransaction?: Transaction | null;
  portfolios?: Portfolio[];
  activePortfolioId?: string | null;
  prefillSymbol?: string;
  prefillType?: 'buy' | 'sell' | 'dividend';
}

export default function AddTransactionModal({
  isOpen,
  onClose,
  onAdd,
  onEdit,
  existingSymbols = [],
  editingTransaction = null,
  portfolios = [],
  activePortfolioId = null,
  prefillSymbol,
  prefillType = 'buy',
}: AddTransactionModalProps) {
  const isEditing = !!editingTransaction;
  const [symbol, setSymbol] = useState('');
  const [type, setType] = useState<'buy' | 'sell' | 'dividend'>('buy');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [fees, setFees] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>(activePortfolioId || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Update selected portfolio when activePortfolioId changes
  useEffect(() => {
    if (activePortfolioId) {
      setSelectedPortfolioId(activePortfolioId);
    } else if (portfolios.length > 0) {
      setSelectedPortfolioId(portfolios[0].id);
    }
  }, [activePortfolioId, portfolios]);

  useEffect(() => {
    if (isOpen) {
      if (editingTransaction) {
        // Populate form with transaction data when editing
        setSymbol(editingTransaction.symbol);
        setType(editingTransaction.type);
        setQuantity(editingTransaction.quantity.toString());
        setPrice(editingTransaction.price.toString());
        setFees(editingTransaction.fees?.toString() || '');
        setDate(editingTransaction.date);
        setNotes(editingTransaction.notes || '');
      } else {
        // Reset form when adding new transaction, or use prefilled values
        setSymbol(prefillSymbol || '');
        setType(prefillType || 'buy');
        setQuantity('');
        setPrice('');
        setFees('');
        setDate(new Date().toISOString().split('T')[0]);
        setNotes('');
        // Auto-fetch price if symbol is prefilled (will be handled in useEffect below)
      }
      setError('');
    }
  }, [isOpen, editingTransaction, prefillSymbol, prefillType]);

  // Auto-fetch price when modal opens with prefilled symbol
  useEffect(() => {
    if (isOpen && !isEditing && prefillSymbol && symbol === prefillSymbol && !price) {
      const fetchPrice = async () => {
        if (!symbol.trim()) return;
        setLoading(true);
        try {
          const stock = await getStockData(symbol.toUpperCase());
          if (stock) {
            setPrice(stock.currentPrice.toFixed(2));
          }
        } catch (err) {
          // Silently fail for auto-fetch
        } finally {
          setLoading(false);
        }
      };
      fetchPrice();
    }
  }, [isOpen, prefillSymbol, symbol, price, isEditing]);

  const handleFetchPrice = async () => {
    if (!symbol.trim()) {
      setError('Please enter a symbol');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const stock = await getStockData(symbol.toUpperCase());
      if (stock) {
        setPrice(stock.currentPrice.toFixed(2));
      } else {
        setError('Stock not found. Please enter price manually.');
      }
    } catch (err) {
      setError('Failed to fetch stock price');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!symbol.trim() || !quantity || !price || !date) {
      setError('Please fill in all required fields');
      return;
    }

    // When adding (not editing), require portfolio selection if multiple portfolios exist
    if (!isEditing && portfolios.length > 1 && !selectedPortfolioId) {
      setError('Please select a portfolio');
      return;
    }

    const transaction: Omit<Transaction, 'id'> = {
      symbol: symbol.toUpperCase().trim(),
      type,
      quantity: parseFloat(quantity),
      price: parseFloat(price),
      date,
      fees: fees ? parseFloat(fees) : undefined,
      notes: notes.trim() || undefined,
    };

    if (isEditing && editingTransaction && onEdit) {
      onEdit(editingTransaction.id, transaction);
    } else {
      // Use selected portfolio or active portfolio or first portfolio
      const portfolioId = selectedPortfolioId || activePortfolioId || portfolios[0]?.id;
      if (!portfolioId) {
        setError('No portfolio available');
        return;
      }
      onAdd(transaction, portfolioId);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {isEditing ? 'Edit Transaction' : 'Add Transaction'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 rounded-xl text-sm">
              {error}
            </div>
          )}

          {/* Portfolio Selector - Only show when adding (not editing) and multiple portfolios exist */}
          {!isEditing && portfolios.length > 1 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Portfolio</label>
              <select
                value={selectedPortfolioId}
                onChange={(e) => setSelectedPortfolioId(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                {portfolios.map((portfolio) => (
                  <option key={portfolio.id} value={portfolio.id}>
                    {portfolio.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Symbol</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && symbol.trim() && !loading) {
                    e.preventDefault();
                    handleFetchPrice();
                  }
                }}
                placeholder="AAPL"
                className="flex-1 px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <button
                type="button"
                onClick={handleFetchPrice}
                disabled={loading || !symbol.trim()}
                className="px-4 py-2.5 text-sm font-medium bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              >
                {loading ? '...' : 'Fetch'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'buy' | 'sell' | 'dividend')}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="buy">Buy</option>
              <option value="sell">Sell</option>
              <option value="dividend">Dividend</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Quantity</label>
              <input
                type="number"
                step="0.01"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="10"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent tabular-nums"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Price</label>
              <input
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="150.00"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent tabular-nums"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Fees</label>
              <input
                type="number"
                step="0.01"
                value={fees}
                onChange={(e) => setFees(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent tabular-nums"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
              rows={2}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 text-sm font-medium bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl hover:opacity-90 transition-opacity"
            >
              {isEditing ? 'Save Changes' : 'Add Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

