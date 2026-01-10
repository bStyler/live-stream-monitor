/**
 * Admin Impersonation Start API
 * POST /api/admin/impersonate/start - Start impersonating a user
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-middleware';
import { db } from '@/db/drizzle';
import { user, impersonationLogs } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { logActivity } from '@/lib/activity-logger';
import { cookies } from 'next/headers';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const body = await req.json();
    const { targetUserId } = body;

    if (!targetUserId) {
      return NextResponse.json({ error: 'Target user ID required' }, { status: 400 });
    }

    // Get current admin session
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const adminId = session.user.id;
    const adminName = session.user.name;

    // Get target user details
    const [targetUser] = await db
      .select()
      .from(user)
      .where(and(eq(user.id, targetUserId), eq(user.isActive, true)))
      .limit(1);

    if (!targetUser) {
      return NextResponse.json({ error: 'Target user not found or inactive' }, { status: 404 });
    }

    // Prevent impersonating another admin
    if (targetUser.role === 'admin') {
      return NextResponse.json(
        { error: 'Cannot impersonate another admin' },
        { status: 403 }
      );
    }

    // Check if already impersonating someone
    const cookieStore = await cookies();
    const existingImpersonation = cookieStore.get('impersonation_session');
    if (existingImpersonation) {
      return NextResponse.json(
        { error: 'Already impersonating a user. Stop current impersonation first.' },
        { status: 400 }
      );
    }

    // Get request metadata
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Create impersonation log entry
    const [impersonationLog] = await db
      .insert(impersonationLogs)
      .values({
        adminId,
        targetUserId,
        ipAddress,
        userAgent,
      })
      .returning();

    // Create activity log entry
    await logActivity({
      type: 'user_edit',
      description: `Started impersonating user ${targetUser.name}`,
      targetUserId: targetUser.id,
      targetUserName: targetUser.name,
      targetUserEmail: targetUser.email,
      metadata: {
        action: 'impersonation_start',
        impersonationLogId: impersonationLog.id,
        adminId,
        adminName,
      },
    });

    // Store impersonation session in cookie
    const impersonationData = {
      logId: impersonationLog.id,
      adminId,
      adminName,
      targetUserId: targetUser.id,
      targetUserName: targetUser.name,
      targetUserEmail: targetUser.email,
      startedAt: impersonationLog.startedAt.toISOString(),
    };

    const response = NextResponse.json({
      success: true,
      message: `Now impersonating ${targetUser.name}`,
      impersonation: impersonationData,
    });

    // Set secure HTTP-only cookie
    response.cookies.set('impersonation_session', JSON.stringify(impersonationData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Error starting impersonation:', error);
    return NextResponse.json(
      { error: 'Failed to start impersonation' },
      { status: 500 }
    );
  }
}
