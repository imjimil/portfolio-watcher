export default function SkeletonSidebar() {
  return (
    <div className="space-y-6">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm animate-pulse"
        >
          <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          <div className="space-y-3">
            <div className="h-12 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
            {i === 1 && (
              <div className="p-3 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
                <div className="h-4 w-full bg-gray-200 dark:bg-gray-600 rounded"></div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

