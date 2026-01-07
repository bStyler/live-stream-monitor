/**
 * Admin Users API - List and create users
 * GET /api/admin/users - List all users with pagination and filters
 * POST /api/admin/users - Create new user (future)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-middleware';
import { db } from '@/db/drizzle';
import { user, userStreams } from '@/db/schema';
import { eq, like, or, and, count, sql } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);

    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Filters
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const isActive = searchParams.get('isActive');

    // Build where conditions
    const conditions = [];

    if (search) {
      conditions.push(
        or(
          like(user.email, `%${search}%`),
          like(user.name, `%${search}%`)
        )
      );
    }

    if (role) {
      conditions.push(eq(user.role, role as 'user' | 'admin'));
    }

    if (isActive !== null && isActive !== undefined && isActive !== '') {
      conditions.push(eq(user.isActive, isActive === 'true'));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get users with stream counts
    const users = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        streamQuota: user.streamQuota,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        streamCount: count(userStreams.streamId),
      })
      .from(user)
      .leftJoin(
        userStreams,
        and(
          eq(userStreams.userId, user.id),
          sql`${userStreams.deletedAt} IS NULL`
        )
      )
      .where(whereClause)
      .groupBy(user.id)
      .limit(limit)
      .offset(offset)
      .orderBy(user.createdAt);

    // Get total count for pagination
    const [totalResult] = await db
      .select({ count: count() })
      .from(user)
      .where(whereClause);

    const total = totalResult?.count || 0;
    const totalPages = Math.ceil(Number(total) / limit);

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total: Number(total),
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
