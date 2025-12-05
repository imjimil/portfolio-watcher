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
  variant?: 'default' | 'compact';
}

export default function StatCard({
  title,
  value,
  change,
  changePercent,
  icon: Icon,
  format = 'currency',
  className,
  variant = 'default',
}: StatCardProps) {
  const formatValue = () => {
    switch (format) {
      case 'currency':
        return formatCurrency(value);
      case 'percent':
        return formatPercent(value, 2, true);
      default:
        return value.toLocaleString();
    }
  };

  const isPositive = (change !== undefined && change >= 0) || (changePercent !== undefined && changePercent >= 0);

  if (variant === 'compact') {
    return (
      <div className={cn(
        'bg-white dark:bg-gray-800/50 rounded-xl p-3 sm:p-4',
        className
      )}>
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {title}
            </p>
            <p className="mt-1 text-base sm:text-lg lg:text-xl font-bold text-gray-900 dark:text-white tabular-nums break-words">
              {formatValue()}
            </p>
            {(change !== undefined || changePercent !== undefined) && (
              <p className={cn(
                'mt-0.5 text-xs sm:text-sm font-medium tabular-nums',
                isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
              )}>
                {changePercent !== undefined && (
                  <span>{isPositive ? '+' : ''}{changePercent.toFixed(2)}%</span>
                )}
              </p>
            )}
          </div>
          {Icon && (
            <div className={cn(
              'p-2 sm:p-2.5 rounded-xl flex-shrink-0',
              isPositive 
                ? 'bg-emerald-50 dark:bg-emerald-900/20' 
                : change !== undefined || changePercent !== undefined
                  ? 'bg-red-50 dark:bg-red-900/20'
                  : 'bg-blue-50 dark:bg-blue-900/20'
            )}>
              <Icon className={cn(
                'h-4 w-4 sm:h-5 sm:w-5',
                isPositive 
                  ? 'text-emerald-600 dark:text-emerald-400' 
                  : change !== undefined || changePercent !== undefined
                    ? 'text-red-500 dark:text-red-400'
                    : 'text-blue-600 dark:text-blue-400'
              )} />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'bg-white dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700/50 p-3 sm:p-4 lg:p-5 transition-shadow hover:shadow-md min-w-0',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 overflow-hidden">
          <p className="text-[10px] sm:text-xs lg:text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            {title}
          </p>
          <p className="text-base sm:text-lg lg:text-xl xl:text-2xl font-bold text-gray-900 dark:text-white tabular-nums break-all leading-tight">
            {formatValue()}
          </p>
          {(change !== undefined || changePercent !== undefined) && (
            <div className="mt-2 flex items-center gap-2">
              {change !== undefined && (
                <span className={cn(
                  'text-sm font-medium tabular-nums',
                  isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
                )}>
                  {isPositive ? '+' : ''}{formatCurrency(change)}
                </span>
              )}
              {changePercent !== undefined && (
                <span className={cn(
                  'px-2 py-0.5 text-xs font-semibold rounded-full tabular-nums',
                  isPositive 
                    ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' 
                    : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                )}>
                  {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
                </span>
              )}
            </div>
          )}
        </div>
        {Icon && (
          <div className={cn(
            'p-2 sm:p-2.5 lg:p-3 rounded-xl flex-shrink-0',
            isPositive 
              ? 'bg-emerald-50 dark:bg-emerald-900/20' 
              : change !== undefined || changePercent !== undefined
                ? 'bg-red-50 dark:bg-red-900/20'
                : 'bg-blue-50 dark:bg-blue-900/20'
          )}>
            <Icon className={cn(
              'h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6',
              isPositive 
                ? 'text-emerald-600 dark:text-emerald-400' 
                : change !== undefined || changePercent !== undefined
                  ? 'text-red-500 dark:text-red-400'
                  : 'text-blue-600 dark:text-blue-400'
            )} />
          </div>
        )}
      </div>
    </div>
  );
}
