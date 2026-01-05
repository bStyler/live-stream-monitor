/**
 * Verify viewCount is being tracked
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
    console.log('Verifying viewCount is being tracked...\n');

    // Get latest metrics with viewCount
    const result = await client.query(`
      SELECT
        s.title,
        sm.viewer_count as concurrent_viewers,
        sm.like_count as likes,
        sm.view_count as total_views,
        sm.recorded_at
      FROM stream_metrics sm
      JOIN streams s ON sm.stream_id = s.id
      ORDER BY sm.recorded_at DESC
      LIMIT 5
    `);

    console.log(`✅ Latest ${result.rows.length} metric snapshots:\n`);

    result.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.title}`);
      console.log(`   Concurrent viewers: ${row.concurrent_viewers?.toLocaleString() || 'N/A'}`);
      console.log(`   Likes: ${row.likes?.toLocaleString() || 'N/A'}`);
      console.log(`   Total views (all-time): ${row.total_views?.toLocaleString() || 'N/A'} ✨`);
      console.log(`   Recorded: ${new Date(row.recorded_at).toLocaleString()}`);
      console.log('');
    });

    if (result.rows.every(row => row.total_views !== null)) {
      console.log('✅ SUCCESS: viewCount is being tracked correctly!');
    } else {
      console.log('⚠️  WARNING: Some metrics are missing viewCount');
    }

  } finally {
    await client.end();
  }

  process.exit(0);
}

main().catch((error) => {
  console.error('Verification failed:', error);
  process.exit(1);
});
