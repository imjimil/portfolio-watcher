'use client';

import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, ReferenceLine } from 'recharts';
import { HistoricalData } from '@/types';
import { formatCurrency } from '@/lib/utils';

// Custom tooltip component
const CustomTooltip = ({ active, payload, label, period, currentValue, costBasis }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const value = data.value;
    
    // Calculate percentage based on period
    let gainPercent = 0;
    if (period === 'all' && currentValue !== undefined && costBasis !== undefined && costBasis > 0) {
      // For "all time", show total gain/loss from cost basis
      gainPercent = ((value - costBasis) / costBasis) * 100;
    } else {
      // For all other periods, calculate from start point of the graph
      const startValue = data.startValue || 0;
      if (startValue > 0) {
        gainPercent = ((value - startValue) / startValue) * 100;
      }
    }
    
    const isPositive = gainPercent >= 0;
    
    // Format date from dateFull or label
    let formattedDate = label;
    if (data.dateFull) {
      // Check if it's intraday (includes time)
      if (data.dateFull.includes(' ')) {
        const [datePart, timePart] = data.dateFull.split(' ');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hours, minutes] = timePart.split(':').map(Number);
        const date = new Date(year, month - 1, day, hours, minutes);
        formattedDate = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      } else {
        const [year, month, day] = data.dateFull.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        formattedDate = date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
      }
    }
    
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-3">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {formattedDate}
        </p>
        <p className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
          {formatCurrency(value)}
        </p>
        <p className={`text-sm font-medium ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
          {isPositive ? '+' : ''}{gainPercent.toFixed(2)}%
        </p>
      </div>
    );
  }
  return null;
};

interface PortfolioChartProps {
  data: HistoricalData[];
  height?: number;
  period?: '1d' | '5d' | '1m' | '6m' | 'ytd' | 'all';
  currentValue?: number; // Current portfolio value
  costBasis?: number; // Total cost basis (what you paid)
  transactions?: any[]; // Transactions for calculating cost basis at each date
}

export default function PortfolioChart({ 
  data, 
  height = 300, 
  period = '1m',
  currentValue,
  costBasis,
  transactions = []
}: PortfolioChartProps) {
  if (data.length === 0) {
    return (
      <div className="w-full h-[300px] flex items-center justify-center text-gray-500">
        No data available
      </div>
    );
  }

  // Get starting and ending values with their cost basis
  const startValue = data[0]?.price || 0;
  const startCostBasis = data[0]?.volume || 0; // Using volume field to store cost basis
  const endValue = data[data.length - 1]?.price || 0;
  const endCostBasis = data[data.length - 1]?.volume || 0;
  
  // Use actual dollar values for the chart
  // Parse date string as local date to avoid timezone issues
  // For intraday (1d period), the date string includes time (YYYY-MM-DD HH:MM)
  const chartData = data.map(item => {
    const isIntraday = period === '1d' && item.date.includes(' ');
    let date: Date;
    let displayDate: string;
    let dateFull: string;
    
    if (isIntraday) {
      // Parse datetime string (YYYY-MM-DD HH:MM)
      const [datePart, timePart] = item.date.split(' ');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hours, minutes] = timePart.split(':').map(Number);
      date = new Date(year, month - 1, day, hours, minutes);
      // Format as time (e.g., "9:30 AM")
      displayDate = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      dateFull = item.date;
    } else {
      // Parse date string (YYYY-MM-DD)
      const [year, month, day] = item.date.split('-').map(Number);
      date = new Date(year, month - 1, day);
      
      // For 5d period, show day name (Mon, Tue, etc.)
      if (period === '5d') {
        displayDate = date.toLocaleDateString('en-US', { weekday: 'short' });
      } else {
        displayDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
      dateFull = item.date;
    }
    
    const costBasis = item.volume || 0;
    const value = item.price;
    
    return {
      date: displayDate,
      dateFull: dateFull, // Keep original date/datetime string for tooltip
      value: item.price, // Use actual dollar value
      costBasis: costBasis, // Cost basis stored in volume field
      startValue: startValue, // Store start value for percentage calculation
    };
  });

  // Calculate percentage change correctly
  // Always use gain/loss percentage: (Value - Cost Basis) / Cost Basis
  // This accounts for new purchases - when you buy more, cost basis increases too
  let percentChange = 0;
  let isPositive = false;
  
  if (period === 'all' && currentValue !== undefined && costBasis !== undefined && costBasis > 0) {
    // For "all time", compare current value to total cost basis (what you actually paid)
    percentChange = ((currentValue - costBasis) / costBasis) * 100;
    isPositive = percentChange >= 0;
  } else if (period === '1d') {
    // For 1d (intraday), compare opening value to current value (today's movement)
    if (startValue > 0) {
      percentChange = ((endValue - startValue) / startValue) * 100;
      isPositive = percentChange >= 0;
    }
  } else {
    // For period-based views, calculate gain percentage at start and end
    // Then show the change in gain percentage
    const startGainPercent = startCostBasis > 0 
      ? ((startValue - startCostBasis) / startCostBasis) * 100 
      : 0;
    const endGainPercent = endCostBasis > 0 
      ? ((endValue - endCostBasis) / endCostBasis) * 100 
      : 0;
    
    // Show the change in gain percentage over the period
    percentChange = endGainPercent - startGainPercent;
    isPositive = percentChange >= 0;
  }
  
  // Calculate Y-axis domain based on actual dollar values
  // Use tighter scaling to show variation better
  const values = chartData.map(d => d.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue;
  
  // Use percentage-based padding to show variation better
  // If range is small relative to values, use tighter padding
  // If range is large, use more padding
  let padding: number;
  if (range === 0) {
    // No variation - show a small range around the value
    padding = maxValue * 0.05;
  } else if (range / maxValue < 0.1) {
    // Small variation (less than 10% of max) - use tight padding (2-3% of range)
    padding = Math.max(range * 0.02, maxValue * 0.01);
  } else {
    // Larger variation - use standard padding (5-10% of range)
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
          <Tooltip content={<CustomTooltip period={period} currentValue={currentValue} costBasis={costBasis} />} />
          {/* Reference line at starting value */}
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

