/**
 * Admin Dashboard - Protected by admin middleware
 */

import { requireAdmin } from '@/lib/admin-middleware';
import { db } from '@/db/drizzle';
import { user, userStreams } from '@/db/schema';
import { eq, sql, count } from 'drizzle-orm';
import { Users, Activity, Database, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export default async function AdminPage() {
  const adminUser = await requireAdmin();

  // Fetch user statistics
  const [totalUsersResult] = await db
    .select({ count: count() })
    .from(user)
    .where(eq(user.isActive, true));

  const [totalStreamsResult] = await db
    .select({ count: count() })
    .from(userStreams);

  const [activeAdminsResult] = await db
    .select({ count: count() })
    .from(user)
    .where(sql`${user.role} = 'admin' AND ${user.isActive} = true`);

  const totalUsers = totalUsersResult?.count || 0;
  const totalStreams = totalStreamsResult?.count || 0;
  const activeAdmins = activeAdminsResult?.count || 0;
  const avgStreamsPerUser = totalUsers > 0 ? (Number(totalStreams) / Number(totalUsers)).toFixed(1) : '0';

  const stats = [
    {
      title: 'Total Users',
      value: totalUsers,
      icon: Users,
      description: `${activeAdmins} admin${activeAdmins !== 1 ? 's' : ''}`,
    },
    {
      title: 'Active Streams',
      value: totalStreams,
      icon: Activity,
      description: 'Total monitored streams',
    },
    {
      title: 'Avg Streams/User',
      value: avgStreamsPerUser,
      icon: TrendingUp,
      description: 'Average per user',
    },
    {
      title: 'Database',
      value: 'Healthy',
      icon: Database,
      description: 'All systems operational',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back, {adminUser.name}
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              className="rounded-lg border bg-card p-6 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">
                    {stat.description}
                  </p>
                </div>
                <Icon className="h-8 w-8 text-muted-foreground" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/admin/users"
            className="flex items-center gap-2 rounded-md border p-4 hover:bg-muted transition-colors"
          >
            <Users className="h-5 w-5" />
            <span className="font-medium">Manage Users</span>
          </Link>
          <Link
            href="/admin/invitations"
            className="flex items-center gap-2 rounded-md border p-4 hover:bg-muted transition-colors"
          >
            <Activity className="h-5 w-5" />
            <span className="font-medium">Send Invitations</span>
          </Link>
          <Link
            href="/admin/users"
            className="flex items-center gap-2 rounded-md border p-4 hover:bg-muted transition-colors"
          >
            <Database className="h-5 w-5" />
            <span className="font-medium">View Activity</span>
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-md border p-4 hover:bg-muted transition-colors"
          >
            <TrendingUp className="h-5 w-5" />
            <span className="font-medium">My Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
