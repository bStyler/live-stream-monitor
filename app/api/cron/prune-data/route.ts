/**
 * Data Pruning Cron Endpoint
 * Deletes stream_metrics and stream_changes records older than 30 days
 * Deletes activity_logs records older than 90 days
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

    // Calculate cutoff dates
    const streamCutoffDate = new Date();
    streamCutoffDate.setDate(streamCutoffDate.getDate() - 30); // 30 days for stream data

    const activityCutoffDate = new Date();
    activityCutoffDate.setDate(activityCutoffDate.getDate() - 90); // 90 days for activity logs

    console.log(`Deleting stream records older than ${streamCutoffDate.toISOString()}`);
    console.log(`Deleting activity logs older than ${activityCutoffDate.toISOString()}`);

    // Delete old stream_metrics records (30 days)
    const metricsDeleted = await client`
      DELETE FROM stream_metrics
      WHERE recorded_at < ${streamCutoffDate}
    `;

    console.log(`Deleted ${metricsDeleted.count} stream_metrics records`);

    // Delete old stream_changes records (30 days)
    const changesDeleted = await client`
      DELETE FROM stream_changes
      WHERE detected_at < ${streamCutoffDate}
    `;

    console.log(`Deleted ${changesDeleted.count} stream_changes records`);

    // Delete old activity_logs records (90 days)
    const activityDeleted = await client`
      DELETE FROM activity_logs
      WHERE created_at < ${activityCutoffDate}
    `;

    console.log(`Deleted ${activityDeleted.count} activity_logs records`);

    // Insert audit log entry
    await client`
      INSERT INTO data_deletion_log (
        table_name,
        deletion_type,
        records_deleted,
        oldest_record_date,
        deleted_at
      ) VALUES
        ('stream_metrics', 'SCHEDULED_PRUNE', ${metricsDeleted.count}, ${streamCutoffDate}, NOW()),
        ('stream_changes', 'SCHEDULED_PRUNE', ${changesDeleted.count}, ${streamCutoffDate}, NOW()),
        ('activity_logs', 'SCHEDULED_PRUNE', ${activityDeleted.count}, ${activityCutoffDate}, NOW())
    `;

    console.log('Audit log entries created');

    const totalDeleted = metricsDeleted.count + changesDeleted.count + activityDeleted.count;

    return Response.json(
      {
        success: true,
        metricsDeleted: metricsDeleted.count,
        changesDeleted: changesDeleted.count,
        activityDeleted: activityDeleted.count,
        totalDeleted,
        streamCutoffDate: streamCutoffDate.toISOString(),
        activityCutoffDate: activityCutoffDate.toISOString(),
        message: `Pruned ${totalDeleted} records (${metricsDeleted.count} metrics, ${changesDeleted.count} changes, ${activityDeleted.count} activity logs)`,
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
