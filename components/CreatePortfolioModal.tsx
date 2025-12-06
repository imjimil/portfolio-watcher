'use client';

import { useState, useRef } from 'react';
import { X, Plus, Upload, FileSpreadsheet, ArrowLeft, Check, AlertCircle } from 'lucide-react';
import { Transaction } from '@/types';
import { formatCurrency } from '@/lib/utils';

interface CreatePortfolioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, description?: string) => Promise<void>;
  onCreateWithTransactions?: (name: string, transactions: Omit<Transaction, 'id'>[], description?: string) => Promise<void>;
}

interface ParsedTransaction {
  symbol: string;
  date: string;
  price: number;
  quantity: number;
  fees: number;
  type: 'buy' | 'sell' | 'dividend';
  isValid: boolean;
  error?: string;
}

// Parse Yahoo Finance CSV format
function parseYahooCSV(csvContent: string): ParsedTransaction[] {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) return [];
  
  // Skip header row
  const transactions: ParsedTransaction[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    // Parse CSV line (handle quoted values)
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    
    // Yahoo CSV columns:
    // 0: Symbol, 1: Current Price, 2: Date, 3: Time, 4: Change, 5: Open, 6: High, 7: Low, 
    // 8: Volume, 9: Trade Date, 10: Purchase Price, 11: Quantity, 12: Commission,
    // 13: High Limit, 14: Low Limit, 15: Comment, 16: Transaction Type
    
    const symbol = values[0] || '';
    const tradeDateRaw = values[9] || '';
    const purchasePrice = parseFloat(values[10]) || 0;
    const quantity = parseFloat(values[11]) || 0;
    const commission = parseFloat(values[12]) || 0;
    const transactionType = values[16] || '';
    
    // Skip cash deposits/withdrawals
    if (symbol.startsWith('$$') || transactionType === 'DEPOSIT' || transactionType === 'WITHDRAWAL') {
      continue;
    }
    
    // Skip invalid rows
    if (!symbol || !tradeDateRaw || purchasePrice <= 0 || quantity <= 0) {
      continue;
    }
    
    // Parse date (format: YYYYMMDD)
    let formattedDate = '';
    let isValid = true;
    let error = '';
    
    if (tradeDateRaw.length === 8) {
      const year = tradeDateRaw.substring(0, 4);
      const month = tradeDateRaw.substring(4, 6);
      const day = tradeDateRaw.substring(6, 8);
      formattedDate = `${year}-${month}-${day}`;
      
      // Validate date
      const dateObj = new Date(formattedDate);
      if (isNaN(dateObj.getTime())) {
        isValid = false;
        error = 'Invalid date';
      }
    } else {
      isValid = false;
      error = 'Invalid date format';
    }
    
    transactions.push({
      symbol: symbol.toUpperCase(),
      date: formattedDate,
      price: purchasePrice,
      quantity,
      fees: commission,
      type: 'buy', // Yahoo export only shows purchases
      isValid,
      error,
    });
  }
  
  return transactions;
}

export default function CreatePortfolioModal({
  isOpen,
  onClose,
  onCreate,
  onCreateWithTransactions,
}: CreatePortfolioModalProps) {
  const [step, setStep] = useState<'choose' | 'manual' | 'import'>('choose');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Import state
  const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>([]);
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setFileName(file.name);
    setError(null);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = parseYahooCSV(content);
        
        if (parsed.length === 0) {
          setError('No valid transactions found in the CSV file');
          setParsedTransactions([]);
          return;
        }
        
        setParsedTransactions(parsed);
        
        // Auto-generate portfolio name from file name
        if (!name) {
          const baseName = file.name.replace(/\.csv$/i, '').replace(/[_-]/g, ' ');
          setName(baseName.charAt(0).toUpperCase() + baseName.slice(1));
        }
      } catch (err) {
        setError('Failed to parse CSV file. Please ensure it\'s a valid Yahoo Finance export.');
        setParsedTransactions([]);
      }
    };
    reader.readAsText(file);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Portfolio name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onCreate(name.trim(), description.trim() || undefined);
      resetAndClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create portfolio');
    } finally {
      setLoading(false);
    }
  };

  const handleImportSubmit = async () => {
    if (!name.trim()) {
      setError('Portfolio name is required');
      return;
    }
    
    const validTransactions = parsedTransactions.filter(t => t.isValid);
    if (validTransactions.length === 0) {
      setError('No valid transactions to import');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (onCreateWithTransactions) {
        const transactions: Omit<Transaction, 'id'>[] = validTransactions.map(t => ({
          symbol: t.symbol,
          date: t.date,
          price: t.price,
          quantity: t.quantity,
          fees: t.fees,
          type: t.type,
        }));
        
        await onCreateWithTransactions(name.trim(), transactions, description.trim() || undefined);
      } else {
        // Fallback: create empty portfolio first
        await onCreate(name.trim(), description.trim() || undefined);
      }
      resetAndClose();
    } catch (err: any) {
      setError(err.message || 'Failed to import portfolio');
    } finally {
      setLoading(false);
    }
  };

  const resetAndClose = () => {
    setStep('choose');
      setName('');
      setDescription('');
      setError(null);
    setParsedTransactions([]);
    setFileName('');
      onClose();
  };

  const handleBack = () => {
    setStep('choose');
    setError(null);
  };

  const validCount = parsedTransactions.filter(t => t.isValid).length;
  const invalidCount = parsedTransactions.filter(t => !t.isValid).length;
  const totalValue = parsedTransactions
    .filter(t => t.isValid)
    .reduce((sum, t) => sum + t.price * t.quantity, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-100 dark:border-gray-700 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            {step !== 'choose' && (
              <button
                onClick={handleBack}
                disabled={loading}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <ArrowLeft className="h-4 w-4 text-gray-500" />
              </button>
            )}
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {step === 'choose' && 'Create Portfolio'}
              {step === 'manual' && 'New Portfolio'}
              {step === 'import' && 'Import from CSV'}
          </h2>
          </div>
          <button
            onClick={resetAndClose}
            disabled={loading}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl p-3 mb-4">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Step: Choose Method */}
          {step === 'choose' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                How would you like to create your portfolio?
              </p>
              
              <button
                onClick={() => setStep('manual')}
                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-all text-left group"
              >
                <div className="p-3 rounded-xl bg-gray-100 dark:bg-gray-700 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors">
                  <Plus className="h-6 w-6 text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Start Fresh</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Create an empty portfolio and add transactions manually</p>
                </div>
              </button>
              
              <button
                onClick={() => setStep('import')}
                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20 transition-all text-left group"
              >
                <div className="p-3 rounded-xl bg-gray-100 dark:bg-gray-700 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/50 transition-colors">
                  <Upload className="h-6 w-6 text-gray-600 dark:text-gray-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Import from Yahoo Finance</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Upload a CSV export from your Yahoo Finance portfolio</p>
                </div>
              </button>
            </div>
          )}

          {/* Step: Manual Create */}
          {step === 'manual' && (
            <form onSubmit={handleManualSubmit} className="space-y-4">
          <div>
                <label htmlFor="portfolio-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Name
            </label>
            <input
              id="portfolio-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              placeholder="e.g., Retirement Portfolio"
                  autoFocus
            />
          </div>

          <div>
                <label htmlFor="portfolio-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Description <span className="text-gray-400 text-xs">(optional)</span>
            </label>
            <textarea
              id="portfolio-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
                  rows={2}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 resize-none"
                  placeholder="Add a description..."
            />
          </div>

              <div className="flex gap-3 pt-2">
            <button
              type="button"
                  onClick={handleBack}
              disabled={loading}
                  className="flex-1 px-4 py-2.5 text-sm font-medium border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
                  Back
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
                  className="flex-1 px-4 py-2.5 text-sm font-medium bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 dark:border-gray-900/30 border-t-white dark:border-t-gray-900 rounded-full animate-spin" />
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                      Create
                </>
              )}
            </button>
          </div>
        </form>
          )}

          {/* Step: Import */}
          {step === 'import' && (
            <div className="space-y-4">
              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  CSV File
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-3 px-4 py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-all"
                >
                  {fileName ? (
                    <>
                      <FileSpreadsheet className="h-6 w-6 text-emerald-500" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{fileName}</span>
                      <Check className="h-5 w-5 text-emerald-500" />
                    </>
                  ) : (
                    <>
                      <Upload className="h-6 w-6 text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Click to select CSV file</span>
                    </>
                  )}
                </button>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Export your portfolio from Yahoo Finance → Download as CSV
                </p>
              </div>

              {/* Preview */}
              {parsedTransactions.length > 0 && (
                <>
                  {/* Summary */}
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Import Preview</h4>
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                          {validCount} valid
                        </span>
                        {invalidCount > 0 && (
                          <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full">
                            {invalidCount} invalid
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Transactions:</span>
                        <span className="ml-2 font-semibold text-gray-900 dark:text-white">{validCount}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Total Cost:</span>
                        <span className="ml-2 font-semibold text-gray-900 dark:text-white">{formatCurrency(totalValue)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Transaction List */}
                  <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                    <div className="max-h-48 overflow-y-auto">
                      {parsedTransactions.slice(0, 20).map((t, i) => (
                        <div
                          key={i}
                          className={`flex items-center justify-between px-3 py-2 text-sm border-b border-gray-100 dark:border-gray-700/50 last:border-0 ${
                            !t.isValid ? 'bg-red-50 dark:bg-red-900/10' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {!t.isValid && <AlertCircle className="h-3.5 w-3.5 text-red-500" />}
                            <span className="font-medium text-gray-900 dark:text-white">{t.symbol}</span>
                            <span className="text-gray-500 dark:text-gray-400">×{t.quantity}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-gray-900 dark:text-white tabular-nums">{formatCurrency(t.price * t.quantity)}</div>
                            <div className="text-xs text-gray-500">{t.date}</div>
                          </div>
                        </div>
                      ))}
                      {parsedTransactions.length > 20 && (
                        <div className="px-3 py-2 text-xs text-center text-gray-500 bg-gray-50 dark:bg-gray-900/50">
                          +{parsedTransactions.length - 20} more transactions
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Portfolio Name */}
                  <div>
                    <label htmlFor="import-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Portfolio Name
                    </label>
                    <input
                      id="import-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      disabled={loading}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                      placeholder="e.g., Yahoo Portfolio"
                    />
                  </div>
                </>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 text-sm font-medium border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleImportSubmit}
                  disabled={loading || validCount === 0 || !name.trim()}
                  className="flex-1 px-4 py-2.5 text-sm font-medium bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Import {validCount} Transactions
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
