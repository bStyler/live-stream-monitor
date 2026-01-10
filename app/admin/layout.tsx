/**
 * Admin Layout - Sidebar navigation for admin pages
 */

import Link from 'next/link';
import { requireAdmin } from '@/lib/admin-middleware';
import { Users, LayoutDashboard, Mail, Activity } from 'lucide-react';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  const navItems = [
    {
      title: 'Dashboard',
      href: '/admin',
      icon: LayoutDashboard,
    },
    {
      title: 'Users',
      href: '/admin/users',
      icon: Users,
    },
    {
      title: 'Invitations',
      href: '/admin/invitations',
      icon: Mail,
    },
    {
      title: 'Activity Log',
      href: '/admin/activity',
      icon: Activity,
    },
  ];

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-muted/40">
        <div className="flex h-16 items-center border-b px-6">
          <h2 className="text-lg font-semibold">Admin Panel</h2>
        </div>
        <nav className="space-y-1 p-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted"
              >
                <Icon className="h-4 w-4" />
                {item.title}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1">
        <div className="border-b">
          <div className="flex h-16 items-center px-6">
            <Link
              href="/dashboard"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
