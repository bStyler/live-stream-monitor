'use client';

import { useQuery } from '@tanstack/react-query';
import { use, useState } from 'react';
import { StreamChart } from '@/components/stream-chart';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

type TimeRange = 'today' | '7d' | '14d' | '30d';

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7 Days' },
  { value: '14d', label: '14 Days' },
  { value: '30d', label: '30 Days' },
];

export default function StreamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const { id: streamId } = use(params);

  // Fetch metrics data
  const { data: metricsData, isLoading: metricsLoading } = useQuery({
    queryKey: ['stream-metrics', streamId, timeRange],
    queryFn: async () => {
      const res = await fetch(`/api/streams/${streamId}/metrics?timeRange=${timeRange}`);
      if (!res.ok) throw new Error('Failed to fetch metrics');
      return res.json();
    },
    refetchInterval: timeRange === 'today' ? 60000 : false, // Auto-refresh every 60s for "today" view
  });

  // Fetch changes data
  const { data: changesData, isLoading: changesLoading } = useQuery({
    queryKey: ['stream-changes', streamId, timeRange],
    queryFn: async () => {
      const res = await fetch(`/api/streams/${streamId}/changes?timeRange=${timeRange}`);
      if (!res.ok) throw new Error('Failed to fetch changes');
      return res.json();
    },
    refetchInterval: timeRange === 'today' ? 60000 : false,
  });

  const isLoading = metricsLoading || changesLoading;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Stream Analytics</h1>
            <p className="text-muted-foreground">
              {metricsData?.dataPoints || 0} data points in {timeRange}
            </p>
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="flex gap-2">
          {TIME_RANGES.map((range) => (
            <Button
              key={range.value}
              variant={timeRange === range.value ? 'default' : 'outline'}
              onClick={() => setTimeRange(range.value)}
              size="sm"
            >
              {range.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-[400px] w-full" />
          <Skeleton className="h-[400px] w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      )}

      {/* Charts */}
      {!isLoading && metricsData && (
        <div className="space-y-6">
          {/* Viewers Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Concurrent Viewers</CardTitle>
              <CardDescription>
                Real-time viewer count over {TIME_RANGES.find((r) => r.value === timeRange)?.label.toLowerCase()}
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              <StreamChart
                data={metricsData.metrics}
                changes={changesData?.changes || []}
                metric="viewers"
                timeRange={timeRange}
              />
            </CardContent>
          </Card>

          {/* Likes Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Total Likes</CardTitle>
              <CardDescription>
                Cumulative likes over {TIME_RANGES.find((r) => r.value === timeRange)?.label.toLowerCase()}
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              <StreamChart
                data={metricsData.metrics}
                changes={changesData?.changes || []}
                metric="likes"
                timeRange={timeRange}
              />
            </CardContent>
          </Card>

          {/* Views Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Total Views</CardTitle>
              <CardDescription>
                All-time view count over {TIME_RANGES.find((r) => r.value === timeRange)?.label.toLowerCase()}
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              <StreamChart
                data={metricsData.metrics}
                changes={changesData?.changes || []}
                metric="views"
                timeRange={timeRange}
              />
            </CardContent>
          </Card>

          {/* Change Log */}
          {changesData && changesData.changeCount > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Change Log</CardTitle>
                <CardDescription>
                  {changesData.changeCount} metadata change(s) detected
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {changesData.changes.map((change: any) => (
                    <div
                      key={change.id}
                      className="flex items-start gap-3 p-3 bg-muted rounded-lg"
                    >
                      <div
                        className={`w-2 h-2 rounded-full mt-2 ${
                          change.type === 'TITLE_CHANGED'
                            ? 'bg-amber-500'
                            : change.type === 'THUMBNAIL_CHANGED'
                            ? 'bg-purple-500'
                            : 'bg-blue-500'
                        }`}
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">
                            {change.type.replace(/_/g, ' ')}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(change.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          {change.type === 'TITLE_CHANGED' && (
                            <>
                              <p className="line-through">{change.oldValue?.title}</p>
                              <p className="text-foreground">{change.newValue?.title}</p>
                            </>
                          )}
                          {change.type === 'WENT_LIVE' && <p>Stream went live</p>}
                          {change.type === 'ENDED' && <p>Stream ended</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && metricsData && metricsData.dataPoints === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-[400px]">
            <p className="text-muted-foreground text-center">
              No data available for this time range.
              <br />
              Try selecting a different time range or wait for more data to be collected.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
