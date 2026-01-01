/**
 * Stream Metrics Time-Series API
 * Returns historical metrics for charts
 */

import { NextRequest } from 'next/server';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, gte, and } from 'drizzle-orm';
import { streams, streamMetrics } from '@/db/schema';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * GET /api/streams/[id]/metrics
 * Query params: timeRange (today, 7d, 14d, 30d)
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

  // Get time range from query params
  const { searchParams } = new URL(req.url);
  const timeRange = searchParams.get('timeRange') || '7d';

  // Calculate date filter based on time range
  const now = new Date();
  let dateFilter: Date;

  switch (timeRange) {
    case 'today':
      dateFilter = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case '7d':
      dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '14d':
      dateFilter = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  const client = postgres(connectionString);
  const db = drizzle(client);

  try {
    // Verify stream exists
    const stream = await db
      .select()
      .from(streams)
      .where(eq(streams.id, streamId))
      .limit(1);

    if (stream.length === 0) {
      return Response.json({ error: 'Stream not found' }, { status: 404 });
    }

    // Get metrics within time range
    const metrics = await db
      .select({
        timestamp: streamMetrics.recordedAt,
        viewers: streamMetrics.viewerCount,
        likes: streamMetrics.likeCount,
        views: streamMetrics.viewCount,
      })
      .from(streamMetrics)
      .where(
        and(
          eq(streamMetrics.streamId, streamId),
          gte(streamMetrics.recordedAt, dateFilter)
        )
      )
      .orderBy(streamMetrics.recordedAt);

    return Response.json(
      {
        streamId,
        timeRange,
        dateFilter: dateFilter.toISOString(),
        dataPoints: metrics.length,
        metrics: metrics.map((m) => ({
          timestamp: m.timestamp?.toISOString(),
          viewers: m.viewers,
          likes: m.likes,
          views: m.views,
        })),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    );
  } catch (error: any) {
    console.error('Error fetching metrics:', error);
    return Response.json(
      { error: 'Failed to fetch metrics', details: error.message },
      { status: 500 }
    );
  } finally {
    await client.end();
  }
}
