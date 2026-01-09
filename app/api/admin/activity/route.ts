/**
 * Admin Activity Log API - Get activity logs
 * GET /api/admin/activity - List activity logs with filters
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-middleware';
import { db } from '@/db/drizzle';
import { activityLogs } from '@/db/schema';
import { desc, eq, and } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter') || ''; // Filter by activity type
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build where conditions
    const conditions = [];
    if (filter) {
      conditions.push(eq(activityLogs.type, filter as any));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get activity logs
    const activities = await db
      .select({
        id: activityLogs.id,
        type: activityLogs.type,
        adminId: activityLogs.adminId,
        adminName: activityLogs.adminName,
        targetUserId: activityLogs.targetUserId,
        targetUserName: activityLogs.targetUserName,
        targetUserEmail: activityLogs.targetUserEmail,
        description: activityLogs.description,
        metadata: activityLogs.metadata,
        timestamp: activityLogs.createdAt,
      })
      .from(activityLogs)
      .where(whereClause)
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit);

    return NextResponse.json({ activities });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity logs' },
      { status: 500 }
    );
  }
}
