/**
 * Stream Metadata API
 * Returns basic stream information (title, thumbnail, channel, etc.)
 */

import { NextRequest } from 'next/server';
import postgres from 'postgres';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * GET /api/streams/[id]
 * Returns stream metadata
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!connectionString) {
    return Response.json({ error: 'Database not configured' }, { status: 500 });
  }

  const { id: streamId } = await params;

  // Validate UUID format (basic check)
  if (!streamId || typeof streamId !== 'string') {
    return Response.json({ error: 'Invalid stream ID' }, { status: 400 });
  }

  const client = postgres(connectionString);

  try {
    // Get stream metadata using raw SQL
    const stream = await client`
      SELECT
        id,
        youtube_video_id,
        channel_id,
        channel_title,
        title,
        description,
        thumbnail_url,
        is_live,
        current_viewer_count,
        peak_viewer_count,
        like_count,
        scheduled_start_time,
        actual_start_time,
        actual_end_time
      FROM streams
      WHERE id = ${streamId}
      LIMIT 1
    `;

    if (stream.length === 0) {
      return Response.json({ error: 'Stream not found' }, { status: 404 });
    }

    const s = stream[0];
    return Response.json(
      {
        id: s.id,
        youtubeVideoId: s.youtube_video_id,
        channelId: s.channel_id,
        channelTitle: s.channel_title,
        title: s.title,
        description: s.description,
        thumbnailUrl: s.thumbnail_url,
        isLive: s.is_live,
        currentViewerCount: s.current_viewer_count,
        peakViewerCount: s.peak_viewer_count,
        likeCount: s.like_count,
        scheduledStartTime: s.scheduled_start_time,
        actualStartTime: s.actual_start_time,
        actualEndTime: s.actual_end_time,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      }
    );
  } catch (error: any) {
    console.error('Error fetching stream:', error);
    return Response.json(
      { error: 'Failed to fetch stream', details: error.message },
      { status: 500 }
    );
  } finally {
    await client.end();
  }
}
