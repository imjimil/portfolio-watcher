import { Transaction, Holding } from '@/types';
import { parseLocalDate } from '@/lib/utils';

/**
 * Calculate holdings from transactions using FIFO (First In, First Out) method
 * This is the standard accounting method for calculating cost basis
 */
export function calculateHoldings(
  transactions: Transaction[],
  currentPrices: Record<string, number>
): Holding[] {
  const holdingsMap = new Map<string, {
    quantity: number;
    totalCost: number;
    transactions: Transaction[];
  }>();

  // Process transactions in chronological order
  const sortedTransactions = [...transactions].sort((a, b) => 
    parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime()
  );

  for (const transaction of sortedTransactions) {
    if (transaction.type === 'dividend') continue;
    
    const existing = holdingsMap.get(transaction.symbol) || {
      quantity: 0,
      totalCost: 0,
      transactions: [],
    };

    if (transaction.type === 'buy') {
      existing.quantity += transaction.quantity;
      existing.totalCost += transaction.quantity * transaction.price + (transaction.fees || 0);
    } else if (transaction.type === 'sell') {
      // FIFO: Calculate average cost for sold shares
      const avgCost = existing.totalCost / (existing.quantity || 1);
      existing.quantity = Math.max(0, existing.quantity - transaction.quantity);
      existing.totalCost = Math.max(0, existing.totalCost - transaction.quantity * avgCost);
    }

    existing.transactions.push(transaction);
    holdingsMap.set(transaction.symbol, existing);
  }

  // Convert to holdings
  const holdings: Holding[] = [];
  let totalPortfolioValue = 0;

  for (const [symbol, data] of Array.from(holdingsMap.entries())) {
    if (data.quantity === 0) continue;

    const currentPrice = currentPrices[symbol] || 0;
    const averageCost = data.totalCost / data.quantity;
    const totalCost = data.totalCost;
    const currentValue = currentPrice * data.quantity;
    const gainLoss = currentValue - totalCost;
    const gainLossPercent = totalCost > 0 ? (gainLoss / totalCost) * 100 : 0;

    holdings.push({
      symbol,
      name: symbol, // Will be updated when stock data is fetched
      quantity: data.quantity,
      averageCost,
      currentPrice,
      totalCost,
      currentValue,
      gainLoss,
      gainLossPercent,
      allocation: 0, // Will be calculated after we know total value
    });

    totalPortfolioValue += currentValue;
  }

  // Calculate allocations
  for (const holding of holdings) {
    holding.allocation = totalPortfolioValue > 0
      ? (holding.currentValue / totalPortfolioValue) * 100
      : 0;
  }

  return holdings.sort((a, b) => b.currentValue - a.currentValue);
}

/**
 * Calculate holdings at a specific point in time
 * Only includes transactions that occurred on or before the target date
 */
export function calculateHoldingsAtDate(
  transactions: Transaction[],
  targetDate: Date,
  pricesAtDate: Record<string, number>
): Holding[] {
  // Filter transactions up to target date
  // Compare date strings as local dates to avoid timezone issues
  // Convert Date to YYYY-MM-DD string for comparison
  const targetYear = targetDate.getFullYear();
  const targetMonth = String(targetDate.getMonth() + 1).padStart(2, '0');
  const targetDay = String(targetDate.getDate()).padStart(2, '0');
  const targetDateStr = `${targetYear}-${targetMonth}-${targetDay}`;
  
  const transactionsUpToDate = transactions.filter(t => {
    const tDate = parseLocalDate(t.date);
    const target = parseLocalDate(targetDateStr);
    return tDate <= target;
  });

  return calculateHoldings(transactionsUpToDate, pricesAtDate);
}

/**
 * Calculate total portfolio value at a specific date
 * Only includes holdings that have valid prices - returns { value, symbols } 
 * so caller can match with cost basis calculation
 */
export function calculatePortfolioValueAtDate(
  transactions: Transaction[],
  targetDate: Date,
  pricesAtDate: Record<string, number>
): number {
  // Convert Date to date string for consistent local date parsing
  const targetDateStr = targetDate.toISOString().split('T')[0];
  const targetLocalDate = parseLocalDate(targetDateStr);
  const holdings = calculateHoldingsAtDate(transactions, targetLocalDate, pricesAtDate);
  return holdings.reduce((sum, h) => sum + h.currentValue, 0);
}

/**
 * Calculate total portfolio value at a specific date, only for symbols with prices
 * Returns both value and which symbols were included
 */
export function calculatePortfolioValueAtDateWithSymbols(
  transactions: Transaction[],
  targetDate: Date,
  pricesAtDate: Record<string, number>
): { value: number; symbolsWithPrices: string[] } {
  const targetDateStr = targetDate.toISOString().split('T')[0];
  const targetLocalDate = parseLocalDate(targetDateStr);
  const holdings = calculateHoldingsAtDate(transactions, targetLocalDate, pricesAtDate);
  
  // Only count holdings that have valid prices
  const holdingsWithPrices = holdings.filter(h => h.currentPrice > 0);
  const symbolsWithPrices = holdingsWithPrices.map(h => h.symbol);
  const value = holdingsWithPrices.reduce((sum, h) => sum + h.currentValue, 0);
  
  return { value, symbolsWithPrices };
}

/**
 * Calculate total cost basis at a specific date
 */
export function calculateCostBasisAtDate(
  transactions: Transaction[],
  targetDate: Date,
  onlySymbols?: string[] // Optional: only calculate for these symbols
): number {
  // Convert Date to date string for consistent local date parsing
  const targetDateStr = targetDate.toISOString().split('T')[0];
  const transactionsUpToDate = transactions.filter(t => {
    const tDate = parseLocalDate(t.date);
    const target = parseLocalDate(targetDateStr);
    // Filter by date and optionally by symbols
    const dateOk = tDate <= target && t.type !== 'dividend';
    const symbolOk = !onlySymbols || onlySymbols.includes(t.symbol);
    return dateOk && symbolOk;
  });

  const holdingsMap = new Map<string, {
    quantity: number;
    totalCost: number;
  }>();

  const sortedTransactions = [...transactionsUpToDate].sort((a, b) => 
    parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime()
  );

  for (const transaction of sortedTransactions) {
    const existing = holdingsMap.get(transaction.symbol) || {
      quantity: 0,
      totalCost: 0,
    };

    if (transaction.type === 'buy') {
      existing.quantity += transaction.quantity;
      existing.totalCost += transaction.quantity * transaction.price + (transaction.fees || 0);
    } else if (transaction.type === 'sell') {
      const avgCost = existing.totalCost / (existing.quantity || 1);
      existing.quantity = Math.max(0, existing.quantity - transaction.quantity);
      existing.totalCost = Math.max(0, existing.totalCost - transaction.quantity * avgCost);
    }

    holdingsMap.set(transaction.symbol, existing);
  }

  return Array.from(holdingsMap.values()).reduce((sum, h) => sum + h.totalCost, 0);
}

