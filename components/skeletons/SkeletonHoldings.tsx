export default function SkeletonHoldings() {
  return (
    <>
      {/* Portfolio Health Skeleton */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6 mb-4 animate-pulse">
        <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
        
        {/* Diversification Score */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-2"></div>
          <div className="h-3 w-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>

        {/* Mobile expand button */}
        <div className="sm:hidden mb-4">
          <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        </div>

        {/* Details section - hidden on mobile by default */}
        <div className="sm:block hidden">
          {/* Concentration Warnings */}
          <div className="mb-6">
            <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
            <div className="space-y-2">
              <div className="h-12 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-12 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          </div>

          {/* Top Holdings */}
          <div>
            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-3"></div>
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary Stats */}
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-2 gap-4">
            <div>
              <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
              <div className="h-6 w-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
            <div>
              <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
              <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Comparison Skeleton */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6 mb-4 animate-pulse">
        <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
        
        {/* Period selector */}
        <div className="flex flex-wrap gap-2 mb-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-8 w-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
          ))}
        </div>

        {/* Chart area */}
        <div className="h-64 sm:h-80 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>

        {/* Performance metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="h-3 w-24 bg-gray-200 dark:bg-gray-600 rounded mb-2"></div>
              <div className="h-6 w-20 bg-gray-200 dark:bg-gray-600 rounded mb-1"></div>
              <div className="h-4 w-16 bg-gray-200 dark:bg-gray-600 rounded"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Holdings Table Skeleton */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6 animate-pulse">
        <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
        
        {/* Table header */}
        <div className="hidden sm:grid sm:grid-cols-12 gap-4 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
            <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
          ))}
        </div>

        {/* Table rows */}
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-b-0">
              {/* Mobile view */}
              <div className="sm:hidden">
                <div className="flex items-center justify-between mb-2">
                  <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
                <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                <div className="h-16 w-full bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                <div className="flex gap-2">
                  <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
              </div>

              {/* Desktop view */}
              <div className="hidden sm:grid sm:grid-cols-12 gap-4 items-center">
                <div className="col-span-2">
                  <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
                <div className="col-span-1">
                  <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
                <div className="col-span-1">
                  <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
                <div className="col-span-1">
                  <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
                <div className="col-span-1">
                  <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
                <div className="col-span-1">
                  <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
                <div className="col-span-1">
                  <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
                <div className="col-span-1">
                  <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
                <div className="col-span-1">
                  <div className="h-16 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
                <div className="col-span-2">
                  <div className="flex gap-2">
                    <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

