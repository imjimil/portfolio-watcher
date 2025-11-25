export default function SkeletonProfileInfo() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700"></div>
      </div>
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i}>
            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
            <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

