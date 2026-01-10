/**
 * Admin Activity Log Page - View system and admin actions
 */

'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Activity, User, Shield, Trash2, Edit, UserPlus } from 'lucide-react';

interface ActivityLog {
  id: string;
  type: 'user_edit' | 'user_delete' | 'user_create' | 'role_change' | 'login' | 'signup';
  adminId?: string;
  adminName?: string;
  targetUserId?: string;
  targetUserName?: string;
  targetUserEmail?: string;
  description: string;
  timestamp: string;
}

export default function AdminActivityPage() {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [actor, setActor] = useState<string>('');
  const [target, setTarget] = useState<string>('');

  useEffect(() => {
    fetchActivities();
  }, [filter, startDate, endDate, actor, target]);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter) params.append('filter', filter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (actor) params.append('actor', actor);
      if (target) params.append('target', target);

      const response = await fetch(`/api/admin/activity?${params}`);
      const data = await response.json();

      setActivities(data.activities || []);
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    setFilter('');
    setStartDate('');
    setEndDate('');
    setActor('');
    setTarget('');
  };

  const getActivityIcon = (type: ActivityLog['type']) => {
    switch (type) {
      case 'user_edit':
        return <Edit className="h-4 w-4" />;
      case 'user_delete':
        return <Trash2 className="h-4 w-4" />;
      case 'user_create':
        return <UserPlus className="h-4 w-4" />;
      case 'role_change':
        return <Shield className="h-4 w-4" />;
      case 'login':
        return <User className="h-4 w-4" />;
      case 'signup':
        return <Activity className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getActivityBadgeVariant = (type: ActivityLog['type']) => {
    switch (type) {
      case 'user_delete':
        return 'destructive';
      case 'role_change':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Activity Log</h1>
        <p className="text-muted-foreground mt-1">
          Monitor system and admin actions
        </p>
      </div>

      {/* Advanced Filters */}
      <div className="space-y-4">
        <div className="flex gap-4 flex-wrap items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-sm font-medium mb-2 block">Activity Type</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full px-3 py-2 border rounded-md bg-background"
            >
              <option value="">All Activities</option>
              <option value="user_edit">User Edits</option>
              <option value="user_delete">User Deletions</option>
              <option value="role_change">Role Changes</option>
              <option value="login">User Logins</option>
              <option value="signup">User Signups</option>
            </select>
          </div>

          <div className="flex-1 min-w-[150px]">
            <label className="text-sm font-medium mb-2 block">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-md bg-background"
            />
          </div>

          <div className="flex-1 min-w-[150px]">
            <label className="text-sm font-medium mb-2 block">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-md bg-background"
            />
          </div>

          <div className="flex-1 min-w-[150px]">
            <label className="text-sm font-medium mb-2 block">Actor (Admin)</label>
            <input
              type="text"
              value={actor}
              onChange={(e) => setActor(e.target.value)}
              placeholder="Search by admin name..."
              className="w-full px-3 py-2 border rounded-md bg-background"
            />
          </div>

          <div className="flex-1 min-w-[150px]">
            <label className="text-sm font-medium mb-2 block">Target User</label>
            <input
              type="text"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="Search by user name..."
              className="w-full px-3 py-2 border rounded-md bg-background"
            />
          </div>

          <button
            onClick={handleResetFilters}
            className="px-4 py-2 border rounded-md hover:bg-muted transition-colors"
          >
            Reset Filters
          </button>
        </div>

        {(filter || startDate || endDate || actor || target) && (
          <div className="text-sm text-muted-foreground">
            Active filters: {[
              filter && `Type: ${filter}`,
              startDate && `From: ${startDate}`,
              endDate && `To: ${endDate}`,
              actor && `Actor: ${actor}`,
              target && `Target: ${target}`,
            ].filter(Boolean).join(', ')}
          </div>
        )}
      </div>

      {/* Activity Log Table */}
      <div className="rounded-lg border bg-card">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">
            Loading activity log...
          </div>
        ) : activities.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-semibold mb-2">No Activity Yet</p>
            <p className="text-sm">
              Admin and system actions will appear here
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Type</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activities.map((activity) => (
                <TableRow key={activity.id}>
                  <TableCell>
                    <Badge
                      variant={getActivityBadgeVariant(activity.type)}
                      className="flex items-center gap-1 w-fit"
                    >
                      {getActivityIcon(activity.type)}
                      {activity.type.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    {activity.adminName || 'System'}
                  </TableCell>
                  <TableCell>
                    {activity.targetUserName ? (
                      <div>
                        <p className="font-medium">{activity.targetUserName}</p>
                        <p className="text-sm text-muted-foreground">
                          {activity.targetUserEmail}
                        </p>
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {activity.description}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatTimestamp(activity.timestamp)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Info Card */}
      <div className="rounded-lg border bg-muted/40 p-6">
        <h3 className="font-semibold mb-2">About Activity Logging</h3>
        <p className="text-sm text-muted-foreground mb-3">
          The activity log tracks important system events and admin actions for
          security and audit purposes.
        </p>
        <div className="text-sm text-muted-foreground space-y-1">
          <p>
            <strong>Tracked Events:</strong> User edits, deletions, role
            changes, logins, and signups
          </p>
          <p>
            <strong>Retention:</strong> Activity logs are retained for 90 days
          </p>
          <p>
            <strong>Note:</strong> Full activity logging will be enabled once
            the backend implementation is complete
          </p>
        </div>
      </div>
    </div>
  );
}
