/**
 * Watch metrics accumulate in real-time
 * Shows time-series data being collected by the polling service
 */

import { config } from 'dotenv';
import { Client } from 'pg';

config({ path: '.env.local' });

async function displayMetrics() {
  const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL not set');

  const client = new Client({ connectionString });

  try {
    await client.connect();

    // Get total metric count
    const countResult = await client.query('SELECT COUNT(*) as count FROM stream_metrics');
    const totalMetrics = parseInt(countResult.rows[0].count);

    // Get metrics from last 5 minutes grouped by minute
    const metricsResult = await client.query(`
      SELECT
        s.title,
        DATE_TRUNC('minute', sm.recorded_at) as minute,
        COUNT(*) as snapshots,
        AVG(sm.viewer_count)::int as avg_viewers,
        MAX(sm.viewer_count) as max_viewers,
        MIN(sm.viewer_count) as min_viewers,
        MAX(sm.like_count) as likes
      FROM stream_metrics sm
      JOIN streams s ON sm.stream_id = s.id
      WHERE sm.recorded_at > NOW() - INTERVAL '5 minutes'
      GROUP BY s.title, DATE_TRUNC('minute', sm.recorded_at)
      ORDER BY minute DESC, s.title
      LIMIT 20
    `);

    // Get latest snapshot for each stream
    const latestResult = await client.query(`
      SELECT DISTINCT ON (s.id)
        s.title,
        sm.viewer_count,
        sm.like_count,
        sm.view_count,
        sm.recorded_at,
        s.peak_viewer_count
      FROM stream_metrics sm
      JOIN streams s ON sm.stream_id = s.id
      ORDER BY s.id, sm.recorded_at DESC
    `);

    console.clear();
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 LIVE METRICS DASHBOARD');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Total snapshots in database: ${totalMetrics.toLocaleString()}`);
    console.log(`Updated: ${new Date().toLocaleString()}\n`);

    console.log('📺 CURRENT STREAM STATUS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    latestResult.rows.forEach((stream) => {
      const timeSince = Math.floor((Date.now() - new Date(stream.recorded_at).getTime()) / 1000);
      console.log(`\n${stream.title}`);
      console.log(`  Current: ${stream.viewer_count?.toLocaleString() || 'N/A'} viewers`);
      console.log(`  Peak: ${stream.peak_viewer_count?.toLocaleString() || 'N/A'} viewers`);
      console.log(`  Likes: ${stream.like_count?.toLocaleString() || 'N/A'}`);
      console.log(`  Total views (all-time): ${stream.view_count?.toLocaleString() || 'N/A'} 🎥`);
      console.log(`  Last updated: ${timeSince}s ago`);
    });

    console.log('\n\n📈 METRICS HISTORY (Last 5 minutes):');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (metricsResult.rows.length === 0) {
      console.log('\n⏳ No metrics collected in last 5 minutes.');
      console.log('   Waiting for polling service to collect data...\n');
    } else {
      metricsResult.rows.forEach((row) => {
        const minute = new Date(row.minute).toLocaleTimeString();
        console.log(`\n${minute} - ${row.title}`);
        console.log(`  Snapshots: ${row.snapshots}`);
        console.log(`  Viewers: ${row.min_viewers} - ${row.max_viewers} (avg: ${row.avg_viewers})`);
        console.log(`  Likes: ${row.likes?.toLocaleString()}`);
      });
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💡 TIP: Metrics are collected every 60 seconds by the polling service');
    console.log('   Run this script repeatedly to watch data accumulate over time');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } finally {
    await client.end();
  }
}

displayMetrics().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
