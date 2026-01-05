'use client';

import { useMemo, memo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot } from 'recharts';
import { format } from 'date-fns';
import { downsample } from '@/lib/downsample';

interface MetricDataPoint {
  timestamp: string;
  viewers: number | null;
  likes: number | null;
  views: number | null;
}

interface ChangeMarker {
  id: number;
  type: string;
  timestamp: string;
  oldValue: any;
  newValue: any;
}

interface StreamChartProps {
  data: MetricDataPoint[];
  changes?: ChangeMarker[];
  metric: 'viewers' | 'likes' | 'views';
  timeRange: 'today' | '7d' | '14d' | '30d';
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
}

export const StreamChart = memo(function StreamChart({
  data,
  changes = [],
  metric,
  timeRange,
  onInteractionStart,
  onInteractionEnd
}: StreamChartProps) {
  // Apply downsampling for 30-day view to improve performance
  // 30 days × 1440 minutes = 43,200 points → downsample to 2,000 points
  const chartData = useMemo(() => {
    if (timeRange === '30d' && data.length > 2000) {
      console.log(`Downsampling ${data.length} points to 2,000 for 30-day chart`);
      return downsample(data, 2000);
    }
    return data;
  }, [data, timeRange]);

  // Map metric to display properties
  const metricConfig = {
    viewers: {
      label: 'Concurrent Viewers',
      color: '#3b82f6', // blue
      dataKey: 'viewers',
    },
    likes: {
      label: 'Total Likes',
      color: '#ef4444', // red
      dataKey: 'likes',
    },
    views: {
      label: 'Total Views',
      color: '#10b981', // green
      dataKey: 'views',
    },
  };

  const config = metricConfig[metric];

  // Format timestamp based on time range
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);

    switch (timeRange) {
      case 'today':
        return format(date, 'HH:mm'); // Hour:minute
      case '7d':
      case '14d':
        return format(date, 'MMM d HH:mm'); // Month Day Hour:minute
      case '30d':
        return format(date, 'MMM d'); // Month Day
      default:
        return format(date, 'MMM d');
    }
  };

  // Format value for tooltip
  const formatValue = (value: number | null) => {
    if (value === null) return 'N/A';
    return value.toLocaleString();
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    const data = payload[0].payload;
    const timestamp = new Date(data.timestamp);

    return (
      <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {format(timestamp, 'MMM d, yyyy HH:mm')}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          <span style={{ color: config.color }} className="font-medium">
            {config.label}:
          </span>{' '}
          {formatValue(data[config.dataKey])}
        </p>
      </div>
    );
  };

  // Find change markers that match timestamps in the data
  const changeMarkers = changes
    .map((change) => {
      const dataPoint = data.find(
        (d) => new Date(d.timestamp).getTime() === new Date(change.timestamp).getTime()
      );
      if (dataPoint) {
        const value =
          metric === 'viewers'
            ? dataPoint.viewers
            : metric === 'likes'
            ? dataPoint.likes
            : dataPoint.views;

        return {
          ...change,
          timestamp: dataPoint.timestamp,
          value,
        };
      }
      return null;
    })
    .filter((m) => m !== null);

  return (
    <div
      className="w-full h-full"
      onMouseEnter={onInteractionStart}
      onMouseLeave={onInteractionEnd}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
          <XAxis
            dataKey="timestamp"
            tickFormatter={formatTimestamp}
            className="text-xs text-gray-600 dark:text-gray-400"
          />
          <YAxis
            tickFormatter={(value) => value.toLocaleString()}
            className="text-xs text-gray-600 dark:text-gray-400"
            domain={[
              (dataMin: number) => Math.floor(dataMin * 0.95),
              (dataMax: number) => Math.ceil(dataMax * 1.05),
            ]}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey={config.dataKey}
            stroke={config.color}
            strokeWidth={2}
            dot={false}
            connectNulls
            isAnimationActive={false}
          />
          {/* Change markers */}
          {changeMarkers.map((marker: any) => (
            <ReferenceDot
              key={marker.id}
              x={marker.timestamp}
              y={marker.value}
              r={6}
              fill={marker.type === 'TITLE_CHANGED' ? '#f59e0b' : '#8b5cf6'}
              stroke="#fff"
              strokeWidth={2}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
});
