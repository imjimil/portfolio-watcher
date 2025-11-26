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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b">
          <h2 className="text-lg sm:text-xl font-bold">
            {isEditing ? 'Edit Transaction' : 'Add Transaction'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-3 sm:space-y-4">
          {error && (
            <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 text-red-700 dark:text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Portfolio Selector - Only show when adding (not editing) and multiple portfolios exist */}
          {!isEditing && portfolios.length > 1 && (
            <div>
              <label className="block text-sm font-medium mb-2">Portfolio *</label>
              <select
                value={selectedPortfolioId}
                onChange={(e) => setSelectedPortfolioId(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <label className="block text-sm font-medium mb-2">Symbol *</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && symbol.trim() && !loading) {
                    e.preventDefault(); // Prevent form submission
                    handleFetchPrice();
                  }
                }}
                placeholder="AAPL"
                className="flex-1 px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <button
                type="button"
                onClick={handleFetchPrice}
                disabled={loading || !symbol.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '...' : 'Fetch'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Type *</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'buy' | 'sell' | 'dividend')}
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="buy">Buy</option>
              <option value="sell">Sell</option>
              <option value="dividend">Dividend</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Quantity *</label>
              <input
                type="number"
                step="0.01"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="10"
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Price *</label>
              <input
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="150.00"
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Date *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Fees</label>
              <input
                type="number"
                step="0.01"
                value={fees}
                onChange={(e) => setFees(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
              rows={3}
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-2 sm:gap-3 pt-3 sm:pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {isEditing ? 'Save Changes' : 'Add Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

