/**
 * Verify The Grand Sound streams were added to database
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
    console.log('Verifying The Grand Sound streams in database...\n');

    // Check streams table
    const streamsResult = await client.query(`
      SELECT
        id,
        youtube_video_id,
        channel_title,
        title,
        is_live,
        current_viewer_count,
        like_count,
        created_at
      FROM streams
      WHERE channel_id = 'UC14ap4T608Zz_Mz4eezhIqw'
      ORDER BY current_viewer_count DESC
    `);

    console.log(`✅ Found ${streamsResult.rows.length} streams in database:\n`);

    streamsResult.rows.forEach((stream, index) => {
      console.log(`${index + 1}. ${stream.title}`);
      console.log(`   Video ID: ${stream.youtube_video_id}`);
      console.log(`   Status: ${stream.is_live ? '🔴 LIVE' : '⚫ Offline'}`);
      console.log(`   Viewers: ${stream.current_viewer_count?.toLocaleString() || 'N/A'}`);
      console.log(`   Likes: ${stream.like_count?.toLocaleString() || 'N/A'}`);
      console.log(`   Database ID: ${stream.id}`);
      console.log('');
    });

    // Check user_streams linkage
    const userStreamsResult = await client.query(`
      SELECT
        us.user_id,
        us.alert_on_live,
        s.title,
        u.email
      FROM user_streams us
      JOIN streams s ON us.stream_id = s.id
      JOIN "user" u ON us.user_id = u.id
      WHERE s.channel_id = 'UC14ap4T608Zz_Mz4eezhIqw'
    `);

    console.log(`✅ User Stream Associations: ${userStreamsResult.rows.length}`);
    userStreamsResult.rows.forEach((link) => {
      console.log(`   User: ${link.email}`);
      console.log(`   Stream: ${link.title}`);
      console.log(`   Alerts: ${link.alert_on_live ? '✅ Enabled' : '❌ Disabled'}\n`);
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
