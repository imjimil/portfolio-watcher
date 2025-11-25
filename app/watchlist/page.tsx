'use client';

import Navbar from '@/components/Navbar';
import Watchlist from '@/components/Watchlist';

export default function WatchlistPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-7xl">
        <Watchlist />
      </main>
    </div>
  );
}

