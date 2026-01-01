import { google, youtube_v3 } from 'googleapis';

/**
 * YouTube Data API v3 Client
 * Handles fetching live stream data with quota optimization and error handling
 */

// Lazy initialization to ensure env variables are loaded
let _youtube: youtube_v3.Youtube | null = null;

function getYouTubeClient(): youtube_v3.Youtube {
  if (!_youtube) {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      throw new Error('YOUTUBE_API_KEY environment variable is not set');
    }
    _youtube = google.youtube({
      version: 'v3',
      auth: apiKey,
    });
  }
  return _youtube;
}

// ETag cache for quota optimization (304 Not Modified responses)
const etagCache = new Map<string, string>();

// Quota tracking (for monitoring and admin alerts)
let dailyQuotaUsed = 0;
const QUOTA_LIMIT = 10000;

/**
 * Fetch live stream data for multiple video IDs
 * Batches requests (max 50 IDs per request) and handles errors gracefully
 *
 * @param videoIds Array of YouTube video IDs to fetch
 * @returns Array of video items with live streaming details
 */
export async function fetchStreamData(videoIds: string[]): Promise<youtube_v3.Schema$Video[]> {
  if (videoIds.length === 0) return [];

  // Batch video IDs (YouTube API allows max 50 per request)
  const batches = chunk(videoIds, 50);

  try {
    const results = await Promise.all(
      batches.map((batch) => fetchBatch(batch))
    );

    return results.flatMap((r) => r || []);
  } catch (error) {
    console.error('Error fetching stream data:', error);
    throw error;
  }
}

/**
 * Fetch a single batch of video IDs (max 50)
 */
async function fetchBatch(videoIds: string[]): Promise<youtube_v3.Schema$Video[]> {
  const batchKey = videoIds[0]; // Use first video ID as cache key
  const etag = etagCache.get(batchKey);

  try {
    const response = await getYouTubeClient().videos.list({
      part: ['snippet', 'liveStreamingDetails', 'statistics'],
      id: videoIds.join(','),
      ...(etag && { headers: { 'If-None-Match': etag } }),
    });

    // Track quota usage (videos.list costs 1 unit per request)
    dailyQuotaUsed += 1;

    // Cache ETag for next request
    if (response.headers.etag) {
      etagCache.set(batchKey, response.headers.etag);
    }

    // Check for quota warnings (at 80% usage)
    if (dailyQuotaUsed > QUOTA_LIMIT * 0.8) {
      console.warn(`YouTube API quota at ${Math.round((dailyQuotaUsed / QUOTA_LIMIT) * 100)}% usage`);
    }

    return response.data.items || [];
  } catch (error: any) {
    return handleYouTubeError(error, videoIds);
  }
}

/**
 * Handle YouTube API errors with appropriate retry and fallback strategies
 */
function handleYouTubeError(error: any, videoIds: string[]): youtube_v3.Schema$Video[] {
  const statusCode = error.code || error.response?.status;

  // Quota exceeded (403)
  if (statusCode === 403 && error.message?.includes('quota')) {
    console.error('YouTube API quota exceeded. Skipping poll until reset.');
    dailyQuotaUsed = QUOTA_LIMIT; // Mark quota as exhausted
    // TODO: Send admin alert email
    return [];
  }

  // Rate limiting (429)
  if (statusCode === 429) {
    console.warn('YouTube API rate limit hit. Will retry with backoff.');
    // Exponential backoff will be handled by retry wrapper
    throw error;
  }

  // YouTube server error (500+) - retry
  if (statusCode >= 500) {
    console.error(`YouTube API server error (${statusCode}). Retrying...`);
    return retryWithBackoff(() => fetchBatch(videoIds), 3);
  }

  // Invalid video IDs or not found (404)
  if (statusCode === 404) {
    console.warn('YouTube videos not found:', videoIds);
    return [];
  }

  // Unknown error - log and skip
  console.error('Unknown YouTube API error:', error);
  return [];
}

/**
 * Retry function with exponential backoff
 * @param fn Function to retry
 * @param maxRetries Maximum number of retry attempts
 * @param delay Initial delay in ms
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries - 1) {
        const backoffDelay = delay * Math.pow(2, attempt);
        console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${backoffDelay}ms`);
        await sleep(backoffDelay);
      }
    }
  }

  throw lastError;
}

/**
 * Search for live streams by channel name or query
 * @param query Channel name or search query
 * @returns Array of live stream video IDs
 */
export async function searchLiveStreams(query: string): Promise<string[]> {
  try {
    // Search for live broadcasts matching the query
    const response = await getYouTubeClient().search.list({
      part: ['id'],
      q: query,
      eventType: 'live',
      type: ['video'],
      maxResults: 50,
    });

    dailyQuotaUsed += 100; // search.list costs 100 units

    return response.data.items?.map((item) => item.id?.videoId).filter(Boolean) as string[] || [];
  } catch (error) {
    console.error('Error searching live streams:', error);
    return [];
  }
}

/**
 * Fetch channel's live streams using channel ID
 * @param channelId YouTube channel ID (must start with UC)
 * @returns Array of live stream video IDs
 */
export async function fetchChannelLiveStreams(channelId: string): Promise<string[]> {
  try {
    // Search for live streams on this channel
    const response = await getYouTubeClient().search.list({
      part: ['id'],
      channelId,
      eventType: 'live',
      type: ['video'],
      maxResults: 50,
    });

    dailyQuotaUsed += 100; // search.list costs 100 units

    return response.data.items?.map((item) => item.id?.videoId).filter(Boolean) as string[] || [];
  } catch (error) {
    console.error('Error fetching channel live streams:', error);
    return [];
  }
}

/**
 * Resolve channel ID from custom URL (e.g., /c/TheGrandSound)
 * @param channelIdentifier Channel ID, custom URL, or username
 * @returns Channel ID
 */
async function resolveChannelId(channelIdentifier: string): Promise<string> {
  // If already a channel ID (starts with UC), return it
  if (channelIdentifier.startsWith('UC')) {
    return channelIdentifier;
  }

  // Extract from URL if provided
  let identifier = channelIdentifier;
  if (channelIdentifier.includes('youtube.com')) {
    const match = channelIdentifier.match(/\/(?:c|channel|user)\/([^/?]+)/);
    if (match) {
      identifier = match[1];
    }
  }

  try {
    // Try to find channel by custom URL or username
    const response = await getYouTubeClient().channels.list({
      part: ['id'],
      forHandle: identifier, // Try handle first (new style: @username)
      maxResults: 1,
    });

    if (response.data.items?.[0]?.id) {
      return response.data.items[0].id;
    }

    // Fallback: Try username search
    const searchResponse = await getYouTubeClient().search.list({
      part: ['id'],
      q: identifier,
      type: ['channel'],
      maxResults: 1,
    });

    const channelId = searchResponse.data.items?.[0]?.id?.channelId;
    if (!channelId) {
      throw new Error(`Could not resolve channel ID for: ${channelIdentifier}`);
    }

    return channelId;
  } catch (error) {
    console.error('Error resolving channel ID:', error);
    throw error;
  }
}

/**
 * Get quota usage statistics
 */
export function getQuotaUsage() {
  return {
    used: dailyQuotaUsed,
    limit: QUOTA_LIMIT,
    remaining: Math.max(0, QUOTA_LIMIT - dailyQuotaUsed),
    percentUsed: Math.round((dailyQuotaUsed / QUOTA_LIMIT) * 100),
  };
}

/**
 * Reset daily quota counter (call at midnight UTC)
 */
export function resetQuota() {
  dailyQuotaUsed = 0;
  etagCache.clear();
  console.log('YouTube API quota reset');
}

/**
 * Utility: Chunk array into smaller batches
 */
function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Utility: Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Extract video ID from YouTube URL
 * Supports formats: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/live/ID
 */
export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/, // Direct video ID
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}
