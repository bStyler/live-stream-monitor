/**
 * Stream Changes API
 * Returns metadata change log for timeline overlay
 */

import { NextRequest } from 'next/server';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, gte, and } from 'drizzle-orm';
import { streams, streamChanges } from '@/db/schema';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * GET /api/streams/[id]/changes
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

    // Get changes within time range
    const changes = await db
      .select({
        id: streamChanges.id,
        changeType: streamChanges.changeType,
        oldValue: streamChanges.oldValue,
        newValue: streamChanges.newValue,
        detectedAt: streamChanges.detectedAt,
      })
      .from(streamChanges)
      .where(
        and(
          eq(streamChanges.streamId, streamId),
          gte(streamChanges.detectedAt, dateFilter)
        )
      )
      .orderBy(streamChanges.detectedAt);

    return Response.json(
      {
        streamId,
        timeRange,
        dateFilter: dateFilter.toISOString(),
        changeCount: changes.length,
        changes: changes.map((c) => ({
          id: c.id,
          type: c.changeType,
          oldValue: c.oldValue,
          newValue: c.newValue,
          timestamp: c.detectedAt?.toISOString(),
        })),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    );
  } catch (error: any) {
    console.error('Error fetching changes:', error);
    return Response.json(
      { error: 'Failed to fetch changes', details: error.message },
      { status: 500 }
    );
  } finally {
    await client.end();
  }
}
