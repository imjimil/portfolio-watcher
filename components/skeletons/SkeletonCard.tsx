export default function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div
      className={`rounded-lg border bg-white dark:bg-gray-800 p-3 sm:p-4 lg:p-6 shadow-sm animate-pulse ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="h-3 sm:h-4 w-20 sm:w-24 bg-gray-200 dark:bg-gray-700 rounded mb-2 sm:mb-3"></div>
          <div className="h-6 sm:h-7 lg:h-8 w-24 sm:w-32 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
          <div className="h-3 sm:h-4 w-16 sm:w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
        <div className="rounded-full bg-gray-200 dark:bg-gray-700 p-2 sm:p-2.5 lg:p-3 flex-shrink-0">
          <div className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6"></div>
        </div>
      </div>
    </div>
  );
}

