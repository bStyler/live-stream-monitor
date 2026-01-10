/**
 * Admin User Detail API - Get detailed user information
 * GET /api/admin/users/[id]/detail - Get user details with streams and activity
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-middleware';
import { db } from '@/db/drizzle';
import { user, userStreams, streams } from '@/db/schema';
import { eq, and, sql, desc } from 'drizzle-orm';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();

    const { id } = await params;

    // Get user details
    const [userDetail] = await db
      .select()
      .from(user)
      .where(eq(user.id, id))
      .limit(1);

    if (!userDetail) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get user's streams with details
    const userStreamsList = await db
      .select({
        streamId: streams.id,
        youtubeVideoId: streams.youtubeVideoId,
        title: streams.title,
        channelTitle: streams.channelTitle,
        thumbnailUrl: streams.thumbnailUrl,
        isLive: streams.isLive,
        currentViewerCount: streams.currentViewerCount,
        peakViewerCount: streams.peakViewerCount,
        likeCount: streams.likeCount,
        addedAt: userStreams.addedAt,
        lastViewedAt: userStreams.lastViewedAt,
        alertOnLive: userStreams.alertOnLive,
      })
      .from(userStreams)
      .innerJoin(streams, eq(userStreams.streamId, streams.id))
      .where(
        and(
          eq(userStreams.userId, id),
          sql`${userStreams.deletedAt} IS NULL`,
          sql`${streams.deletedAt} IS NULL`
        )
      )
      .orderBy(desc(userStreams.addedAt));

    // TODO: Get recent activity for this user
    // For now, return empty array - will be populated when activity logging backend is implemented
    const recentActivity = [];

    return NextResponse.json({
      user: {
        id: userDetail.id,
        name: userDetail.name,
        email: userDetail.email,
        role: userDetail.role,
        streamQuota: userDetail.streamQuota,
        isActive: userDetail.isActive,
        createdAt: userDetail.createdAt,
        lastLoginAt: userDetail.lastLoginAt,
        emailVerified: userDetail.emailVerified,
      },
      streams: userStreamsList,
      recentActivity,
      stats: {
        totalStreams: userStreamsList.length,
        liveStreams: userStreamsList.filter(s => s.isLive).length,
        streamsRemaining: userDetail.streamQuota - userStreamsList.length,
      },
    });
  } catch (error) {
    console.error('Error fetching user details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user details' },
      { status: 500 }
    );
  }
}
