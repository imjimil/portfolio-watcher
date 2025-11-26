import { Holding } from '@/types';
import { formatCurrency, formatPercent, formatNumber } from './utils';

export function exportHoldingsToCSV(holdings: Holding[]): void {
  const headers = [
    'Symbol',
    'Name',
    'Quantity',
    'Average Cost',
    'Current Price',
    'Total Cost',
    'Current Value',
    'Gain/Loss',
    'Gain/Loss %',
    'Allocation %',
    'P/E Ratio',
    'Dividend Yield',
    'Market Cap',
    '52W High',
    '52W Low',
    'Days Held',
    'Realized Gain',
    'Unrealized Gain',
    'First Purchase Date',
  ];

  const rows = holdings.map(holding => [
    holding.symbol,
    `"${holding.name}"`,
    formatNumber(holding.quantity, 2),
    holding.averageCost,
    holding.currentPrice,
    holding.totalCost,
    holding.currentValue,
    holding.gainLoss,
    holding.gainLossPercent,
    holding.allocation,
    holding.peRatio || '',
    holding.dividendYield ? holding.dividendYield : '',
    holding.marketCap || '',
    holding.high52Week || '',
    holding.low52Week || '',
    holding.daysHeld || '',
    holding.realizedGain || '',
    holding.unrealizedGain || '',
    holding.firstPurchaseDate || '',
  ]);

  const csv = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `holdings-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportTaxReport(holdings: Holding[], portfolioName: string): void {
  const headers = [
    'Symbol',
    'Quantity',
    'Average Cost',
    'Current Price',
    'Total Cost',
    'Current Value',
    'Unrealized Gain/Loss',
    'Unrealized Gain/Loss %',
    'Realized Gain/Loss',
    'Days Held',
    'First Purchase Date',
  ];

  const rows = holdings.map(holding => [
    holding.symbol,
    formatNumber(holding.quantity, 2),
    holding.averageCost,
    holding.currentPrice,
    holding.totalCost,
    holding.currentValue,
    holding.unrealizedGain !== undefined ? holding.unrealizedGain : holding.gainLoss,
    holding.gainLossPercent,
    holding.realizedGain || 0,
    holding.daysHeld || '',
    holding.firstPurchaseDate || '',
  ]);

  const csv = [
    `Tax Report - ${portfolioName}`,
    `Generated: ${new Date().toLocaleDateString()}`,
    '',
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tax-report-${portfolioName}-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

