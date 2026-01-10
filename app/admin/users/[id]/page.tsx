/**
 * Admin User Detail Page - View detailed user information
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  User,
  Mail,
  Calendar,
  Shield,
  Activity,
  PlayCircle,
  Eye,
  Heart,
  Clock,
  Bell,
} from 'lucide-react';

interface UserDetail {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  streamQuota: number;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  emailVerified: boolean;
}

interface UserStream {
  streamId: string;
  youtubeVideoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string | null;
  isLive: boolean;
  currentViewerCount: number | null;
  peakViewerCount: number | null;
  likeCount: number | null;
  addedAt: string;
  lastViewedAt: string | null;
  alertOnLive: boolean;
}

interface ActivityItem {
  id: string;
  type: string;
  description: string;
  timestamp: string;
}

interface UserDetailData {
  user: UserDetail;
  streams: UserStream[];
  recentActivity: ActivityItem[];
  stats: {
    totalStreams: number;
    liveStreams: number;
    streamsRemaining: number;
  };
}

export default function UserDetailPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<UserDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUserDetails();
  }, [params.id]);

  const fetchUserDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/users/${params.id}/detail`);

      if (!response.ok) {
        throw new Error('Failed to fetch user details');
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Error fetching user details:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateTime = (date: string | null) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="p-8 text-center text-muted-foreground">
          Loading user details...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" asChild>
          <Link href="/admin/users">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Users
          </Link>
        </Button>
        <div className="p-8 text-center text-destructive">
          {error || 'User not found'}
        </div>
      </div>
    );
  }

  const { user, streams, recentActivity, stats } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" asChild>
            <Link href="/admin/users">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{user.name}</h1>
            <p className="text-muted-foreground mt-1">{user.email}</p>
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/admin/users?edit=${user.id}`}>
            Edit User
          </Link>
        </Button>
      </div>

      {/* User Info Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Role
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
              {user.role}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <PlayCircle className="h-4 w-4" />
              Stream Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {stats.totalStreams} / {user.streamQuota}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.streamsRemaining} remaining
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={user.isActive ? 'default' : 'destructive'}>
              {user.isActive ? 'Active' : 'Inactive'}
            </Badge>
            {user.emailVerified && (
              <p className="text-xs text-muted-foreground mt-2">
                Email verified
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Member Since
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">{formatDate(user.createdAt)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Last login: {formatDate(user.lastLoginAt)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* User Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            User Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <User className="h-4 w-4" />
              Full Name
            </div>
            <p className="font-medium">{user.name}</p>
          </div>
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Mail className="h-4 w-4" />
              Email Address
            </div>
            <p className="font-medium">{user.email}</p>
          </div>
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Calendar className="h-4 w-4" />
              Account Created
            </div>
            <p className="font-medium">{formatDateTime(user.createdAt)}</p>
          </div>
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Clock className="h-4 w-4" />
              Last Login
            </div>
            <p className="font-medium">{formatDateTime(user.lastLoginAt)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Monitored Streams */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlayCircle className="h-5 w-5" />
            Monitored Streams ({stats.totalStreams})
          </CardTitle>
          <CardDescription>
            Streams this user is currently monitoring
          </CardDescription>
        </CardHeader>
        <CardContent>
          {streams.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <PlayCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-semibold mb-2">No Streams Monitored</p>
              <p className="text-sm">
                This user has not added any streams to monitor yet
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Stream</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Metrics</TableHead>
                  <TableHead>Alerts</TableHead>
                  <TableHead>Added</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {streams.map((stream) => (
                  <TableRow key={stream.streamId}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="relative w-16 h-9 bg-muted rounded overflow-hidden flex-shrink-0">
                          {stream.thumbnailUrl ? (
                            <Image
                              src={stream.thumbnailUrl}
                              alt={stream.title}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <PlayCircle className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">
                            {stream.title}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {stream.channelTitle}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {stream.isLive ? (
                        <Badge variant="destructive" className="gap-1">
                          <span className="h-2 w-2 bg-white rounded-full"></span>
                          LIVE
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Offline</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {stream.isLive ? (
                        <div className="flex items-center gap-3 text-xs">
                          <div className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            <span>{(stream.currentViewerCount || 0).toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Heart className="h-3 w-3" />
                            <span>{(stream.likeCount || 0).toLocaleString()}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {stream.alertOnLive ? (
                        <div className="flex items-center gap-1 text-xs">
                          <Bell className="h-3 w-3" />
                          <span>Enabled</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Disabled</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(stream.addedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>
            User actions and system events
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-semibold mb-2">No Recent Activity</p>
              <p className="text-sm">
                Activity logging will be available once backend implementation is complete
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 pb-4 border-b last:border-0">
                  <Activity className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm">{activity.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDateTime(activity.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
