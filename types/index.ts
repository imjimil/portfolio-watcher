export interface Stock {
  symbol: string;
  name: string;
  currentPrice: number;
  previousClose: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  peRatio?: number;
  dividendYield?: number;
  high52Week?: number;
  low52Week?: number;
}

export interface Transaction {
  id: string;
  symbol: string;
  type: 'buy' | 'sell' | 'dividend';
  quantity: number;
  price: number;
  date: string;
  fees?: number;
  notes?: string;
}

export interface Holding {
  symbol: string;
  name: string;
  quantity: number;
  averageCost: number;
  currentPrice: number;
  totalCost: number;
  currentValue: number;
  gainLoss: number;
  gainLossPercent: number;
  allocation: number; // Percentage of portfolio
}

export interface Portfolio {
  id: string;
  name: string;
  description?: string;
  holdings: Holding[];
  transactions: Transaction[];
  totalValue: number;
  totalCost: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  createdAt: string;
  updatedAt: string;
}

export interface WatchlistItem {
  symbol: string;
  name: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  targetPrice?: number;
  notes?: string;
  dateAdded?: string; // When added to watchlist
  category?: string; // Custom category/group
}

export interface Alert {
  id: string;
  symbol: string;
  type: 'price_above' | 'price_below' | 'change_percent';
  value: number;
  isActive: boolean;
  triggered: boolean;
  createdAt: string;
}

export interface HistoricalData {
  date: string;
  price: number;
  volume: number;
}

export interface PortfolioStats {
  totalValue: number;
  totalCost: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  dayChange: number;
  dayChangePercent: number;
  bestPerformer: Holding | null;
  worstPerformer: Holding | null;
  sectorAllocation: Record<string, number>;
}

