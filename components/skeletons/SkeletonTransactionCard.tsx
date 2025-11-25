export default function SkeletonTransactionCard({ className = '' }: { className?: string }) {
  return (
    <div
      className={`rounded-lg border bg-white dark:bg-gray-800 p-2 sm:p-4 lg:p-6 shadow-sm animate-pulse ${className}`}
    >
      <div className="h-5 sm:h-6 w-40 sm:w-48 bg-gray-200 dark:bg-gray-700 rounded mb-3 sm:mb-4"></div>
      <div className="space-y-1.5 sm:space-y-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between p-1.5 sm:p-2 lg:p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
          >
            <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-4 min-w-0 flex-1">
              <div className="min-w-0 flex-1">
                <div className="h-4 sm:h-5 w-16 sm:w-20 bg-gray-200 dark:bg-gray-600 rounded mb-1"></div>
                <div className="h-3 sm:h-4 w-20 sm:w-24 bg-gray-200 dark:bg-gray-600 rounded"></div>
              </div>
              <div className="h-5 sm:h-6 w-12 sm:w-16 bg-gray-200 dark:bg-gray-600 rounded"></div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="h-4 sm:h-5 w-20 sm:w-24 bg-gray-200 dark:bg-gray-600 rounded mb-1"></div>
              <div className="h-3 sm:h-4 w-16 sm:w-20 bg-gray-200 dark:bg-gray-600 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

