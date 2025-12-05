import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatPercent(value: number, decimals: number = 2, includeSign: boolean = false): string {
  const sign = includeSign && value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

export function formatLargeNumber(value: number): string {
  if (value >= 1e12) return `${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
  return value.toFixed(2);
}

export function getColorForValue(value: number): string {
  if (value > 0) return 'text-green-500';
  if (value < 0) return 'text-red-500';
  return 'text-gray-500';
}

export function calculateGainLoss(
  currentPrice: number,
  costBasis: number,
  quantity: number
): { gainLoss: number; gainLossPercent: number } {
  const totalCost = costBasis * quantity;
  const currentValue = currentPrice * quantity;
  const gainLoss = currentValue - totalCost;
  const gainLossPercent = totalCost > 0 ? (gainLoss / totalCost) * 100 : 0;

  return { gainLoss, gainLossPercent };
}

/**
 * Parse a date string (YYYY-MM-DD) as a local date to avoid timezone issues
 * When you use new Date("2024-01-15"), it's interpreted as UTC, which can
 * cause the date to shift by one day in some timezones
 */
export function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Compare two date strings (YYYY-MM-DD) as local dates
 * Returns true if date1 <= date2
 */
export function compareDateStrings(date1: string, date2: string): boolean {
  const d1 = parseLocalDate(date1);
  const d2 = parseLocalDate(date2);
  return d1 <= d2;
}

/**
 * Format a date string (YYYY-MM-DD) to a localized date string
 */
export function formatDateString(dateString: string): string {
  return parseLocalDate(dateString).toLocaleDateString();
}

