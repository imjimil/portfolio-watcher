'use client';

import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, ReferenceLine } from 'recharts';
import { HistoricalData } from '@/types';
import { formatCurrency } from '@/lib/utils';

// Custom tooltip component
const CustomTooltip = ({ active, payload, label, isIntraday, startValue }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const value = data.value;
    const costBasis = data.costBasis || 0;
    
    const gainLoss = isIntraday ? (value - startValue) : (value - costBasis);
    const baseValue = isIntraday ? startValue : costBasis;
    const gainLossPercent = baseValue > 0 ? (gainLoss / baseValue) * 100 : 0;
    
    const isPositive = gainLoss >= 0;
    
    // Format date from dateFull or label
    let formattedDate = label;
    if (data.dateFull) {
      if (data.dateFull.includes(' ')) {
        const [datePart, timePart] = data.dateFull.split(' ');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hours, minutes] = timePart.split(':').map(Number);
        const date = new Date(year, month - 1, day, hours, minutes);
        
        // Check if this is yesterday's close
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const isYesterdayClose = hours === 16 && minutes === 0 && 
          year === yesterday.getFullYear() && 
          month === yesterday.getMonth() + 1 && 
          day === yesterday.getDate();
        
        if (isYesterdayClose) {
          formattedDate = 'Yesterday Close';
        } else {
          formattedDate = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        }
      } else {
        const [year, month, day] = data.dateFull.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        formattedDate = date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
      }
    }
    
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg p-2">
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
          {formattedDate}
        </p>
        <div className="flex items-baseline gap-2">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {formatCurrency(value)}
          </p>
        </div>
        <div className="mt-1 space-y-0.5">
          {!isIntraday && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Cost Basis: {formatCurrency(costBasis)}
          </p>
          )}
          <p className={`text-xs font-medium ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {isPositive ? '+' : ''}{formatCurrency(gainLoss)} ({isPositive ? '+' : ''}{gainLossPercent.toFixed(2)}%)
          </p>
        </div>
      </div>
    );
  }
  return null;
};

interface PortfolioChartProps {
  data: HistoricalData[];
  height?: number;
  period?: '1d' | '5d' | '1m' | '6m' | 'ytd' | 'all';
  currentValue?: number;
  costBasis?: number;
  transactions?: any[];
  periodGain?: number; // The actual calculated gain/loss for this period
}

export default function PortfolioChart({ 
  data, 
  height = 300, 
  period = '1m',
  currentValue,
  costBasis,
  periodGain,
}: PortfolioChartProps) {
  if (data.length === 0) {
    return (
      <div className="w-full h-[300px] flex items-center justify-center text-gray-500">
        No data available
      </div>
    );
  }

  // Transform data for chart
  const chartData = data.map(item => {
    const isIntraday = period === '1d' && item.date.includes(' ');
    let date: Date;
    let displayDate: string;
    let dateFull: string;
    
    if (isIntraday) {
      const [datePart, timePart] = item.date.split(' ');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hours, minutes] = timePart.split(':').map(Number);
      date = new Date(year, month - 1, day, hours, minutes);
      
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const isYesterdayClose = hours === 16 && minutes === 0 && 
        year === yesterday.getFullYear() && 
        month === yesterday.getMonth() + 1 && 
        day === yesterday.getDate();
      
      if (isYesterdayClose) {
        displayDate = 'Yesterday Close';
      } else {
        displayDate = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      }
      dateFull = item.date;
    } else {
      const [year, month, day] = item.date.split('-').map(Number);
      date = new Date(year, month - 1, day);
      
      if (period === '5d') {
        displayDate = date.toLocaleDateString('en-US', { weekday: 'short' });
      } else {
        displayDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
      dateFull = item.date;
    }
    
    return {
      date: displayDate,
      dateFull: dateFull,
      value: item.price,
      costBasis: item.volume, // Cost basis stored in volume field
    };
  });

  const startValue = chartData[0]?.value || 0;
  const isIntraday = period === '1d';
  const isPositive = periodGain !== undefined 
    ? periodGain >= 0 
    : (chartData[chartData.length - 1]?.value || 0) >= startValue;
  
  // Calculate Y-axis domain
  const values = chartData.map(d => d.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue;
  
  let padding: number;
  if (range === 0) {
    padding = maxValue * 0.05;
  } else if (range / maxValue < 0.1) {
    padding = Math.max(range * 0.02, maxValue * 0.01);
  } else {
    padding = Math.max(range * 0.05, maxValue * 0.02);
  }

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0.3} />
              <stop offset="95%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700 opacity-50" />
          <XAxis
            dataKey="date"
            className="text-xs"
            tick={{ fill: 'currentColor' }}
          />
          <YAxis
            hide={true}
            domain={[minValue - padding, maxValue + padding]}
          />
          <Tooltip content={<CustomTooltip isIntraday={isIntraday} startValue={startValue} />} />
          {startValue > 0 && (
            <ReferenceLine 
              y={startValue} 
              stroke="#6b7280" 
              strokeDasharray="5 5" 
              strokeWidth={1.5}
              label={{ 
                value: `Start (${formatCurrency(startValue)})`, 
                position: 'right', 
                fill: '#6b7280', 
                fontSize: 12 
              }}
            />
          )}
          <Area
            type="monotone"
            dataKey="value"
            stroke={isPositive ? "#10b981" : "#ef4444"}
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorValue)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
