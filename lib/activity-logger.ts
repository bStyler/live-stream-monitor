/**
 * Activity Logger - Service for logging admin and system actions
 */

import { db } from '@/db/drizzle';
import { activityLogs } from '@/db/schema';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export type ActivityType = 'user_edit' | 'user_delete' | 'user_create' | 'role_change' | 'login' | 'signup';

export interface LogActivityOptions {
  type: ActivityType;
  description: string;
  targetUserId?: string;
  targetUserName?: string;
  targetUserEmail?: string;
  metadata?: Record<string, any>;
}

/**
 * Log an admin or system activity
 * Automatically captures the current admin user from session
 */
export async function logActivity(options: LogActivityOptions) {
  try {
    // Get current admin user from session
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    const adminId = session?.user?.id || null;
    const adminName = session?.user?.name || 'System';

    // Insert activity log
    await db.insert(activityLogs).values({
      type: options.type,
      adminId,
      adminName,
      targetUserId: options.targetUserId || null,
      targetUserName: options.targetUserName || null,
      targetUserEmail: options.targetUserEmail || null,
      description: options.description,
      metadata: options.metadata || null,
    });

    console.log(`[Activity Log] ${options.type}: ${options.description}`);
  } catch (error) {
    console.error('Failed to log activity:', error);
    // Don't throw - activity logging should not break the main flow
  }
}

/**
 * Log user edit action
 */
export async function logUserEdit(
  targetUserId: string,
  targetUserName: string,
  targetUserEmail: string,
  changes: Record<string, { old: any; new: any }>
) {
  const changeDescriptions = Object.entries(changes)
    .map(([field, { old, new: newVal }]) => `${field}: ${old} → ${newVal}`)
    .join(', ');

  await logActivity({
    type: 'user_edit',
    description: `Updated user: ${changeDescriptions}`,
    targetUserId,
    targetUserName,
    targetUserEmail,
    metadata: { changes },
  });
}

/**
 * Log user deletion action
 */
export async function logUserDelete(
  targetUserId: string,
  targetUserName: string,
  targetUserEmail: string
) {
  await logActivity({
    type: 'user_delete',
    description: `Deleted user (marked as inactive)`,
    targetUserId,
    targetUserName,
    targetUserEmail,
  });
}

/**
 * Log role change action
 */
export async function logRoleChange(
  targetUserId: string,
  targetUserName: string,
  targetUserEmail: string,
  oldRole: string,
  newRole: string
) {
  await logActivity({
    type: 'role_change',
    description: `Changed user role from ${oldRole} to ${newRole}`,
    targetUserId,
    targetUserName,
    targetUserEmail,
    metadata: { oldRole, newRole },
  });
}

/**
 * Log user signup
 */
export async function logUserSignup(
  userId: string,
  userName: string,
  userEmail: string
) {
  await logActivity({
    type: 'signup',
    description: `New user signed up`,
    targetUserId: userId,
    targetUserName: userName,
    targetUserEmail: userEmail,
  });
}
