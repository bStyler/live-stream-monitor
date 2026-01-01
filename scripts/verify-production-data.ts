/**
 * Verify production database has stream metrics
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
    console.log('✅ Connected to production database\n');

    // Check streams
    const streamsResult = await client.query('SELECT COUNT(*) as count FROM streams');
    console.log(`📺 Total streams: ${streamsResult.rows[0].count}`);

    // Check metrics
    const metricsResult = await client.query('SELECT COUNT(*) as count FROM stream_metrics');
    console.log(`📊 Total metrics: ${metricsResult.rows[0].count}`);

    // Get latest metrics
    const latestResult = await client.query(`
      SELECT
        s.title,
        sm.viewer_count,
        sm.like_count,
        sm.view_count,
        sm.recorded_at
      FROM stream_metrics sm
      JOIN streams s ON sm.stream_id = s.id
      ORDER BY sm.recorded_at DESC
      LIMIT 5
    `);

    console.log('\n📈 Latest metrics:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    latestResult.rows.forEach((row, index) => {
      console.log(`\n${index + 1}. ${row.title}`);
      console.log(`   Viewers: ${row.viewer_count?.toLocaleString() || 'N/A'}`);
      console.log(`   Likes: ${row.like_count?.toLocaleString() || 'N/A'}`);
      console.log(`   Total views: ${row.view_count?.toLocaleString() || 'N/A'}`);
      console.log(`   Recorded: ${new Date(row.recorded_at).toLocaleString()}`);
    });

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n✅ Production database verification complete!\n');

  } finally {
    await client.end();
  }

  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Verification failed:', error);
  process.exit(1);
});
