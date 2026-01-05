/**
 * Remove Stream API
 * Allows authenticated users to remove streams from monitoring
 */

import { NextRequest } from 'next/server';
import { requireUserId } from '@/lib/auth-helpers';
import { removeStreamForUser } from '@/lib/stream-service';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * POST /api/streams/remove
 * Body: { streamId: string }
 */
export async function POST(req: NextRequest) {
  try {
    // Require authentication
    const userId = await requireUserId();

    // Parse request body
    const body = await req.json();
    const { streamId } = body;

    if (!streamId || typeof streamId !== 'string') {
      return Response.json({ error: 'Missing or invalid streamId' }, { status: 400 });
    }

    // Remove stream for user
    const result = await removeStreamForUser(userId, streamId);

    if (!result.success) {
      return Response.json({ error: result.error }, { status: 400 });
    }

    return Response.json(
      {
        success: true,
        message: 'Stream removed successfully',
      },
      { status: 200 }
    );
  } catch (error: any) {
    // Handle authentication errors
    if (error.message === 'Unauthorized') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('Error in POST /api/streams/remove:', error);
    return Response.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
