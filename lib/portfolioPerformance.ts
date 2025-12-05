import { Transaction, HistoricalData } from '@/types';

/**
 * Portfolio Performance Service
 * 
 * Centralized calculations for portfolio performance metrics.
 * Uses Time-Weighted Return (TWR) approach to properly handle cash flows.
 * 
 * Key insight: When you add money to your portfolio, the VALUE increases but 
 * that's not a "gain" - it's just new capital. We isolate actual investment 
 * performance by tracking the change in UNREALIZED gain (value - cost basis).
 */

export interface PeriodPerformance {
  periodGain: number;           // Dollar amount gained/lost in the period
  periodGainPercent: number;    // Percentage return for the period
  startValue: number;           // Portfolio value at start of period
  startCostBasis: number;       // Cost basis at start of period
  endValue: number;             // Portfolio value at end of period (current)
  endCostBasis: number;         // Cost basis at end (current)
  isAllTime: boolean;           // Whether this period effectively represents all time
}

export interface PerformanceInput {
  historicalData: HistoricalData[];  // Historical portfolio data (price = value, volume = cost basis)
  currentValue: number;               // Current portfolio value
  currentCostBasis: number;           // Current total cost basis
  transactions: Transaction[];        // Portfolio transactions (to find first transaction date)
  selectedPeriod?: string;            // Optional: the period selector value ('1d', '1m', 'all', etc.)
}

/**
 * Calculate portfolio performance for a given period
 * 
 * Formula explanation:
 * - For ALL TIME: Gain = Current Unrealized = Current Value - Current Cost Basis
 *   (At moment of first purchase, unrealized was $0, so this is total gain since start)
 * 
 * - For PERIOD: Gain = End Unrealized - Start Unrealized
 *   (This isolates actual investment performance from cash flows)
 * 
 * @param input - Performance calculation inputs
 * @returns PeriodPerformance object with all calculated metrics
 */
export function calculatePeriodPerformance(input: PerformanceInput): PeriodPerformance {
  const { 
    historicalData, 
    currentValue, 
    currentCostBasis, 
    transactions,
    selectedPeriod 
  } = input;

  // Default result for empty/invalid data
  const defaultResult: PeriodPerformance = {
    periodGain: 0,
    periodGainPercent: 0,
    startValue: 0,
    startCostBasis: 0,
    endValue: currentValue,
    endCostBasis: currentCostBasis,
    isAllTime: true,
  };

  if (!historicalData || historicalData.length === 0) {
    // Fallback: use current unrealized as all-time gain
    const currentUnrealized = currentValue - currentCostBasis;
    return {
      ...defaultResult,
      periodGain: currentUnrealized,
      periodGainPercent: currentCostBasis > 0 ? (currentUnrealized / currentCostBasis) * 100 : 0,
    };
  }

  // Extract start of period values from historical data
  // historicalData[0] = oldest data point (start of period)
  // volume field stores cost basis at that time
  const startValue = historicalData[0]?.price || 0;
  const startCostBasis = historicalData[0]?.volume || 0;
  const startDate = historicalData[0]?.date || '';

  // Current unrealized gain
  const currentUnrealizedGain = currentValue - currentCostBasis;

  // Find first transaction date (excluding dividends)
  const firstTransaction = transactions
    ?.filter((t) => t.type !== 'dividend')
    ?.sort((a, b) => a.date.localeCompare(b.date))[0];
  const firstTransactionDate = firstTransaction?.date || '';

  // Determine if this is effectively "all time"
  // All time = selected period is 'all' OR data starts at/after first transaction
  const startDateOnly = startDate.includes(' ') ? startDate.split(' ')[0] : startDate;
  const isAllTime = 
    selectedPeriod === 'all' || 
    selectedPeriod === 'ALL' ||
    startDateOnly === firstTransactionDate || 
    startDateOnly <= firstTransactionDate;

  let periodGain: number;
  let periodGainPercent: number;

  if (isAllTime) {
    // ALL TIME: Gain is simply current unrealized
    // At moment of first purchase, unrealized was $0 (value = cost)
    // So total gain = current unrealized - 0 = current unrealized
    periodGain = currentUnrealizedGain;
    periodGainPercent = currentCostBasis > 0 
      ? (periodGain / currentCostBasis) * 100 
      : 0;
  } else {
    // PERIOD: Gain is the change in unrealized during the period
    // This properly accounts for cash flows:
    // - If you add $500, both value and cost increase by ~$500
    // - So unrealized stays roughly the same (no artificial gain)
    const startUnrealizedGain = startValue - startCostBasis;
    periodGain = currentUnrealizedGain - startUnrealizedGain;
    periodGainPercent = startValue > 0 
      ? (periodGain / startValue) * 100 
      : 0;
  }

  return {
    periodGain,
    periodGainPercent,
    startValue,
    startCostBasis,
    endValue: currentValue,
    endCostBasis: currentCostBasis,
    isAllTime,
  };
}

/**
 * Quick helper to get just the gain/loss values
 * Use this when you only need the numbers, not all the metadata
 */
export function getPerformanceGain(input: PerformanceInput): { gain: number; percent: number } {
  const result = calculatePeriodPerformance(input);
  return {
    gain: result.periodGain,
    percent: result.periodGainPercent,
  };
}

/**
 * Calculate all-time performance (simplified helper)
 * Use when you just need total gain/loss since inception
 */
export function getAllTimePerformance(
  currentValue: number, 
  currentCostBasis: number
): { gain: number; percent: number } {
  const gain = currentValue - currentCostBasis;
  const percent = currentCostBasis > 0 ? (gain / currentCostBasis) * 100 : 0;
  return { gain, percent };
}

