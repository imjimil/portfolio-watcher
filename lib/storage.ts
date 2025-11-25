import { Portfolio, WatchlistItem, Alert } from '@/types';

const STORAGE_KEYS = {
  PORTFOLIOS: 'stock_portfolios',
  WATCHLIST: 'stock_watchlist',
  ALERTS: 'stock_alerts',
  ACTIVE_PORTFOLIO: 'active_portfolio',
};

export function getPortfolios(): Portfolio[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const data = localStorage.getItem(STORAGE_KEYS.PORTFOLIOS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function savePortfolios(portfolios: Portfolio[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEYS.PORTFOLIOS, JSON.stringify(portfolios));
  } catch (error) {
    console.error('Failed to save portfolios:', error);
  }
}

export function getPortfolio(id: string): Portfolio | null {
  const portfolios = getPortfolios();
  return portfolios.find(p => p.id === id) || null;
}

export function savePortfolio(portfolio: Portfolio): void {
  const portfolios = getPortfolios();
  const index = portfolios.findIndex(p => p.id === portfolio.id);
  
  if (index >= 0) {
    portfolios[index] = portfolio;
  } else {
    portfolios.push(portfolio);
  }
  
  savePortfolios(portfolios);
}

export function deletePortfolio(id: string): void {
  const portfolios = getPortfolios().filter(p => p.id !== id);
  savePortfolios(portfolios);
}

export function getWatchlist(): WatchlistItem[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const data = localStorage.getItem(STORAGE_KEYS.WATCHLIST);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveWatchlist(watchlist: WatchlistItem[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEYS.WATCHLIST, JSON.stringify(watchlist));
  } catch (error) {
    console.error('Failed to save watchlist:', error);
  }
}

export function getAlerts(): Alert[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const data = localStorage.getItem(STORAGE_KEYS.ALERTS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveAlerts(alerts: Alert[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(alerts));
  } catch (error) {
    console.error('Failed to save alerts:', error);
  }
}

export function getActivePortfolioId(): string | null {
  if (typeof window === 'undefined') return null;
  
  try {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_PORTFOLIO);
  } catch {
    return null;
  }
}

export function setActivePortfolioId(id: string | null): void {
  if (typeof window === 'undefined') return;
  
  try {
    if (id) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_PORTFOLIO, id);
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_PORTFOLIO);
    }
  } catch (error) {
    console.error('Failed to set active portfolio:', error);
  }
}

