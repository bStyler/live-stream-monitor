/**
 * Quick script to get stream IDs for testing charts
 */

import { config } from 'dotenv';
import postgres from 'postgres';

// Load environment variables
config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL not found');
  process.exit(1);
}

const client = postgres(connectionString);

async function getStreamIds() {
  try {
    const allStreams = await client`
      SELECT id, youtube_video_id, title, is_live
      FROM streams
      ORDER BY created_at DESC
    `;

    console.log('\n📺 Available Streams for Testing:\n');

    allStreams.forEach((stream: any, index: number) => {
      console.log(`${index + 1}. ${stream.title}`);
      console.log(`   Video ID: ${stream.youtube_video_id}`);
      console.log(`   Stream ID: ${stream.id}`);
      console.log(`   Status: ${stream.is_live ? '🔴 LIVE' : '⚫ Offline'}`);
      console.log(`   Test URL: http://localhost:3001/dashboard/streams/${stream.id}`);
      console.log('');
    });

    console.log(`\n✅ Found ${allStreams.length} stream(s)\n`);
  } catch (error) {
    console.error('❌ Error fetching streams:', error);
  } finally {
    await client.end();
  }
}

getStreamIds();
