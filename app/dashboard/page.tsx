"use client";

import { useSession, signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, PlayCircle, TrendingUp, Eye, Heart, Shield } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { AddStreamDialog } from "@/components/add-stream-dialog";
import { RemoveStreamDialog } from "@/components/remove-stream-dialog";

export default function DashboardPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/stats');
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
    enabled: !!session, // Only fetch when session exists
    refetchInterval: 60000, // Refresh every 60 seconds
  });

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/sign-in");
    }
  }, [session, isPending, router]);

  const handleSignOut = async () => {
    await signOut();
    router.push("/sign-in");
  };

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-sm border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Live Stream Monitor
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                YouTube Analytics Dashboard
              </p>
            </div>
            <div className="flex items-center gap-4">
              <AddStreamDialog />
              {session.user?.role === 'admin' && (
                <Button variant="outline" asChild>
                  <Link href="/admin">
                    <Shield className="h-4 w-4 mr-2" />
                    Admin Panel
                  </Link>
                </Button>
              )}
              <span className="text-sm text-muted-foreground">
                {session.user?.email}
              </span>
              <Button variant="outline" onClick={handleSignOut}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            {statsLoading ? (
              <>
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
              </>
            ) : (
              <>
                <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <PlayCircle className="h-4 w-4" />
                      Monitored Streams
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                      {stats?.totalMonitored || 0}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stats?.totalMonitored === 0 ? 'No streams added yet' : 'Total streams tracking'}
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-red-500/20 bg-gradient-to-br from-red-500/5 to-transparent hover:shadow-lg hover:shadow-red-500/10 transition-all duration-300">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                      </span>
                      Live Now
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-4xl font-bold text-red-600 dark:text-red-400">
                      {stats?.liveNow || 0}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Streams currently live
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-green-500/20 bg-gradient-to-br from-green-500/5 to-transparent hover:shadow-lg hover:shadow-green-500/10 transition-all duration-300">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Total Alerts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-4xl font-bold text-green-600 dark:text-green-400">
                      {stats?.totalAlerts || 0}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Alerts sent this week
                    </p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Monitored Streams */}
          {statsLoading ? (
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64 mt-2" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
              </CardContent>
            </Card>
          ) : stats?.streams && stats.streams.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PlayCircle className="h-5 w-5 text-primary" />
                  Your Monitored Streams
                </CardTitle>
                <CardDescription>
                  Click on a stream to view detailed analytics and metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {stats.streams.map((stream: any) => (
                    <Link
                      key={stream.id}
                      href={`/dashboard/streams/${stream.id}`}
                      className="group"
                    >
                      <Card className="hover:border-primary/50 transition-all duration-300 hover:shadow-lg overflow-hidden">
                        {/* Thumbnail */}
                        <div className="relative aspect-video bg-muted">
                          {stream.thumbnailUrl ? (
                            <Image
                              src={stream.thumbnailUrl}
                              alt={stream.title}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                              unoptimized
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <PlayCircle className="h-12 w-12 text-muted-foreground" />
                            </div>
                          )}
                          {stream.isLive && (
                            <div className="absolute top-2 right-2 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-md flex items-center gap-1 animate-pulse">
                              <span className="h-2 w-2 bg-white rounded-full"></span>
                              LIVE
                            </div>
                          )}
                        </div>

                        {/* Stream Info */}
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-sm line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                                {stream.title}
                              </h3>
                              <p className="text-xs text-muted-foreground">
                                {stream.channelTitle}
                              </p>
                            </div>
                            <div onClick={(e) => e.preventDefault()}>
                              <RemoveStreamDialog
                                streamId={stream.id}
                                streamTitle={stream.title}
                                trigger={
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 shrink-0"
                                  >
                                    <span className="sr-only">Remove stream</span>
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      width="16"
                                      height="16"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      className="text-muted-foreground hover:text-destructive transition-colors"
                                    >
                                      <path d="M3 6h18" />
                                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                    </svg>
                                  </Button>
                                }
                              />
                            </div>
                          </div>

                          {/* Metrics */}
                          {stream.isLive && (
                            <div className="flex items-center gap-3 text-xs">
                              <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                                <Eye className="h-3 w-3" />
                                <span className="font-medium">
                                  {(stream.currentViewerCount || 0).toLocaleString()}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                                <Heart className="h-3 w-3" />
                                <span className="font-medium">
                                  {(stream.likeCount || 0).toLocaleString()}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                <PlayCircle className="h-3 w-3" />
                                <span className="font-medium">
                                  {(stream.viewCount || 0).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Last Updated */}
                          {stream.lastFetchedAt && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Updated {new Date(stream.lastFetchedAt).toLocaleTimeString()}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <PlayCircle className="h-16 w-16 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Streams Monitored Yet</h3>
                <p className="text-muted-foreground max-w-sm mb-6">
                  Start monitoring YouTube live streams to track metrics and receive alerts.
                </p>
                <Button variant="outline" asChild>
                  <a
                    href="https://github.com/anthropics/claude-code"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Learn More
                  </a>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
