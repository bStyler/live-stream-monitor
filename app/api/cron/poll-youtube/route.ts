/**
 * YouTube Polling Cron Endpoint
 * Triggered by Vercel Cron every 60 seconds
 * Protected by CRON_SECRET environment variable
 */

import { NextRequest } from 'next/server';
import { pollYouTubeMetrics } from '@/lib/youtube-poller';

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds max (Vercel Pro)

/**
 * GET /api/cron/poll-youtube
 * Polls YouTube for stream metrics and updates database
 */
export async function GET(req: NextRequest) {
  // Verify cron secret authorization
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('CRON_SECRET not configured');
    return Response.json({ error: 'Server configuration error' }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    console.error('Unauthorized cron request');
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('🕐 Cron job triggered: poll-youtube');

    // Poll YouTube with 200-stream limit (prevents timeout)
    const result = await pollYouTubeMetrics(200);

    console.log('✅ Cron job completed successfully');

    return Response.json({
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ Cron job failed:', error);

    return Response.json(
      {
        success: false,
        error: error.message || 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
