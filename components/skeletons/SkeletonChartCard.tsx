export default function SkeletonChartCard({ className = '' }: { className?: string }) {
  return (
    <div
      className={`rounded-lg border bg-white dark:bg-gray-800 p-3 sm:p-4 lg:p-6 shadow-sm animate-pulse ${className}`}
    >
      <div className="mb-3 sm:mb-4">
        <div className="h-5 sm:h-6 w-40 sm:w-48 bg-gray-200 dark:bg-gray-700 rounded mb-2 sm:mb-3"></div>
        <div className="h-6 sm:h-7 w-32 sm:w-40 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
        <div className="h-4 sm:h-5 w-24 sm:w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
      <div className="h-48 sm:h-64 lg:h-80 bg-gray-200 dark:bg-gray-700 rounded"></div>
    </div>
  );
}

