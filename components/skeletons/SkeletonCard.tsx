export default function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div
      className={`rounded-lg border bg-white dark:bg-gray-800 p-2.5 sm:p-4 lg:p-5 shadow-sm animate-pulse ${className}`}
    >
      <div className="flex items-start justify-between gap-1.5 sm:gap-2">
        <div className="flex-1 min-w-0">
          <div className="h-2.5 sm:h-3.5 w-16 sm:w-24 bg-gray-200 dark:bg-gray-700 rounded mb-1.5 sm:mb-2"></div>
          <div className="h-5 sm:h-7 w-20 sm:w-32 bg-gray-200 dark:bg-gray-700 rounded mb-1 sm:mb-2"></div>
          <div className="h-2.5 sm:h-3.5 w-14 sm:w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
        <div className="rounded-full bg-gray-200 dark:bg-gray-700 p-1.5 sm:p-2.5 lg:p-3 flex-shrink-0">
          <div className="h-3.5 w-3.5 sm:h-5 sm:w-5 lg:h-6 lg:w-6"></div>
        </div>
      </div>
    </div>
  );
}

