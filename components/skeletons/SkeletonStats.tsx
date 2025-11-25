export default function SkeletonStats() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm animate-pulse">
      <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-6"></div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="text-center p-4 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
            <div className="h-6 w-6 bg-gray-200 dark:bg-gray-600 rounded mx-auto mb-2"></div>
            <div className="h-8 w-12 bg-gray-200 dark:bg-gray-600 rounded mx-auto mb-2"></div>
            <div className="h-4 w-16 bg-gray-200 dark:bg-gray-600 rounded mx-auto"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

