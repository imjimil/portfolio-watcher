'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Undo2 } from 'lucide-react';
import { Transaction } from '@/types';
import { cn } from '@/lib/utils';

interface DeleteToastProps {
  transaction: Transaction | null;
  onUndo: () => void;
  onClose: () => void;
}

export default function DeleteToast({ transaction, onUndo, onClose }: DeleteToastProps) {
  const [progress, setProgress] = useState(100);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const toastRef = useRef<HTMLDivElement>(null);
  const transactionIdRef = useRef<string | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (!transaction) {
      // Reset when transaction is cleared
      transactionIdRef.current = null;
      startTimeRef.current = null;
      isInitializedRef.current = false;
      setProgress(100);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const currentTransactionId = transaction.id;

    // If this is the same transaction ID and already initialized, don't restart
    if (transactionIdRef.current === currentTransactionId && isInitializedRef.current && intervalRef.current) {
      return;
    }

    // New transaction - start fresh
    transactionIdRef.current = currentTransactionId;
    startTimeRef.current = Date.now();
    isInitializedRef.current = true;
    setProgress(100);

    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Start progress bar countdown (3 seconds)
    intervalRef.current = setInterval(() => {
      if (!startTimeRef.current || transactionIdRef.current !== currentTransactionId) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        return;
      }
      
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, 3000 - elapsed);
      const newProgress = (remaining / 3000) * 100;

      if (newProgress <= 0) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        startTimeRef.current = null;
        transactionIdRef.current = null;
        isInitializedRef.current = false;
        onClose();
        return;
      }

      setProgress(newProgress);
    }, 50); // Update more frequently for smoother animation

    // Cleanup: only clear if transaction ID actually changed
    return () => {
      // Only cleanup if the transaction ID changed (not just a re-render with same ID)
      if (transactionIdRef.current !== currentTransactionId) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        if (!transaction || transaction.id !== transactionIdRef.current) {
          startTimeRef.current = null;
          isInitializedRef.current = false;
        }
      }
    };
  }, [transaction?.id]); // Only depend on transaction ID

  const handleUndo = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    transactionIdRef.current = null;
    startTimeRef.current = null;
    isInitializedRef.current = false;
    onUndo();
    onClose();
  };

  // Swipe handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = e.touches[0].clientX;
    setIsSwiping(true);
    // Pause timer while swiping, but don't clear it
    // Timer will resume when swipe ends if not dismissed
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartRef.current === null) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - touchStartRef.current;
    setSwipeOffset(diff);
  };

  const handleTouchEnd = () => {
    if (Math.abs(swipeOffset) > 50) {
      // Swiped enough to dismiss
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      transactionIdRef.current = null;
      startTimeRef.current = null;
      isInitializedRef.current = false;
      onClose();
    } else {
      // Reset position - timer continues from where it was
      setSwipeOffset(0);
    }
    touchStartRef.current = null;
    setIsSwiping(false);
  };

  if (!transaction) return null;

  return (
    <div
      ref={toastRef}
      className={cn(
        'fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:bottom-6 md:w-96 z-[100]',
        'bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700',
        'transform transition-all duration-300 ease-out',
        swipeOffset !== 0 ? 'opacity-90' : 'opacity-100'
      )}
      style={{
        transform: `translateX(${swipeOffset}px) translateY(0)`,
        transition: isSwiping ? 'none' : 'transform 0.3s ease-out, opacity 0.3s ease-out'
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Progress Bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gray-100 dark:bg-gray-700 rounded-t-xl overflow-hidden">
        <div
          className="h-full bg-blue-600 dark:bg-blue-500 transition-all duration-100 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Content */}
      <div className="p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
            <Undo2 className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              Transaction deleted
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {transaction.symbol} • {transaction.type}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleUndo}
            className="px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
          >
            Undo
          </button>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors md:block hidden"
          >
            <X className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  );
}

