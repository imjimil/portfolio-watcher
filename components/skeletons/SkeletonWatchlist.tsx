export default function SkeletonWatchlist() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between animate-pulse">
        <div>
          <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded mt-2"></div>
        </div>
        <div className="flex items-center gap-2 md:hidden">
          <div className="h-9 w-9 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          <div className="h-9 w-9 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        </div>
      </div>

      {/* Stats Cards - Mobile */}
      <div className="md:hidden animate-pulse">
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-3 px-3">
          {[1, 2, 3, 4].map((i) => (
            <div 
              key={i} 
              className="flex-shrink-0 bg-white dark:bg-gray-800/50 rounded-xl px-4 py-3 min-w-[100px]"
            >
              <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
              <div className="h-6 w-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats Cards - Desktop */}
      <div className="hidden md:grid md:grid-cols-4 lg:grid-cols-6 gap-3 animate-pulse">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div 
            key={i} 
            className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700"
          >
            <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
            <div className="h-7 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        ))}
      </div>

      {/* Filter/Sort bar - Desktop */}
      <div className="hidden md:flex items-center justify-between animate-pulse">
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-9 w-20 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          <div className="h-9 w-9 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          <div className="h-9 w-9 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          <div className="h-9 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        </div>
      </div>

      {/* Watchlist Items - Mobile */}
      <div className="md:hidden space-y-2 animate-pulse">
        {[1, 2, 3, 4, 5].map((i) => (
          <div 
            key={i} 
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700/50 overflow-hidden"
          >
            <div className="px-4 py-3">
              <div className="flex items-center justify-between">
                {/* Left side - Symbol & Name */}
                <div className="min-w-0 flex-1 mr-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  </div>
                  <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>

                {/* Center - Sparkline */}
                <div className="w-20 h-7 mx-3 flex-shrink-0">
                  <div className="h-full w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>

                {/* Right side - Price & Change */}
                <div className="text-right flex-shrink-0">
                  <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded mb-1 ml-auto"></div>
                  <div className="h-4 w-14 bg-gray-200 dark:bg-gray-700 rounded ml-auto"></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Watchlist Items - Desktop Grid */}
      <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div 
            key={i} 
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700/50 overflow-hidden"
          >
            <div className="p-4">
              {/* Header row */}
              <div className="flex items-center gap-4 mb-3">
                <div className="min-w-[120px]">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  </div>
                  <div className="h-3 w-28 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>

                {/* Sparkline */}
                <div className="flex-1 h-10">
                  <div className="h-full w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>

                {/* Price */}
                <div className="text-right min-w-[80px]">
                  <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded mb-1 ml-auto"></div>
                  <div className="h-4 w-14 bg-gray-200 dark:bg-gray-700 rounded ml-auto"></div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-gray-700/50">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="flex-1 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg"></div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

