/**
 * YouTube Stream Polling Service
 * Fetches live stream metrics and detects metadata changes
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, or, lt, and, isNull } from 'drizzle-orm';
import { streams, streamMetrics, streamChanges } from '../db/schema';
import { fetchStreamData } from './youtube-client';

/**
 * Poll YouTube for stream metrics and metadata
 * Called by cron job every 60 seconds
 *
 * @param maxStreams Maximum number of streams to poll per execution (default: 200)
 * @returns Poll results with counts
 */
export async function pollYouTubeMetrics(maxStreams: number = 200) {
  const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL not set');
  }

  const client = postgres(connectionString);
  const db = drizzle(client);

  try {
    console.log('🔄 Starting YouTube metrics poll...');

    // Fetch streams that need polling
    // Priority: Live streams OR streams not checked in last 55 seconds OR never checked
    const activeStreams = await db
      .select()
      .from(streams)
      .where(
        and(
          or(
            eq(streams.isLive, true),
            isNull(streams.lastFetchedAt),
            lt(streams.lastFetchedAt, new Date(Date.now() - 55000))
          ),
          // Exclude soft-deleted streams
          isNull(streams.deletedAt)
        )
      )
      .limit(maxStreams);

    if (activeStreams.length === 0) {
      console.log('No streams to poll');
      return {
        success: true,
        polled: 0,
        metricsInserted: 0,
        changesDetected: 0,
      };
    }

    console.log(`📊 Polling ${activeStreams.length} stream(s)...`);

    // Fetch fresh data from YouTube API
    const videoIds = activeStreams.map((s) => s.youtubeVideoId);
    const youtubeData = await fetchStreamData(videoIds);

    console.log(`✅ Received data for ${youtubeData.length} stream(s) from YouTube`);

    // Process each stream
    const metricsToInsert = [];
    const changesToInsert = [];
    const streamsToUpdate = [];

    for (const video of youtubeData) {
      const stream = activeStreams.find((s) => s.youtubeVideoId === video.id);
      if (!stream) continue;

      const snippet = video.snippet;
      const liveDetails = video.liveStreamingDetails;
      const stats = video.statistics;

      // Extract current metrics
      const currentViewers = liveDetails?.concurrentViewers
        ? parseInt(liveDetails.concurrentViewers, 10)
        : null;
      const currentLikes = stats?.likeCount ? parseInt(stats.likeCount, 10) : null;
      const totalViews = stats?.viewCount ? parseInt(stats.viewCount, 10) : null;
      const isLive = snippet?.liveBroadcastContent === 'live';

      // Insert metric snapshot
      metricsToInsert.push({
        streamId: stream.id,
        viewerCount: currentViewers,
        likeCount: currentLikes,
        viewCount: totalViews,
        recordedAt: new Date(),
      });

      // Detect metadata changes
      const newTitle = snippet?.title || stream.title;
      const newThumbnail = snippet?.thumbnails?.high?.url || stream.thumbnailUrl;
      const newDescription = snippet?.description || stream.description;

      // Title change
      if (stream.title !== newTitle) {
        changesToInsert.push({
          streamId: stream.id,
          changeType: 'TITLE_CHANGED',
          oldValue: { title: stream.title },
          newValue: { title: newTitle },
          detectedAt: new Date(),
        });
      }

      // Thumbnail change
      if (stream.thumbnailUrl !== newThumbnail) {
        changesToInsert.push({
          streamId: stream.id,
          changeType: 'THUMBNAIL_CHANGED',
          oldValue: { thumbnailUrl: stream.thumbnailUrl },
          newValue: { thumbnailUrl: newThumbnail },
          detectedAt: new Date(),
        });
      }

      // Description change
      if (stream.description !== newDescription) {
        changesToInsert.push({
          streamId: stream.id,
          changeType: 'DESCRIPTION_CHANGED',
          oldValue: { description: stream.description },
          newValue: { description: newDescription },
          detectedAt: new Date(),
        });
      }

      // Live status change
      if (stream.isLive !== isLive) {
        changesToInsert.push({
          streamId: stream.id,
          changeType: isLive ? 'WENT_LIVE' : 'ENDED',
          oldValue: { isLive: stream.isLive },
          newValue: { isLive },
          detectedAt: new Date(),
        });
      }

      // Prepare stream update
      streamsToUpdate.push({
        id: stream.id,
        title: newTitle,
        description: newDescription,
        thumbnailUrl: newThumbnail,
        isLive,
        currentViewerCount: currentViewers,
        peakViewerCount:
          currentViewers && stream.peakViewerCount
            ? Math.max(currentViewers, stream.peakViewerCount)
            : currentViewers || stream.peakViewerCount,
        likeCount: currentLikes,
        actualStartTime: liveDetails?.actualStartTime
          ? new Date(liveDetails.actualStartTime)
          : stream.actualStartTime,
        actualEndTime: !isLive && stream.isLive ? new Date() : stream.actualEndTime,
        lastFetchedAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Batch insert metrics
    if (metricsToInsert.length > 0) {
      await db.insert(streamMetrics).values(metricsToInsert);
      console.log(`📈 Inserted ${metricsToInsert.length} metric snapshot(s)`);
    }

    // Batch insert changes
    if (changesToInsert.length > 0) {
      await db.insert(streamChanges).values(changesToInsert);
      console.log(`🔔 Detected ${changesToInsert.length} change(s)`);
    }

    // Update streams
    for (const streamUpdate of streamsToUpdate) {
      await db
        .update(streams)
        .set(streamUpdate)
        .where(eq(streams.id, streamUpdate.id));
    }

    console.log(`✅ Updated ${streamsToUpdate.length} stream(s)`);

    return {
      success: true,
      polled: activeStreams.length,
      metricsInserted: metricsToInsert.length,
      changesDetected: changesToInsert.length,
    };
  } catch (error) {
    console.error('❌ Error polling YouTube metrics:', error);
    throw error;
  } finally {
    await client.end();
  }
}
