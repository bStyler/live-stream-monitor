/**
 * Admin Activity Log API - Get activity logs
 * GET /api/admin/activity - List activity logs with filters
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-middleware';
import { db } from '@/db/drizzle';
import { activityLogs } from '@/db/schema';
import { desc, eq, and, gte, lte, like } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter') || ''; // Filter by activity type
    const startDate = searchParams.get('startDate') || ''; // Date range start
    const endDate = searchParams.get('endDate') || ''; // Date range end
    const actor = searchParams.get('actor') || ''; // Filter by admin name
    const target = searchParams.get('target') || ''; // Filter by target user
    const limit = parseInt(searchParams.get('limit') || '100');

    // Build where conditions
    const conditions = [];

    if (filter) {
      conditions.push(eq(activityLogs.type, filter as any));
    }

    if (startDate) {
      conditions.push(gte(activityLogs.createdAt, new Date(startDate)));
    }

    if (endDate) {
      // Add 1 day to include the end date fully
      const endDateTime = new Date(endDate);
      endDateTime.setDate(endDateTime.getDate() + 1);
      conditions.push(lte(activityLogs.createdAt, endDateTime));
    }

    if (actor) {
      conditions.push(like(activityLogs.adminName, `%${actor}%`));
    }

    if (target) {
      conditions.push(like(activityLogs.targetUserName, `%${target}%`));
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

    return NextResponse.json({ activities, total: activities.length });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity logs' },
      { status: 500 }
    );
  }
}
