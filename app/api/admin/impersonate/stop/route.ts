/**
 * Admin Impersonation Stop API
 * POST /api/admin/impersonate/stop - Stop impersonating current user
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/drizzle';
import { impersonationLogs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { logActivity } from '@/lib/activity-logger';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    // Get impersonation session from cookie
    const cookieStore = await cookies();
    const impersonationCookie = cookieStore.get('impersonation_session');

    if (!impersonationCookie) {
      return NextResponse.json(
        { error: 'No active impersonation session' },
        { status: 400 }
      );
    }

    const impersonationData = JSON.parse(impersonationCookie.value);
    const { logId, targetUserId, targetUserName, targetUserEmail, adminName } = impersonationData;

    // Update impersonation log with end time
    await db
      .update(impersonationLogs)
      .set({ endedAt: new Date() })
      .where(eq(impersonationLogs.id, logId));

    // Create activity log entry
    await logActivity({
      type: 'user_edit',
      description: `Stopped impersonating user ${targetUserName}`,
      targetUserId,
      targetUserName,
      targetUserEmail,
      metadata: {
        action: 'impersonation_stop',
        impersonationLogId: logId,
        duration: Date.now() - new Date(impersonationData.startedAt).getTime(),
      },
    });

    // Clear impersonation cookie
    const response = NextResponse.json({
      success: true,
      message: `Stopped impersonating ${targetUserName}`,
    });

    response.cookies.delete('impersonation_session');

    return response;
  } catch (error) {
    console.error('Error stopping impersonation:', error);
    return NextResponse.json(
      { error: 'Failed to stop impersonation' },
      { status: 500 }
    );
  }
}
