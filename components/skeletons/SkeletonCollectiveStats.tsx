export default function SkeletonCollectiveStats() {
  return (
    <div className="mb-6 sm:mb-8 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-4 sm:p-6 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1">
          <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
          <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
        <div className="text-right">
          <div className="h-8 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
          <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-1"></div>
          <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
        {[1, 2, 3, 4].map((i) => (
          <div key={i}>
            <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
            <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

