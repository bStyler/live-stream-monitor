'use client';

import { useQuery } from '@tanstack/react-query';
import { use, useState } from 'react';
import { StreamChart } from '@/components/stream-chart';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, ExternalLink, Eye, Heart, PlayCircle, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

type TimeRange = 'today' | '7d' | '14d' | '30d';

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7 Days' },
  { value: '14d', label: '14 Days' },
  { value: '30d', label: '30 Days' },
];

export default function StreamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [activeTab, setActiveTab] = useState('viewers');
  const { id: streamId } = use(params);

  // Fetch stream metadata
  const { data: streamData, isLoading: streamLoading } = useQuery({
    queryKey: ['stream', streamId],
    queryFn: async () => {
      const res = await fetch(`/api/streams/${streamId}`);
      if (!res.ok) throw new Error('Failed to fetch stream');
      return res.json();
    },
  });

  // Fetch metrics data
  const { data: metricsData, isLoading: metricsLoading } = useQuery({
    queryKey: ['stream-metrics', streamId, timeRange],
    queryFn: async () => {
      const res = await fetch(`/api/streams/${streamId}/metrics?timeRange=${timeRange}`);
      if (!res.ok) throw new Error('Failed to fetch metrics');
      return res.json();
    },
    refetchInterval: timeRange === 'today' ? 60000 : false,
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

  const isLoading = metricsLoading || changesLoading || streamLoading;

  // Get latest metric values
  const latestMetrics = metricsData?.metrics?.[metricsData.metrics.length - 1];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl">
        {/* Header with Stream Info */}
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Stream Analytics
              </h1>
            </div>
          </div>

          {/* Stream Metadata Card */}
          {streamData && (
            <Card className="border-2 hover:border-primary/50 transition-all duration-300">
              <CardContent className="p-4 md:p-6">
                <div className="flex flex-col md:flex-row gap-4 md:gap-6">
                  {/* Thumbnail */}
                  <div className="relative w-full md:w-48 aspect-video rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    {streamData.thumbnailUrl ? (
                      <Image
                        src={streamData.thumbnailUrl}
                        alt={streamData.title}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <PlayCircle className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                    {streamData.isLive && (
                      <div className="absolute top-2 right-2 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-md flex items-center gap-1 animate-pulse">
                        <span className="h-2 w-2 bg-white rounded-full"></span>
                        LIVE
                      </div>
                    )}
                  </div>

                  {/* Stream Info */}
                  <div className="flex-1 space-y-3">
                    <div>
                      <h2 className="text-lg md:text-xl font-semibold leading-tight mb-1">
                        {streamData.title}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {streamData.channelTitle}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        className="group"
                        asChild
                      >
                        <a
                          href={`https://youtube.com/watch?v=${streamData.youtubeVideoId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4 mr-2 group-hover:rotate-12 transition-transform" />
                          Watch on YouTube
                        </a>
                      </Button>

                      {/* Time Range Selector */}
                      <div className="flex gap-1 ml-auto">
                        {TIME_RANGES.map((range) => (
                          <Button
                            key={range.value}
                            variant={timeRange === range.value ? 'default' : 'outline'}
                            onClick={() => setTimeRange(range.value)}
                            size="sm"
                            className="transition-all duration-200"
                          >
                            {range.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Metric Badges */}
          {!isLoading && latestMetrics && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        Concurrent Viewers
                      </p>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {(latestMetrics.viewers ?? 0).toLocaleString()}
                      </p>
                    </div>
                    <TrendingUp className="h-4 w-4 text-blue-500/50" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-red-500/20 bg-gradient-to-br from-red-500/5 to-transparent hover:shadow-lg hover:shadow-red-500/10 transition-all duration-300">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                        <Heart className="h-3 w-3" />
                        Total Likes
                      </p>
                      <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                        {(latestMetrics.likes ?? 0).toLocaleString()}
                      </p>
                    </div>
                    <TrendingUp className="h-4 w-4 text-red-500/50" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-green-500/20 bg-gradient-to-br from-green-500/5 to-transparent hover:shadow-lg hover:shadow-green-500/10 transition-all duration-300">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                        <PlayCircle className="h-3 w-3" />
                        Total Views
                      </p>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {(latestMetrics.views ?? 0).toLocaleString()}
                      </p>
                    </div>
                    <TrendingUp className="h-4 w-4 text-green-500/50" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-[500px] w-full" />
          </div>
        )}

        {/* Tabbed Charts */}
        {!isLoading && metricsData && (
          <div className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="grid w-full grid-cols-3 !h-auto p-1 bg-muted/50 rounded-3xl">
                <TabsTrigger
                  value="viewers"
                  className="data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:border-blue-500/50 transition-all duration-200 py-3 rounded-3xl"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  <span className="font-semibold">Viewers</span>
                </TabsTrigger>
                <TabsTrigger
                  value="likes"
                  className="data-[state=active]:bg-red-500/10 data-[state=active]:text-red-600 dark:data-[state=active]:text-red-400 data-[state=active]:border-red-500/50 transition-all duration-200 py-3 rounded-3xl"
                >
                  <Heart className="h-4 w-4 mr-2" />
                  <span className="font-semibold">Likes</span>
                </TabsTrigger>
                <TabsTrigger
                  value="views"
                  className="data-[state=active]:bg-green-500/10 data-[state=active]:text-green-600 dark:data-[state=active]:text-green-400 data-[state=active]:border-green-500/50 transition-all duration-200 py-3 rounded-3xl"
                >
                  <PlayCircle className="h-4 w-4 mr-2" />
                  <span className="font-semibold">Views</span>
                </TabsTrigger>
              </TabsList>

              {/* Viewers Tab */}
              <TabsContent value="viewers" className="mt-4">
                <Card className="border-blue-500/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="h-5 w-5 text-blue-500" />
                      Concurrent Viewers
                    </CardTitle>
                    <CardDescription>
                      Real-time viewer count over {TIME_RANGES.find((r) => r.value === timeRange)?.label.toLowerCase()} • {metricsData.dataPoints} data points
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-[450px]">
                    <StreamChart
                      data={metricsData.metrics}
                      changes={changesData?.changes || []}
                      metric="viewers"
                      timeRange={timeRange}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Likes Tab */}
              <TabsContent value="likes" className="mt-4">
                <Card className="border-red-500/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Heart className="h-5 w-5 text-red-500" />
                      Total Likes
                    </CardTitle>
                    <CardDescription>
                      Cumulative likes over {TIME_RANGES.find((r) => r.value === timeRange)?.label.toLowerCase()} • {metricsData.dataPoints} data points
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-[450px]">
                    <StreamChart
                      data={metricsData.metrics}
                      changes={changesData?.changes || []}
                      metric="likes"
                      timeRange={timeRange}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Views Tab */}
              <TabsContent value="views" className="mt-4">
                <Card className="border-green-500/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PlayCircle className="h-5 w-5 text-green-500" />
                      Total Views
                    </CardTitle>
                    <CardDescription>
                      All-time view count over {TIME_RANGES.find((r) => r.value === timeRange)?.label.toLowerCase()} • {metricsData.dataPoints} data points
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-[450px]">
                    <StreamChart
                      data={metricsData.metrics}
                      changes={changesData?.changes || []}
                      metric="views"
                      timeRange={timeRange}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Change Log */}
            {changesData && changesData.changeCount > 0 && (
              <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-amber-500" />
                    Change Log
                  </CardTitle>
                  <CardDescription>
                    {changesData.changeCount} metadata change(s) detected in {timeRange}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {changesData.changes.map((change: any) => (
                      <div
                        key={change.id}
                        className="group flex items-start gap-3 p-4 bg-card/50 hover:bg-muted/50 rounded-lg border border-transparent hover:border-border transition-all duration-200"
                      >
                        <div
                          className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                            change.type === 'TITLE_CHANGED'
                              ? 'bg-amber-500 shadow-lg shadow-amber-500/50'
                              : change.type === 'THUMBNAIL_CHANGED'
                              ? 'bg-purple-500 shadow-lg shadow-purple-500/50'
                              : 'bg-blue-500 shadow-lg shadow-blue-500/50'
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-semibold text-sm uppercase tracking-wide">
                              {change.type.replace(/_/g, ' ')}
                            </span>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {new Date(change.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <div className="text-sm space-y-1">
                            {change.type === 'TITLE_CHANGED' && (
                              <>
                                <p className="line-through text-muted-foreground">{change.oldValue?.title}</p>
                                <p className="text-foreground font-medium">{change.newValue?.title}</p>
                              </>
                            )}
                            {change.type === 'WENT_LIVE' && (
                              <p className="text-green-600 dark:text-green-400 font-medium">Stream went live</p>
                            )}
                            {change.type === 'ENDED' && (
                              <p className="text-red-600 dark:text-red-400 font-medium">Stream ended</p>
                            )}
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
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center h-[400px] text-center p-8">
              <PlayCircle className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <p className="text-lg font-semibold mb-2">No data available</p>
              <p className="text-muted-foreground max-w-sm">
                No data available for this time range. Try selecting a different time range or wait for more data to be collected.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
