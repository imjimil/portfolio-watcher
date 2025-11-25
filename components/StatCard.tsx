import { LucideIcon } from 'lucide-react';
import { formatCurrency, formatPercent, getColorForValue } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: number;
  change?: number;
  changePercent?: number;
  icon?: LucideIcon;
  format?: 'currency' | 'percent' | 'number';
  className?: string;
}

export default function StatCard({
  title,
  value,
  change,
  changePercent,
  icon: Icon,
  format = 'currency',
  className,
}: StatCardProps) {
  const formatValue = () => {
    switch (format) {
      case 'currency':
        return formatCurrency(value);
      case 'percent':
        return formatPercent(value);
      default:
        return value.toLocaleString();
    }
  };

  return (
    <div
      className={cn(
        'rounded-lg border bg-white dark:bg-gray-800 p-3 sm:p-4 lg:p-6 shadow-sm transition-shadow hover:shadow-md',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 truncate">
            {title}
          </p>
          <p className="mt-1 sm:mt-2 text-lg sm:text-xl lg:text-2xl font-bold truncate">{formatValue()}</p>
          {(change !== undefined || changePercent !== undefined) && (
            <div className="mt-1 sm:mt-2 flex items-center gap-1 sm:gap-2 flex-wrap">
              {change !== undefined && (
                <span className={cn('text-xs sm:text-sm font-medium', getColorForValue(change))}>
                  {change >= 0 ? '+' : ''}
                  {formatCurrency(change)}
                </span>
              )}
              {changePercent !== undefined && (
                <span className={cn('text-xs sm:text-sm font-medium', getColorForValue(changePercent))}>
                  {formatPercent(changePercent)}
                </span>
              )}
            </div>
          )}
        </div>
        {Icon && (
          <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-2 sm:p-2.5 lg:p-3 flex-shrink-0">
            <Icon className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-blue-600 dark:text-blue-400" />
          </div>
        )}
      </div>
    </div>
  );
}

