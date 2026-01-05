/**
 * Stream Management Service
 * Handles adding/removing streams for users with deduplication
 */

import { db } from '@/db/drizzle';
import { streams, userStreams } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { fetchStreamData, extractVideoId as extractYouTubeVideoId } from './youtube-client';

/**
 * YouTube video ID validation regex
 * Matches 11-character alphanumeric IDs with hyphens and underscores
 */
const YOUTUBE_VIDEO_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

/**
 * Validates YouTube video ID format
 */
export function isValidYouTubeVideoId(videoId: string): boolean {
  return YOUTUBE_VIDEO_ID_REGEX.test(videoId);
}

/**
 * Extracts video ID from YouTube URL or returns the ID if already in correct format
 * Uses the youtube-client's extractVideoId function
 */
export function extractVideoId(input: string): string | null {
  // If already a valid video ID, return it
  if (isValidYouTubeVideoId(input)) {
    return input;
  }

  // Use youtube-client's extract function for URL parsing
  return extractYouTubeVideoId(input);
}

/**
 * Add a stream for a user with deduplication
 * If stream exists, only creates user_streams relationship
 * If new stream, fetches metadata from YouTube and creates stream + relationship
 */
export async function addStreamForUser(
  userId: string,
  videoIdOrUrl: string
): Promise<{ success: boolean; streamId?: string; error?: string }> {
  try {
    // Extract and validate video ID
    const videoId = extractVideoId(videoIdOrUrl);
    if (!videoId) {
      return {
        success: false,
        error: 'Invalid YouTube video ID or URL',
      };
    }

    // Check if stream already exists
    const existingStream = await db
      .select()
      .from(streams)
      .where(eq(streams.youtubeVideoId, videoId))
      .limit(1);

    let streamId: string;

    if (existingStream.length > 0) {
      // Stream exists, use existing ID
      streamId = existingStream[0].id;
      console.log(`Stream ${videoId} already exists with ID ${streamId}`);
    } else {
      // New stream, fetch metadata from YouTube
      console.log(`Fetching metadata for new stream ${videoId}...`);
      const streamData = await fetchStreamData([videoId]);

      if (!streamData || streamData.length === 0) {
        return {
          success: false,
          error: 'Stream not found on YouTube or API error',
        };
      }

      const video = streamData[0];
      const snippet = video.snippet;
      const liveDetails = video.liveStreamingDetails;
      const stats = video.statistics;

      if (!snippet) {
        return {
          success: false,
          error: 'Stream metadata not available',
        };
      }

      // Determine if stream is live
      const isLive = liveDetails?.actualEndTime === undefined && liveDetails?.concurrentViewers !== undefined;

      // Get thumbnail URL (use maxres, then standard, then high, then default)
      const thumbnailUrl =
        snippet.thumbnails?.maxres?.url ||
        snippet.thumbnails?.standard?.url ||
        snippet.thumbnails?.high?.url ||
        snippet.thumbnails?.default?.url ||
        null;

      // Insert new stream
      const newStream = await db
        .insert(streams)
        .values({
          youtubeVideoId: videoId,
          channelId: snippet.channelId || '',
          channelTitle: snippet.channelTitle || '',
          title: snippet.title || '',
          description: snippet.description || null,
          thumbnailUrl,
          isLive,
          currentViewerCount: liveDetails?.concurrentViewers ? parseInt(liveDetails.concurrentViewers) : null,
          peakViewerCount: liveDetails?.concurrentViewers ? parseInt(liveDetails.concurrentViewers) : null,
          likeCount: stats?.likeCount ? parseInt(stats.likeCount) : null,
          scheduledStartTime: liveDetails?.scheduledStartTime ? new Date(liveDetails.scheduledStartTime) : null,
          actualStartTime: liveDetails?.actualStartTime ? new Date(liveDetails.actualStartTime) : null,
          actualEndTime: null,
          lastFetchedAt: new Date(),
        })
        .returning({ id: streams.id });

      streamId = newStream[0].id;
      console.log(`Created new stream ${videoId} with ID ${streamId}`);
    }

    // Check if user already has this stream
    const existingUserStream = await db
      .select()
      .from(userStreams)
      .where(and(eq(userStreams.userId, userId), eq(userStreams.streamId, streamId)))
      .limit(1);

    if (existingUserStream.length > 0) {
      return {
        success: false,
        error: 'You are already monitoring this stream',
      };
    }

    // Create user_streams relationship with default alert settings
    await db.insert(userStreams).values({
      userId,
      streamId,
      alertOnLive: true,
      alertOnScheduled: false,
      alertOnEnded: false,
    });

    console.log(`Added stream ${streamId} for user ${userId}`);

    return {
      success: true,
      streamId,
    };
  } catch (error: any) {
    console.error('Error adding stream for user:', error);
    return {
      success: false,
      error: error.message || 'Failed to add stream',
    };
  }
}

/**
 * Remove a stream from user's monitored list
 * Note: Stream remains in database for other users
 */
export async function removeStreamForUser(
  userId: string,
  streamId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await db
      .delete(userStreams)
      .where(and(eq(userStreams.userId, userId), eq(userStreams.streamId, streamId)))
      .returning();

    if (result.length === 0) {
      return {
        success: false,
        error: 'Stream not found in your monitored list',
      };
    }

    console.log(`Removed stream ${streamId} for user ${userId}`);

    return { success: true };
  } catch (error: any) {
    console.error('Error removing stream for user:', error);
    return {
      success: false,
      error: error.message || 'Failed to remove stream',
    };
  }
}
