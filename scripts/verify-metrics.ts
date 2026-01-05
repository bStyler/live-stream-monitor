/**
 * Verify stream metrics were inserted into database
 */

import { config } from 'dotenv';
import { Client } from 'pg';

config({ path: '.env.local' });

async function main() {
  const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL not set');

  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('Verifying stream metrics in database...\n');

    // Check stream_metrics table
    const metricsResult = await client.query(`
      SELECT
        sm.id,
        s.title,
        sm.viewer_count,
        sm.like_count,
        sm.recorded_at
      FROM stream_metrics sm
      JOIN streams s ON sm.stream_id = s.id
      ORDER BY sm.recorded_at DESC
      LIMIT 10
    `);

    console.log(`✅ Found ${metricsResult.rows.length} metric record(s):\n`);

    metricsResult.rows.forEach((metric, index) => {
      console.log(`${index + 1}. ${metric.title}`);
      console.log(`   Viewers: ${metric.viewer_count?.toLocaleString() || 'N/A'}`);
      console.log(`   Likes: ${metric.like_count?.toLocaleString() || 'N/A'}`);
      console.log(`   Recorded: ${new Date(metric.recorded_at).toLocaleString()}`);
      console.log('');
    });

    // Check stream_changes table
    const changesResult = await client.query(`
      SELECT
        sc.id,
        s.title,
        sc.change_type,
        sc.old_value,
        sc.new_value,
        sc.detected_at
      FROM stream_changes sc
      JOIN streams s ON sc.stream_id = s.id
      ORDER BY sc.detected_at DESC
      LIMIT 10
    `);

    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`✅ Found ${changesResult.rows.length} change record(s):\n`);

    changesResult.rows.forEach((change, index) => {
      console.log(`${index + 1}. ${change.title}`);
      console.log(`   Change: ${change.change_type}`);
      console.log(`   Old: ${JSON.stringify(change.old_value)}`);
      console.log(`   New: ${JSON.stringify(change.new_value)}`);
      console.log(`   Detected: ${new Date(change.detected_at).toLocaleString()}`);
      console.log('');
    });

    // Check streams table for updated last_fetched_at
    const streamsResult = await client.query(`
      SELECT
        title,
        is_live,
        current_viewer_count,
        peak_viewer_count,
        like_count,
        last_fetched_at
      FROM streams
      WHERE channel_id = 'UC14ap4T608Zz_Mz4eezhIqw'
      ORDER BY current_viewer_count DESC
    `);

    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`✅ Stream status updates:\n`);

    streamsResult.rows.forEach((stream, index) => {
      console.log(`${index + 1}. ${stream.title}`);
      console.log(`   Status: ${stream.is_live ? '🔴 LIVE' : '⚫ Offline'}`);
      console.log(`   Current viewers: ${stream.current_viewer_count?.toLocaleString() || 'N/A'}`);
      console.log(`   Peak viewers: ${stream.peak_viewer_count?.toLocaleString() || 'N/A'}`);
      console.log(`   Likes: ${stream.like_count?.toLocaleString() || 'N/A'}`);
      console.log(`   Last fetched: ${new Date(stream.last_fetched_at).toLocaleString()}`);
      console.log('');
    });

  } finally {
    await client.end();
  }

  process.exit(0);
}

main().catch((error) => {
  console.error('Verification failed:', error);
  process.exit(1);
});
