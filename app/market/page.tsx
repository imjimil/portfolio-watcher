'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import StockActionSheet from '@/components/StockActionSheet';
import ActionToast from '@/components/ActionToast';
import { cn, formatCurrency, formatPercent } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { getWatchlist, saveWatchlist } from '@/lib/storage';
import { getStockPriceData } from '@/lib/stockService';
import { WatchlistItem } from '@/types';

type MarketItem = {
  symbol: string;
  label?: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
  exchange?: string;
  category?: string;
  marketState?: string;
};

type QuickStat = {
  symbol: string;
  label: string;
  price: number;
  change: number;
  changePercent: number;
  marketState?: string;
};

type SectorStock = {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
};

type SectorData = {
  sector: string;
  emoji: string;
  avgChange: number;
  topMover: SectorStock | null;
  stocks: SectorStock[];
};

type RegionGroup = {
  region: string;
  emoji: string;
  items: MarketItem[];
};

// Map symbols to regions
const REGION_MAP: Record<string, { region: string; emoji: string }> = {
  '^GSPC': { region: 'Americas', emoji: '🇺🇸' },
  '^IXIC': { region: 'Americas', emoji: '🇺🇸' },
  '^DJI': { region: 'Americas', emoji: '🇺🇸' },
  '^GSPTSE': { region: 'Americas', emoji: '🇨🇦' },
  '^FTSE': { region: 'Europe', emoji: '🇬🇧' },
  '^GDAXI': { region: 'Europe', emoji: '🇩🇪' },
  '^FCHI': { region: 'Europe', emoji: '🇫🇷' },
  '^N225': { region: 'Asia-Pacific', emoji: '🇯🇵' },
  '^HSI': { region: 'Asia-Pacific', emoji: '🇭🇰' },
  '^AXJO': { region: 'Asia-Pacific', emoji: '🇦🇺' },
  '^BSESN': { region: 'Asia-Pacific', emoji: '🇮🇳' },
  '^NSEI': { region: 'Asia-Pacific', emoji: '🇮🇳' },
};

// Compact row for displaying market data
function MarketRow({ item, showCategory = false }: { item: MarketItem; showCategory?: boolean }) {
  const isUp = item.change >= 0;
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900 dark:text-white">{item.label || item.name}</p>
        {showCategory && item.category && (
          <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide">{item.category}</p>
        )}
      </div>
      <div className="flex items-center gap-4">
        <p className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">
          {item.symbol === '^TNX' ? item.price.toFixed(3) + '%' : formatCurrency(item.price)}
        </p>
        <div className={cn(
          'min-w-[70px] text-right text-xs font-semibold tabular-nums',
          isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
        )}>
          {isUp ? '+' : ''}{item.changePercent.toFixed(2)}%
        </div>
      </div>
    </div>
  );
}

export default function MarketPage() {
  const router = useRouter();
  const [indices, setIndices] = useState<MarketItem[]>([]);
  const [futures, setFutures] = useState<MarketItem[]>([]);
  const [sectors, setSectors] = useState<SectorData[]>([]);
  const [quickStats, setQuickStats] = useState<QuickStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeRegion, setActiveRegion] = useState(0);
  const [activeFutures, setActiveFutures] = useState(0);
  
  // Stock action sheet state
  const [selectedStock, setSelectedStock] = useState<SectorStock | null>(null);
  const [actionSheetOpen, setActionSheetOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [activeSector, setActiveSector] = useState(0);
  const regionScrollRef = useRef<HTMLDivElement>(null);
  const futuresScrollRef = useRef<HTMLDivElement>(null);
  const sectorsScrollRef = useRef<HTMLDivElement>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // Group indices by region
  const regionGroups = useMemo((): RegionGroup[] => {
    const groups: Record<string, RegionGroup> = {
      'Americas': { region: 'Americas', emoji: '🌎', items: [] },
      'Europe': { region: 'Europe', emoji: '🌍', items: [] },
      'Asia-Pacific': { region: 'Asia-Pacific', emoji: '🌏', items: [] },
    };

    indices.forEach((item) => {
      const regionInfo = REGION_MAP[item.symbol];
      if (regionInfo) {
        groups[regionInfo.region].items.push(item);
      }
    });

    return Object.values(groups).filter(g => g.items.length > 0);
  }, [indices]);

  // Group futures by category as array for carousel
  const futuresGroupsArray = useMemo(() => {
    const groups: Record<string, { label: string; items: MarketItem[] }> = {
      equity: { label: 'Equity', items: [] },
      commodity: { label: 'Commodities', items: [] },
      currency: { label: 'Currencies', items: [] },
      bond: { label: 'Bonds', items: [] },
    };
    futures.forEach((f) => {
      const cat = (f as any).category || 'equity';
      if (groups[cat]) groups[cat].items.push(f);
    });
    return Object.values(groups).filter(g => g.items.length > 0);
  }, [futures]);

  const scrollToRegion = (index: number) => {
    setActiveRegion(index);
    if (regionScrollRef.current) {
      const container = regionScrollRef.current;
      const scrollWidth = container.scrollWidth / regionGroups.length;
      container.scrollTo({ left: scrollWidth * index, behavior: 'smooth' });
    }
  };

  const handleRegionScroll = () => {
    if (regionScrollRef.current && regionGroups.length > 0) {
      const container = regionScrollRef.current;
      const scrollWidth = container.scrollWidth / regionGroups.length;
      const newIndex = Math.round(container.scrollLeft / scrollWidth);
      if (newIndex !== activeRegion && newIndex >= 0 && newIndex < regionGroups.length) {
        setActiveRegion(newIndex);
      }
    }
  };

  const scrollToFutures = (index: number) => {
    setActiveFutures(index);
    if (futuresScrollRef.current) {
      const container = futuresScrollRef.current;
      const scrollWidth = container.scrollWidth / futuresGroupsArray.length;
      container.scrollTo({ left: scrollWidth * index, behavior: 'smooth' });
    }
  };

  const handleFuturesScroll = () => {
    if (futuresScrollRef.current && futuresGroupsArray.length > 0) {
      const container = futuresScrollRef.current;
      const scrollWidth = container.scrollWidth / futuresGroupsArray.length;
      const newIndex = Math.round(container.scrollLeft / scrollWidth);
      if (newIndex !== activeFutures && newIndex >= 0 && newIndex < futuresGroupsArray.length) {
        setActiveFutures(newIndex);
      }
    }
  };

  const scrollToSector = (index: number) => {
    setActiveSector(index);
    if (sectorsScrollRef.current) {
      const container = sectorsScrollRef.current;
      const scrollWidth = container.scrollWidth / sectors.length;
      container.scrollTo({ left: scrollWidth * index, behavior: 'smooth' });
    }
  };

  const handleSectorsScroll = () => {
    if (sectorsScrollRef.current && sectors.length > 0) {
      const container = sectorsScrollRef.current;
      const scrollWidth = container.scrollWidth / sectors.length;
      const newIndex = Math.round(container.scrollLeft / scrollWidth);
      if (newIndex !== activeSector && newIndex >= 0 && newIndex < sectors.length) {
        setActiveSector(newIndex);
      }
    }
  };

  // Stock action handlers
  const handleStockClick = (stock: SectorStock) => {
    setSelectedStock(stock);
    setActionSheetOpen(true);
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };

  const handleAddToWatchlist = async (symbol: string) => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      // Add to watchlist
      const watchlist = await getWatchlist();
      if (watchlist.find(w => w.symbol === symbol)) {
        showToast(`${symbol} is already in your watchlist`, 'info');
        return;
      }
      
      // Fetch stock data
      const stock = await getStockPriceData(symbol, selectedStock?.name || symbol);
      if (stock && stock.currentPrice > 0) {
        const newItem: WatchlistItem = {
          symbol: stock.symbol,
          name: stock.name,
          currentPrice: stock.currentPrice,
          change: stock.change,
          changePercent: stock.changePercent,
          dateAdded: new Date().toISOString(),
        };
        await saveWatchlist([...watchlist, newItem]);
        showToast(`${symbol} added to watchlist!`, 'success');
      }
    } catch (err) {
      console.error('Failed to add to watchlist:', err);
      showToast('Failed to add to watchlist', 'error');
    }
  };

  const handleAddTransaction = (symbol: string) => {
    // Navigate to transactions page with symbol pre-filled
    router.push(`/transactions?add=${symbol}`);
  };

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    const load = async (showLoader = true) => {
      try {
        if (showLoader) setLoading(true);
        const [idxRes, futRes, qsRes, secRes] = await Promise.all([
          fetch('/api/market/indices'),
          fetch('/api/market/futures'),
          fetch('/api/market/quickstats'),
          fetch('/api/market/sectors'),
        ]);

        if (!idxRes.ok || !futRes.ok) {
          throw new Error('Failed to load market data');
        }

        const [idxData, futData, qsData, secData] = await Promise.all([
          idxRes.json(),
          futRes.json(),
          qsRes.ok ? qsRes.json() : [],
          secRes.ok ? secRes.json() : [],
        ]);
        setIndices(idxData || []);
        setFutures(futData || []);
        setQuickStats(Array.isArray(qsData) ? qsData : []);
        setSectors(Array.isArray(secData) ? secData : []);
        setError(null);
        setLastUpdated(new Date().toLocaleTimeString());
      } catch (err: any) {
        console.error(err);
        setError('Unable to load market data');
      } finally {
        setLoading(false);
      }
    };

    load();
    timer = setInterval(() => load(false), 60_000);

    return () => {
      if (timer) clearInterval(timer);
    };
  }, []);

  // Find VIX for market sentiment
  const vix = quickStats.find(s => s.label === 'VIX');
  const marketOpen = quickStats[0]?.marketState === 'REGULAR';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <main className="container max-w-6xl mx-auto px-4 pt-4 pb-20 sm:pt-6 md:pb-10">
        
        {/* Header with Quick Stats */}
        <div className="mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Markets</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {lastUpdated && `Updated ${lastUpdated}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
                marketOpen 
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
              )}>
                <div className={cn('w-1.5 h-1.5 rounded-full', marketOpen ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400')} />
                {marketOpen ? 'Open' : 'Closed'}
              </div>
            </div>
          </div>

          {/* Quick Stats - Pill design */}
          {quickStats.length > 0 && (
            <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {quickStats.map((stat) => {
                const isUp = stat.change >= 0;
                return (
                  <div
                    key={stat.symbol}
                    className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                  >
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{stat.label}</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">
                      {stat.price.toFixed(2)}
                    </span>
                    <span className={cn(
                      'text-xs font-medium tabular-nums',
                      isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                    )}>
                      {isUp ? '+' : ''}{stat.changePercent.toFixed(2)}%
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-200 border border-red-100 dark:border-red-800 mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="p-4 rounded-2xl bg-white dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 animate-pulse h-48" />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Global Indices */}
            <section>
              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                Global Indices
              </h2>
              
              {/* Desktop: Side by side regions */}
              <div className="hidden md:grid md:grid-cols-3 gap-4">
                {regionGroups.map((group) => (
                  <div
                    key={group.region}
                    className="p-4 rounded-2xl bg-white dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800"
                  >
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100 dark:border-gray-700">
                      <span>{group.emoji}</span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{group.region}</span>
                    </div>
                    <div>
                      {group.items.map((item) => (
                        <MarketRow key={item.symbol} item={item} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Mobile: Swipeable */}
              <div className="md:hidden">
                <div
                  ref={regionScrollRef}
                  onScroll={handleRegionScroll}
                  className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-3"
                  style={{ scrollbarWidth: 'none' }}
                >
                  {regionGroups.map((group) => (
                    <div
                      key={group.region}
                      className="snap-center min-w-[85vw] p-4 rounded-2xl bg-white dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800"
                    >
                      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100 dark:border-gray-700">
                        <span>{group.emoji}</span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{group.region}</span>
                      </div>
                      <div>
                        {group.items.map((item) => (
                          <MarketRow key={item.symbol} item={item} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {regionGroups.length > 1 && (
                  <div className="flex justify-center gap-1.5 mt-2">
                    {regionGroups.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => scrollToRegion(idx)}
                        className={cn(
                          'w-1.5 h-1.5 rounded-full transition-all',
                          activeRegion === idx ? 'bg-gray-900 dark:bg-white w-3' : 'bg-gray-300 dark:bg-gray-600'
                        )}
                      />
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Futures & FX */}
            <section>
              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                Futures & FX
              </h2>
              
              {/* Desktop: Grid */}
              <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {futuresGroupsArray.map((group) => (
                  <div key={group.label} className="p-4 rounded-2xl bg-white dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">{group.label}</p>
                    {group.items.map((f) => (
                      <MarketRow key={f.symbol} item={f} />
                    ))}
                  </div>
                ))}
              </div>

              {/* Mobile: Swipeable */}
              <div className="sm:hidden">
                <div
                  ref={futuresScrollRef}
                  onScroll={handleFuturesScroll}
                  className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-3"
                  style={{ scrollbarWidth: 'none' }}
                >
                  {futuresGroupsArray.map((group) => (
                    <div
                      key={group.label}
                      className="snap-center min-w-[85vw] p-4 rounded-2xl bg-white dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800"
                    >
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">{group.label}</p>
                      {group.items.map((f) => (
                        <MarketRow key={f.symbol} item={f} />
                      ))}
                    </div>
                  ))}
                </div>
                {futuresGroupsArray.length > 1 && (
                  <div className="flex justify-center gap-1.5 mt-2">
                    {futuresGroupsArray.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => scrollToFutures(idx)}
                        className={cn(
                          'w-1.5 h-1.5 rounded-full transition-all',
                          activeFutures === idx ? 'bg-gray-900 dark:bg-white w-3' : 'bg-gray-300 dark:bg-gray-600'
                        )}
                      />
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Sector Movers */}
            {sectors.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                  Sector Movers
                </h2>
                
                {/* Desktop: Grid */}
                <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sectors.map((sector) => {
                    const isUp = sector.avgChange >= 0;
                    return (
                      <div key={sector.sector} className="p-4 rounded-2xl bg-white dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800">
                        {/* Sector header with performance */}
                        <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100 dark:border-gray-700">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{sector.emoji}</span>
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">{sector.sector}</span>
                          </div>
                          <div className={cn(
                            'px-2 py-0.5 rounded-full text-xs font-semibold',
                            isUp 
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                          )}>
                            {isUp ? '+' : ''}{sector.avgChange.toFixed(2)}%
                          </div>
                        </div>
                        
                        {/* Top stocks - Clickable */}
                        <div className="space-y-1">
                          {sector.stocks.map((stock) => {
                            const stockUp = stock.changePercent >= 0;
                            return (
                              <button
                                key={stock.symbol}
                                onClick={() => handleStockClick(stock)}
                                className="w-full flex items-center justify-between p-2 -mx-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                              >
                                <div className="min-w-0 flex-1 text-left">
                                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{stock.symbol}</p>
                                  <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">{stock.name}</p>
                                </div>
                                <div className="text-right ml-2">
                                  <p className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">
                                    {formatCurrency(stock.price)}
                                  </p>
                                  <p className={cn(
                                    'text-xs font-medium tabular-nums',
                                    stockUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                                  )}>
                                    {stockUp ? '+' : ''}{stock.changePercent.toFixed(2)}%
                                  </p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Mobile: Swipeable */}
                <div className="sm:hidden">
                  <div
                    ref={sectorsScrollRef}
                    onScroll={handleSectorsScroll}
                    className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-3"
                    style={{ scrollbarWidth: 'none' }}
                  >
                    {sectors.map((sector) => {
                      const isUp = sector.avgChange >= 0;
                      return (
                        <div key={sector.sector} className="snap-center min-w-[85vw] p-4 rounded-2xl bg-white dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800">
                          {/* Sector header */}
                          <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100 dark:border-gray-700">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{sector.emoji}</span>
                              <span className="text-sm font-semibold text-gray-900 dark:text-white">{sector.sector}</span>
                            </div>
                            <div className={cn(
                              'px-2 py-0.5 rounded-full text-xs font-semibold',
                              isUp 
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                            )}>
                              {isUp ? '+' : ''}{sector.avgChange.toFixed(2)}%
                            </div>
                          </div>
                          
                          {/* Stocks - Clickable */}
                          <div className="space-y-1">
                            {sector.stocks.map((stock) => {
                              const stockUp = stock.changePercent >= 0;
                              return (
                                <button
                                  key={stock.symbol}
                                  onClick={() => handleStockClick(stock)}
                                  className="w-full flex items-center justify-between p-2 -mx-2 rounded-xl active:bg-gray-100 dark:active:bg-gray-800/50 transition-colors"
                                >
                                  <div className="min-w-0 flex-1 text-left">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{stock.symbol}</p>
                                    <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">{stock.name}</p>
                                  </div>
                                  <div className="text-right ml-2">
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">
                                      {formatCurrency(stock.price)}
                                    </p>
                                    <p className={cn(
                                      'text-xs font-medium tabular-nums',
                                      stockUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                                    )}>
                                      {stockUp ? '+' : ''}{stock.changePercent.toFixed(2)}%
                                    </p>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {sectors.length > 1 && (
                    <div className="flex justify-center gap-1.5 mt-2">
                      {sectors.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => scrollToSector(idx)}
                          className={cn(
                            'w-1.5 h-1.5 rounded-full transition-all',
                            activeSector === idx ? 'bg-gray-900 dark:bg-white w-3' : 'bg-gray-300 dark:bg-gray-600'
                          )}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )}

          </div>
        )}
      </main>

      {/* Stock Action Sheet */}
      <StockActionSheet
        isOpen={actionSheetOpen}
        onClose={() => setActionSheetOpen(false)}
        stock={selectedStock}
        onAddToWatchlist={handleAddToWatchlist}
        onAddTransaction={handleAddTransaction}
      />

      {/* Toast */}
      {toast && (
        <ActionToast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
