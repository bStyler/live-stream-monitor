/**
 * Dashboard Stats API
 * Returns summary statistics for the dashboard
 */

import { NextRequest } from 'next/server';
import postgres from 'postgres';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * GET /api/dashboard/stats
 * Returns dashboard statistics for the authenticated user
 */
export async function GET(req: NextRequest) {
  const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!connectionString) {
    return Response.json({ error: 'Database not configured' }, { status: 500 });
  }

  // Get session
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;
  const client = postgres(connectionString);

  try {
    // Get all streams for this user with their metadata and latest view count
    const userStreamsList = await client`
      SELECT
        s.id,
        s.youtube_video_id,
        s.channel_title,
        s.title,
        s.thumbnail_url,
        s.is_live,
        s.current_viewer_count,
        s.like_count,
        s.last_fetched_at,
        (
          SELECT view_count
          FROM stream_metrics
          WHERE stream_id = s.id
          ORDER BY recorded_at DESC
          LIMIT 1
        ) as view_count
      FROM user_streams us
      INNER JOIN streams s ON us.stream_id = s.id
      WHERE us.user_id = ${userId}
      ORDER BY s.is_live DESC, s.last_fetched_at DESC
    `;

    const totalMonitored = userStreamsList.length;
    const liveNow = userStreamsList.filter((s) => s.is_live).length;

    return Response.json(
      {
        totalMonitored,
        liveNow,
        totalAlerts: 0, // TODO: Implement alerts tracking
        streams: userStreamsList.map((s) => ({
          id: s.id,
          youtubeVideoId: s.youtube_video_id,
          channelTitle: s.channel_title,
          title: s.title,
          thumbnailUrl: s.thumbnail_url,
          isLive: s.is_live,
          currentViewerCount: s.current_viewer_count,
          likeCount: s.like_count,
          viewCount: s.view_count,
          lastFetchedAt: s.last_fetched_at,
        })),
      },
      {
        headers: {
          'Cache-Control': 'private, s-maxage=30, stale-while-revalidate=60',
        },
      }
    );
  } catch (error: any) {
    console.error('Error fetching dashboard stats:', error);
    return Response.json(
      { error: 'Failed to fetch dashboard stats', details: error.message },
      { status: 500 }
    );
  } finally {
    await client.end();
  }
}
