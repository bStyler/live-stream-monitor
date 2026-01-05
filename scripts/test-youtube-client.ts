/**
 * Test script for YouTube API client
 * Fetches live streams from The Grand Sound channel
 */

import { config } from 'dotenv';
import { searchLiveStreams, fetchStreamData, getQuotaUsage } from '../lib/youtube-client';

config({ path: '.env.local' });

async function main() {
  console.log('🎥 Testing YouTube API Client\n');
  console.log('Channel: The Grand Sound');
  console.log('Searching for: "The Grand Sound live"\n');

  try {
    // Search for live streams from the channel
    console.log('📡 Searching for live streams...');
    const videoIds = await searchLiveStreams('The Grand Sound live');

    console.log(`\n✅ Found ${videoIds.length} live stream(s)\n`);

    if (videoIds.length === 0) {
      console.log('No live streams currently active.');
      return;
    }

    // Fetch detailed information for each stream
    console.log('📊 Fetching stream details...\n');
    const streams = await fetchStreamData(videoIds);

    // Display stream information
    streams.forEach((stream, index) => {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`Stream ${index + 1}:`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📺 Title: ${stream.snippet?.title}`);
      console.log(`🔗 Video ID: ${stream.id}`);
      console.log(`🔴 Status: ${stream.snippet?.liveBroadcastContent}`);

      if (stream.liveStreamingDetails) {
        const concurrentViewers = stream.liveStreamingDetails.concurrentViewers;
        const scheduledStart = stream.liveStreamingDetails.scheduledStartTime;
        const actualStart = stream.liveStreamingDetails.actualStartTime;

        if (concurrentViewers) {
          console.log(`👥 Concurrent Viewers: ${Number(concurrentViewers).toLocaleString()}`);
        }
        if (actualStart) {
          console.log(`⏰ Started: ${new Date(actualStart).toLocaleString()}`);
        } else if (scheduledStart) {
          console.log(`📅 Scheduled: ${new Date(scheduledStart).toLocaleString()}`);
        }
      }

      if (stream.statistics) {
        const likes = stream.statistics.likeCount;
        const views = stream.statistics.viewCount;

        if (likes) {
          console.log(`👍 Likes: ${Number(likes).toLocaleString()}`);
        }
        if (views) {
          console.log(`📊 Views: ${Number(views).toLocaleString()}`);
        }
      }

      console.log(`\n🖼️  Thumbnail: ${stream.snippet?.thumbnails?.high?.url}`);
      console.log(`\n`);
    });

    // Display quota usage
    const quota = getQuotaUsage();
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📊 API Quota Usage:`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Used: ${quota.used} / ${quota.limit} units (${quota.percentUsed}%)`);
    console.log(`Remaining: ${quota.remaining} units`);
    console.log(`\n✅ Test completed successfully!`);

  } catch (error) {
    console.error('❌ Error testing YouTube client:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
