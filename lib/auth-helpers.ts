/**
 * Authentication Helpers
 * Utilities for protecting API routes and checking permissions
 */

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

/**
 * Get the current session or throw an error
 * Use this in API routes that require authentication
 */
export async function requireAuth() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error('Unauthorized');
  }

  return session;
}

/**
 * Get the current user ID or throw an error
 * Shorthand for requireAuth().user.id
 */
export async function requireUserId(): Promise<string> {
  const session = await requireAuth();
  return session.user.id;
}

/**
 * Check if user is authenticated (returns boolean)
 * Use this for optional authentication checks
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    return !!session;
  } catch {
    return false;
  }
}

/**
 * Get current session or null
 * Use this when authentication is optional
 */
export async function getSession() {
  try {
    return await auth.api.getSession({
      headers: await headers(),
    });
  } catch {
    return null;
  }
}
