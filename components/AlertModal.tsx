'use client';

import { useState, useEffect } from 'react';
import { X, Bell, Trash2 } from 'lucide-react';
import { Alert } from '@/types';
import { formatCurrency, formatPercent } from '@/lib/utils';

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  currentPrice: number;
  existingAlerts?: Alert[];
  onSave: (alert: Omit<Alert, 'id' | 'createdAt'>) => void;
  onDelete?: (alertId: string) => void;
}

export default function AlertModal({ isOpen, onClose, symbol, currentPrice, existingAlerts = [], onSave, onDelete }: AlertModalProps) {
  const [alertType, setAlertType] = useState<'price_above' | 'price_below' | 'change_percent'>('price_above');
  const [value, setValue] = useState<string>('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setValue('');
      setAlertType('price_above');
      setIsActive(true);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;

    onSave({
      symbol,
      type: alertType,
      value: numValue,
      isActive,
      triggered: false,
    });

    // Reset form
    setValue('');
    setAlertType('price_above');
    setIsActive(true);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-yellow-500" />
            <h2 className="text-xl font-semibold">Set Alert for {symbol}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Existing Alerts */}
        {existingAlerts.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium mb-3">Existing Alerts</h3>
            <div className="space-y-2">
              {existingAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="text-sm font-medium">
                      {alert.type === 'price_above' && `Price Above ${formatCurrency(alert.value)}`}
                      {alert.type === 'price_below' && `Price Below ${formatCurrency(alert.value)}`}
                      {alert.type === 'change_percent' && `Change ${alert.value >= 0 ? '+' : ''}${formatPercent(alert.value)}`}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {alert.isActive ? 'Active' : 'Inactive'}
                    </div>
                  </div>
                  {onDelete && (
                    <button
                      onClick={() => {
                        onDelete(alert.id);
                      }}
                      className="ml-3 p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Delete Alert"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Alert Type</label>
            <select
              value={alertType}
              onChange={(e) => setAlertType(e.target.value as any)}
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
            >
              <option value="price_above">Price Above</option>
              <option value="price_below">Price Below</option>
              <option value="change_percent">Change Percentage</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              {alertType === 'price_above' && 'Price Above'}
              {alertType === 'price_below' && 'Price Below'}
              {alertType === 'change_percent' && 'Change Percentage'}
            </label>
            <input
              type="number"
              step={alertType === 'change_percent' ? '0.01' : '0.0001'}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={
                alertType === 'price_above' ? `Above ${formatCurrency(currentPrice)}` :
                alertType === 'price_below' ? `Below ${formatCurrency(currentPrice)}` :
                'Percentage change (e.g., 5 for 5%)'
              }
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
              required
            />
            {alertType === 'change_percent' && (
              <p className="text-xs text-gray-500 mt-1">Enter positive for gain, negative for loss</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="isActive" className="text-sm">Active</label>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Set Alert
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

