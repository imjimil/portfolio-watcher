'use client';

import { useState, useEffect } from 'react';
import { X, Target } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface TargetPriceModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  currentPrice: number;
  existingTarget?: number;
  onSave: (targetPrice: number) => void;
}

export default function TargetPriceModal({ 
  isOpen, 
  onClose, 
  symbol, 
  currentPrice, 
  existingTarget,
  onSave 
}: TargetPriceModalProps) {
  const [targetPrice, setTargetPrice] = useState<string>(existingTarget?.toString() || '');

  useEffect(() => {
    if (isOpen && existingTarget) {
      setTargetPrice(existingTarget.toString());
    } else if (isOpen) {
      setTargetPrice('');
    }
  }, [isOpen, existingTarget]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(targetPrice);
    if (isNaN(price) || price <= 0) return;
    onSave(price);
    setTargetPrice('');
  };

  const handleRemove = () => {
    onSave(0); // 0 means remove target
    setTargetPrice('');
  };

  const diff = targetPrice ? parseFloat(targetPrice) - currentPrice : 0;
  const diffPercent = currentPrice > 0 ? (diff / currentPrice) * 100 : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-500" />
            <h2 className="text-xl font-semibold">Set Target Price for {symbol}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">Current Price</div>
          <div className="text-2xl font-semibold">{formatCurrency(currentPrice)}</div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Target Price</label>
            <input
              type="number"
              step="0.0001"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              placeholder={`e.g., ${formatCurrency(currentPrice * 1.1)}`}
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
              required
            />
            {targetPrice && !isNaN(parseFloat(targetPrice)) && (
              <div className={`text-sm mt-2 ${diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {diff >= 0 ? '+' : ''}{formatCurrency(diff)} ({diffPercent >= 0 ? '+' : ''}{diffPercent.toFixed(2)}%)
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {existingTarget ? 'Update Target' : 'Set Target'}
            </button>
            {existingTarget && (
              <button
                type="button"
                onClick={handleRemove}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Remove
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

