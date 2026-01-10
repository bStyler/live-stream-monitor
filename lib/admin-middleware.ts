/**
 * Admin Middleware - Protect admin routes and check admin permissions
 */

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

/**
 * Require admin role for accessing protected routes
 * Redirects to sign-in if not authenticated, or dashboard if not admin
 * @returns The authenticated admin user
 */
export async function requireAdmin() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect('/sign-in');
  }

  if (session.user.role !== 'admin') {
    redirect('/dashboard'); // Not authorized
  }

  return session.user;
}

/**
 * Check if current user has admin role
 * @returns true if user is admin, false otherwise
 */
export async function checkAdmin(): Promise<boolean> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session?.user?.role === 'admin';
}
