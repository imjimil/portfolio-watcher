import { Portfolio, Transaction } from '@/types';
import { formatCurrency } from './utils';

export function exportPortfolioToCSV(portfolio: Portfolio): string {
  const headers = ['Symbol', 'Quantity', 'Avg Cost', 'Current Price', 'Market Value', 'Gain/Loss', 'Gain/Loss %', 'Allocation %'];
  const rows = portfolio.holdings.map(holding => [
    holding.symbol,
    holding.quantity.toFixed(2),
    holding.averageCost.toFixed(2),
    holding.currentPrice.toFixed(2),
    holding.currentValue.toFixed(2),
    holding.gainLoss.toFixed(2),
    holding.gainLossPercent.toFixed(2),
    holding.allocation.toFixed(2),
  ]);

  const csv = [
    headers.join(','),
    ...rows.map(row => row.join(',')),
    '',
    'Portfolio Summary',
    `Total Value,${portfolio.totalValue.toFixed(2)}`,
    `Total Cost,${portfolio.totalCost.toFixed(2)}`,
    `Total Gain/Loss,${portfolio.totalGainLoss.toFixed(2)}`,
    `Total Gain/Loss %,${portfolio.totalGainLossPercent.toFixed(2)}`,
  ].join('\n');

  return csv;
}

export function exportTransactionsToCSV(transactions: Transaction[]): string {
  const headers = ['Date', 'Symbol', 'Type', 'Quantity', 'Price', 'Total', 'Fees', 'Notes'];
  const rows = transactions.map(transaction => [
    transaction.date,
    transaction.symbol,
    transaction.type,
    transaction.quantity.toFixed(2),
    transaction.price.toFixed(2),
    (transaction.quantity * transaction.price).toFixed(2),
    (transaction.fees || 0).toFixed(2),
    transaction.notes || '',
  ]);

  const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  return csv;
}

export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

