/**
 * Admin Dashboard - Protected by admin middleware
 */

import { requireAdmin } from '@/lib/admin-middleware';

export default async function AdminPage() {
  const user = await requireAdmin();

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-4">Admin Dashboard</h1>
      <div className="bg-muted p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Welcome, {user.name}!</h2>
        <p className="text-sm text-muted-foreground">Role: {user.role}</p>
        <p className="text-sm text-muted-foreground">Email: {user.email}</p>
      </div>
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-4">Admin Features (Coming Soon)</h3>
        <ul className="list-disc list-inside space-y-2 text-muted-foreground">
          <li>User Management</li>
          <li>Stream Quota Management</li>
          <li>User Invitations</li>
          <li>User Impersonation</li>
        </ul>
      </div>
    </div>
  );
}
