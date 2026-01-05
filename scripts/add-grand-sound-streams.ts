/**
 * Add The Grand Sound's live streams to database
 * Links streams to test user with alerts enabled
 */

import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { streams, userStreams } from '../db/schema';
import { fetchStreamData } from '../lib/youtube-client';

config({ path: '.env.local' });

// The Grand Sound's 3 live stream video IDs
const GRAND_SOUND_VIDEO_IDS = [
  '6Q7tdD5lJxg', // Progressive House · Relaxing Focus Music
  'Ihm9OQWmibA', // Deep House · Smooth Background Music
  'sCwY5iJsaiM', // 'Night Drive' · Deep & Progressive House Mix
];

// Test user ID from verify-test-user.ts
const TEST_USER_ID = 'sysSPxYZAjpoOPnCwZmrRdBgAWX2RtlS';

async function main() {
  const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL not set');

  const client = postgres(connectionString);
  const db = drizzle(client);

  console.log('🎥 Adding The Grand Sound streams to database\n');
  console.log('Fetching stream data from YouTube API...\n');

  try {
    // Fetch full stream data from YouTube
    const streamData = await fetchStreamData(GRAND_SOUND_VIDEO_IDS);

    if (streamData.length === 0) {
      console.log('❌ No stream data returned from YouTube API');
      return;
    }

    console.log(`✅ Found ${streamData.length} streams\n`);

    // Insert each stream into database
    for (const stream of streamData) {
      const snippet = stream.snippet;
      const liveDetails = stream.liveStreamingDetails;
      const stats = stream.statistics;

      if (!snippet || !stream.id) {
        console.warn(`⚠️  Skipping stream - missing required data`);
        continue;
      }

      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📺 ${snippet.title}`);
      console.log(`🔗 Video ID: ${stream.id}`);
      console.log(`📺 Channel: ${snippet.channelTitle} (${snippet.channelId})`);

      // Insert into streams table
      const insertedStreams = await db
        .insert(streams)
        .values({
          youtubeVideoId: stream.id,
          channelId: snippet.channelId || 'unknown',
          channelTitle: snippet.channelTitle || 'The Grand Sound',
          title: snippet.title || 'Untitled Stream',
          description: snippet.description,
          thumbnailUrl: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url,
          isLive: snippet.liveBroadcastContent === 'live',
          scheduledStartTime: liveDetails?.scheduledStartTime
            ? new Date(liveDetails.scheduledStartTime)
            : null,
          actualStartTime: liveDetails?.actualStartTime
            ? new Date(liveDetails.actualStartTime)
            : null,
          currentViewerCount: liveDetails?.concurrentViewers
            ? parseInt(liveDetails.concurrentViewers, 10)
            : null,
          peakViewerCount: liveDetails?.concurrentViewers
            ? parseInt(liveDetails.concurrentViewers, 10)
            : null,
          likeCount: stats?.likeCount ? parseInt(stats.likeCount, 10) : null,
          lastFetchedAt: new Date(),
        })
        .returning();

      const insertedStream = insertedStreams[0];

      console.log(`✅ Inserted stream (ID: ${insertedStream.id})`);
      console.log(`   Status: ${insertedStream.isLive ? '🔴 LIVE' : '⚫ Offline'}`);
      if (insertedStream.currentViewerCount) {
        console.log(`   Viewers: ${insertedStream.currentViewerCount.toLocaleString()}`);
      }
      if (insertedStream.likeCount) {
        console.log(`   Likes: ${insertedStream.likeCount.toLocaleString()}`);
      }

      // Link to test user with alerts enabled
      await db.insert(userStreams).values({
        userId: TEST_USER_ID,
        streamId: insertedStream.id,
        alertOnLive: true,
        alertOnScheduled: false,
        alertOnEnded: false,
      });

      console.log(`✅ Linked to test user with live alerts enabled`);
      console.log('');
    }

    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`✅ Successfully added ${streamData.length} streams to database`);
    console.log(`✅ All streams linked to test@example.com with alerts enabled\n`);

  } catch (error) {
    console.error('❌ Error adding streams:', error);
    process.exit(1);
  } finally {
    await client.end();
  }

  process.exit(0);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
