'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Eye, Plus, TrendingUp, TrendingDown } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';

type StockActionSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  stock: {
    symbol: string;
    name: string;
    price: number;
    changePercent: number;
  } | null;
  onAddToWatchlist: (symbol: string) => void;
  onAddTransaction: (symbol: string) => void;
};

export default function StockActionSheet({
  isOpen,
  onClose,
  stock,
  onAddToWatchlist,
  onAddTransaction,
}: StockActionSheetProps) {
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartY = useRef<number | null>(null);
  const dragOffsetRef = useRef(0); // Track current drag offset for event handlers
  const sheetRef = useRef<HTMLDivElement>(null);

  // Prevent body scroll when dragging
  useEffect(() => {
    if (isDragging) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isDragging]);

  // Sync dragOffset to ref for event handlers
  useEffect(() => {
    dragOffsetRef.current = dragOffset;
  }, [dragOffset]);

  // Native event listeners with passive: false to allow preventDefault
  useEffect(() => {
    if (!isOpen || !stock || !sheetRef.current) return;

    const element = sheetRef.current;
    const handleArea = element.querySelector('[data-drag-handle]') as HTMLElement;
    const headerArea = element.querySelector('[data-drag-header]') as HTMLElement;
    
    if (!handleArea || !headerArea) return;

    const handleTouchStart = (e: TouchEvent) => {
      e.stopPropagation();
      touchStartY.current = e.touches[0].clientY;
      setIsDragging(true);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (touchStartY.current === null) return;
      e.preventDefault(); // Now this works because listener is non-passive
      e.stopPropagation();
      const currentY = e.touches[0].clientY;
      const diff = currentY - touchStartY.current;
      if (diff > 0) {
        setDragOffset(diff);
      } else {
        setDragOffset(0);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.stopPropagation();
      const currentOffset = dragOffsetRef.current;
      if (currentOffset > 100) {
        onClose();
      }
      setDragOffset(0);
      touchStartY.current = null;
      setIsDragging(false);
    };

    // Add listeners with { passive: false } to allow preventDefault
    handleArea.addEventListener('touchstart', handleTouchStart, { passive: false });
    handleArea.addEventListener('touchmove', handleTouchMove, { passive: false });
    handleArea.addEventListener('touchend', handleTouchEnd, { passive: false });
    
    headerArea.addEventListener('touchstart', handleTouchStart, { passive: false });
    headerArea.addEventListener('touchmove', handleTouchMove, { passive: false });
    headerArea.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      handleArea.removeEventListener('touchstart', handleTouchStart);
      handleArea.removeEventListener('touchmove', handleTouchMove);
      handleArea.removeEventListener('touchend', handleTouchEnd);
      
      headerArea.removeEventListener('touchstart', handleTouchStart);
      headerArea.removeEventListener('touchmove', handleTouchMove);
      headerArea.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isOpen, stock, onClose]);

  if (!isOpen || !stock) return null;

  const isUp = stock.changePercent >= 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] transition-opacity"
        onClick={onClose}
        onTouchStart={(e) => {
          // Only close if not dragging the sheet
          if (!isDragging) {
            onClose();
          }
        }}
      />

      {/* Sheet - Mobile: bottom sheet, Desktop: centered modal */}
      <div
        ref={sheetRef}
        className={cn(
          'fixed z-[70] bg-white dark:bg-gray-900',
          // Mobile: bottom sheet
          'inset-x-0 bottom-0 rounded-t-3xl sm:rounded-2xl',
          // Desktop: centered
          'sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-sm',
          // Transition only when not dragging
          !isDragging && 'transition-all',
          // Opacity based on drag
          isDragging && dragOffset > 0 && 'opacity-90'
        )}
        style={{
          transform: isDragging
            ? `translateY(${dragOffset}px)`
            : undefined,
        }}
        onClick={(e) => e.stopPropagation()} // Prevent backdrop click
      >
        {/* Handle bar for mobile - draggable area */}
        <div
          data-drag-handle
          className="sm:hidden flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing"
          style={{ touchAction: 'none' }} // Prevent default touch behaviors
        >
          <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-700" />
        </div>
        
        {/* Close button for desktop */}
        <button
          onClick={onClose}
          className="hidden sm:flex absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-5 sm:p-6">
          {/* Header area - draggable on mobile */}
          <div
            data-drag-header
            className="sm:hidden"
            style={{ touchAction: 'none' }}
          >
            {/* Stock info */}
            <div className="flex items-start gap-4 mb-6">
              <div className={cn(
                'p-3 rounded-2xl',
                isUp ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'
              )}>
                {isUp ? (
                  <TrendingUp className={cn('h-6 w-6', 'text-emerald-600 dark:text-emerald-400')} />
                ) : (
                  <TrendingDown className={cn('h-6 w-6', 'text-red-600 dark:text-red-400')} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{stock.symbol}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{stock.name}</p>
              </div>
            </div>

            {/* Price info */}
            <div className="flex items-baseline justify-between mb-6 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Price</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">
                  {formatCurrency(stock.price)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Today</p>
                <p className={cn(
                  'text-lg font-bold tabular-nums',
                  isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                )}>
                  {isUp ? '+' : ''}{stock.changePercent.toFixed(2)}%
                </p>
              </div>
            </div>
          </div>

          {/* Desktop version - not draggable */}
          <div className="hidden sm:block">
            {/* Stock info */}
            <div className="flex items-start gap-4 mb-6">
              <div className={cn(
                'p-3 rounded-2xl',
                isUp ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'
              )}>
                {isUp ? (
                  <TrendingUp className={cn('h-6 w-6', 'text-emerald-600 dark:text-emerald-400')} />
                ) : (
                  <TrendingDown className={cn('h-6 w-6', 'text-red-600 dark:text-red-400')} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{stock.symbol}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{stock.name}</p>
              </div>
            </div>

            {/* Price info */}
            <div className="flex items-baseline justify-between mb-6 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Price</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">
                  {formatCurrency(stock.price)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Today</p>
                <p className={cn(
                  'text-lg font-bold tabular-nums',
                  isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                )}>
                  {isUp ? '+' : ''}{stock.changePercent.toFixed(2)}%
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-3">
            <button
              onClick={(e) => {
                // Prevent click if we just finished dragging
                if (isDragging || dragOffset > 10) {
                  e.preventDefault();
                  return;
                }
                onAddToWatchlist(stock.symbol);
                onClose();
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <Eye className="h-5 w-5" />
              Add to Watchlist
            </button>
            <button
              onClick={(e) => {
                // Prevent click if we just finished dragging
                if (isDragging || dragOffset > 10) {
                  e.preventDefault();
                  return;
                }
                onAddTransaction(stock.symbol);
                onClose();
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-5 w-5" />
              Add Transaction
            </button>
          </div>

          {/* Safe area for mobile */}
          <div className="h-6 sm:h-0" />
        </div>
      </div>
    </>
  );
}

