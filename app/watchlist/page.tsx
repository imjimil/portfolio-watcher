'use client';

import Navbar from '@/components/Navbar';
import Watchlist from '@/components/Watchlist';

export default function WatchlistPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-7xl">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
            Watchlist
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
            Track stocks you're interested in
          </p>
        </div>

        <Watchlist />
      </main>
    </div>
  );
}

