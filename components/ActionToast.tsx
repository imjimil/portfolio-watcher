'use client';

import { useState, useEffect, useRef } from 'react';
import { X, CheckCircle2, XCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActionToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
}

export default function ActionToast({ 
  message, 
  type = 'success',
  onClose 
}: ActionToastProps) {
  const [progress, setProgress] = useState(100);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const toastRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number | null>(null);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    // Start fresh
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
      if (!startTimeRef.current) {
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
        isInitializedRef.current = false;
        onClose();
        return;
      }

      setProgress(newProgress);
    }, 50);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [message, onClose]);

  // Swipe handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = e.touches[0].clientX;
    setIsSwiping(true);
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
      startTimeRef.current = null;
      isInitializedRef.current = false;
      onClose();
    } else {
      // Reset position
      setSwipeOffset(0);
    }
    touchStartRef.current = null;
    setIsSwiping(false);
  };

  const handleClose = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    startTimeRef.current = null;
    isInitializedRef.current = false;
    onClose();
  };

  // Color and icon configuration
  const config = {
    success: {
      icon: CheckCircle2,
      bgColor: 'bg-emerald-600 dark:bg-emerald-500',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      progressColor: 'bg-emerald-500 dark:bg-emerald-400',
    },
    error: {
      icon: XCircle,
      bgColor: 'bg-red-600 dark:bg-red-500',
      iconBg: 'bg-red-100 dark:bg-red-900/30',
      iconColor: 'text-red-600 dark:text-red-400',
      progressColor: 'bg-red-500 dark:bg-red-400',
    },
    info: {
      icon: Info,
      bgColor: 'bg-gray-800 dark:bg-gray-700',
      iconBg: 'bg-gray-100 dark:bg-gray-800',
      iconColor: 'text-gray-600 dark:text-gray-400',
      progressColor: 'bg-gray-500 dark:bg-gray-400',
    },
  };

  const { icon: Icon, bgColor, iconBg, iconColor, progressColor } = config[type];

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
          className={cn('h-full transition-all duration-100 ease-linear', progressColor)}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Content */}
      <div className="p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={cn('w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0', iconBg)}>
            <Icon className={cn('h-5 w-5', iconColor)} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {message}
            </p>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
        >
          <X className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        </button>
      </div>
    </div>
  );
}

