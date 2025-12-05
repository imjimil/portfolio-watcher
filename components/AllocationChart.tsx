'use client';

import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Holding } from '@/types';
import { formatPercent, formatCurrency, cn } from '@/lib/utils';

interface AllocationChartProps {
  holdings: Holding[];
}

const COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#f97316', // orange
  '#6366f1', // indigo
  '#14b8a6', // teal
  '#a855f7', // violet
];

// Custom tooltip
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    const isPositive = (data.payload.gainPercent || 0) >= 0;
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-3 min-w-[140px]">
        <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
          {data.name}
        </p>
        <p className="text-lg font-bold text-gray-900 dark:text-white">
          {formatCurrency(data.value)}
        </p>
        <div className="flex items-center justify-between mt-1 text-xs">
          <span className="text-gray-500 dark:text-gray-400">
            {formatPercent(data.payload.allocation, 1)} of portfolio
          </span>
        </div>
        {data.payload.gainPercent !== undefined && (
          <p className={cn(
            'text-xs mt-1 font-medium',
            isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
          )}>
            {isPositive ? '+' : ''}{data.payload.gainPercent.toFixed(1)}% return
          </p>
        )}
      </div>
    );
  }
  return null;
};

export default function AllocationChart({ holdings }: AllocationChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Sort by value and prepare data
  const sortedHoldings = [...holdings].sort((a, b) => b.currentValue - a.currentValue);
  
  // If more than 8 holdings, group smaller ones as "Others"
  const MAX_SLICES = 8;
  let chartData: { name: string; value: number; allocation: number; gainPercent?: number; isOthers?: boolean }[];
  
  if (sortedHoldings.length > MAX_SLICES) {
    const topHoldings = sortedHoldings.slice(0, MAX_SLICES - 1);
    const otherHoldings = sortedHoldings.slice(MAX_SLICES - 1);
    const othersValue = otherHoldings.reduce((sum, h) => sum + h.currentValue, 0);
    const othersAllocation = otherHoldings.reduce((sum, h) => sum + h.allocation, 0);
    
    chartData = [
      ...topHoldings.map(h => ({
        name: h.symbol,
        value: h.currentValue,
        allocation: h.allocation,
        gainPercent: h.gainLossPercent,
      })),
      {
        name: `Others (${otherHoldings.length})`,
        value: othersValue,
        allocation: othersAllocation,
        isOthers: true,
      },
    ];
  } else {
    chartData = sortedHoldings.map(h => ({
      name: h.symbol,
      value: h.currentValue,
      allocation: h.allocation,
      gainPercent: h.gainLossPercent,
    }));
  }

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        No holdings to display
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex flex-col md:flex-row items-center gap-4">
        {/* Pie Chart */}
        <div className="w-full md:w-1/2">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius="45%"
                outerRadius="80%"
                paddingAngle={2}
                dataKey="value"
                onMouseEnter={(_, index) => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.isOthers ? '#9ca3af' : COLORS[index % COLORS.length]}
                    stroke={activeIndex === index ? '#fff' : 'transparent'}
                    strokeWidth={activeIndex === index ? 2 : 0}
                    style={{
                      filter: activeIndex === index ? 'brightness(1.1)' : 'none',
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="w-full md:w-1/2">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {chartData.map((entry, index) => {
              const isPositive = (entry.gainPercent || 0) >= 0;
              return (
                <div
                  key={entry.name}
                  className={cn(
                    'flex items-center gap-2 p-2 rounded-lg transition-colors cursor-pointer',
                    activeIndex === index ? 'bg-gray-100 dark:bg-gray-700/50' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  )}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                >
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: entry.isOthers ? '#9ca3af' : COLORS[index % COLORS.length] }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-medium text-gray-900 dark:text-white truncate">
                        {entry.name}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                        {formatPercent(entry.allocation, 1)}
                      </span>
                    </div>
                    {!entry.isOthers && entry.gainPercent !== undefined && (
                      <span className={cn(
                        'text-[10px] tabular-nums',
                        isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
                      )}>
                        {isPositive ? '+' : ''}{entry.gainPercent.toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
