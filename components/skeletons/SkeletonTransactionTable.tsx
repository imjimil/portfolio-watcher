export default function SkeletonTransactionTable() {
  return (
    <div className="rounded-lg border bg-white dark:bg-gray-800 overflow-hidden animate-pulse">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th className="px-3 sm:px-6 py-3">
                <div className="h-3 w-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </th>
              <th className="px-3 sm:px-6 py-3">
                <div className="h-3 w-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </th>
              <th className="px-3 sm:px-6 py-3">
                <div className="h-3 w-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </th>
              <th className="px-3 sm:px-6 py-3">
                <div className="h-3 w-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </th>
              <th className="px-3 sm:px-6 py-3">
                <div className="h-3 w-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </th>
              <th className="px-3 sm:px-6 py-3">
                <div className="h-3 w-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </th>
              <th className="px-3 sm:px-6 py-3">
                <div className="h-3 w-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {[...Array(5)].map((_, i) => (
              <tr key={i} className="animate-pulse">
                <td className="px-3 sm:px-6 py-3 sm:py-4">
                  <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </td>
                <td className="px-3 sm:px-6 py-3 sm:py-4">
                  <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </td>
                <td className="px-3 sm:px-6 py-3 sm:py-4">
                  <div className="h-5 w-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </td>
                <td className="px-3 sm:px-6 py-3 sm:py-4">
                  <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </td>
                <td className="px-3 sm:px-6 py-3 sm:py-4">
                  <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </td>
                <td className="px-3 sm:px-6 py-3 sm:py-4">
                  <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </td>
                <td className="px-3 sm:px-6 py-3 sm:py-4">
                  <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

