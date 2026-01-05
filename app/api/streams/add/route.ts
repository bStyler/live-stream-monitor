/**
 * Add Stream API
 * Allows authenticated users to add streams to monitor
 */

import { NextRequest } from 'next/server';
import { requireUserId } from '@/lib/auth-helpers';
import { addStreamForUser } from '@/lib/stream-service';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * POST /api/streams/add
 * Body: { videoIdOrUrl: string }
 */
export async function POST(req: NextRequest) {
  try {
    // Require authentication
    const userId = await requireUserId();

    // Parse request body
    const body = await req.json();
    const { videoIdOrUrl } = body;

    if (!videoIdOrUrl || typeof videoIdOrUrl !== 'string') {
      return Response.json(
        { error: 'Missing or invalid videoIdOrUrl' },
        { status: 400 }
      );
    }

    // Add stream for user
    const result = await addStreamForUser(userId, videoIdOrUrl);

    if (!result.success) {
      return Response.json({ error: result.error }, { status: 400 });
    }

    return Response.json(
      {
        success: true,
        streamId: result.streamId,
        message: 'Stream added successfully',
      },
      { status: 200 }
    );
  } catch (error: any) {
    // Handle authentication errors
    if (error.message === 'Unauthorized') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('Error in POST /api/streams/add:', error);
    return Response.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
