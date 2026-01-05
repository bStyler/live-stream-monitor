/**
 * Data Pruning Cron Endpoint
 * Deletes stream_metrics and stream_changes records older than 30 days
 * Should run daily at 00:00 UTC via Vercel Cron
 */

import { NextRequest } from 'next/server';
import postgres from 'postgres';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * GET /api/cron/prune-data
 * Authorization: Bearer token (CRON_SECRET)
 */
export async function GET(req: NextRequest) {
  // Verify CRON_SECRET authorization
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('CRON_SECRET not configured');
    return Response.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
    console.error('Unauthorized prune-data attempt');
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!connectionString) {
    return Response.json({ error: 'Database not configured' }, { status: 500 });
  }

  const client = postgres(connectionString);

  try {
    console.log('Starting data pruning job...');

    // Calculate cutoff date (30 days ago)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);

    console.log(`Deleting records older than ${cutoffDate.toISOString()}`);

    // Delete old stream_metrics records
    const metricsDeleted = await client`
      DELETE FROM stream_metrics
      WHERE recorded_at < ${cutoffDate}
    `;

    console.log(`Deleted ${metricsDeleted.count} stream_metrics records`);

    // Delete old stream_changes records
    const changesDeleted = await client`
      DELETE FROM stream_changes
      WHERE detected_at < ${cutoffDate}
    `;

    console.log(`Deleted ${changesDeleted.count} stream_changes records`);

    // Insert audit log entry
    await client`
      INSERT INTO data_deletion_log (
        table_name,
        records_deleted,
        cutoff_date,
        deleted_at
      ) VALUES
        ('stream_metrics', ${metricsDeleted.count}, ${cutoffDate}, NOW()),
        ('stream_changes', ${changesDeleted.count}, ${cutoffDate}, NOW())
    `;

    console.log('Audit log entries created');

    const totalDeleted = metricsDeleted.count + changesDeleted.count;

    return Response.json(
      {
        success: true,
        metricsDeleted: metricsDeleted.count,
        changesDeleted: changesDeleted.count,
        totalDeleted,
        cutoffDate: cutoffDate.toISOString(),
        message: `Pruned ${totalDeleted} records older than ${cutoffDate.toISOString()}`,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error pruning data:', error);
    return Response.json(
      { error: 'Failed to prune data', details: error.message },
      { status: 500 }
    );
  } finally {
    await client.end();
  }
}
