import { config } from 'dotenv';
import postgres from 'postgres';

config({ path: '.env.local' });

async function main() {
  const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL not set');
  }

  const client = postgres(connectionString);

  try {
    console.log('Fetching user streams...\n');

    // Get the test user
    const users = await client`SELECT id, email FROM "user" LIMIT 5`;
    console.log('Users:');
    users.forEach((u) => console.log(`  ${u.id}: ${u.email}`));

    if (users.length === 0) {
      console.log('No users found');
      return;
    }

    const userId = users[0].id;
    console.log(`\nFetching streams for user ${userId}...\n`);

    // Get user streams
    const userStreamsList = await client`
      SELECT
        s.id,
        s.youtube_video_id,
        s.channel_title,
        s.title,
        s.thumbnail_url,
        s.is_live,
        s.current_viewer_count,
        s.like_count,
        s.last_fetched_at,
        (
          SELECT view_count
          FROM stream_metrics
          WHERE stream_id = s.id
          ORDER BY recorded_at DESC
          LIMIT 1
        ) as view_count
      FROM user_streams us
      INNER JOIN streams s ON us.stream_id = s.id
      WHERE us.user_id = ${userId}
      ORDER BY s.is_live DESC, s.last_fetched_at DESC
    `;

    console.log(`Found ${userStreamsList.length} streams for this user:\n`);
    userStreamsList.forEach((stream) => {
      console.log(`Stream: ${stream.title}`);
      console.log(`  ID: ${stream.id}`);
      console.log(`  YouTube ID: ${stream.youtube_video_id}`);
      console.log(`  Channel: ${stream.channel_title}`);
      console.log(`  Is Live: ${stream.is_live}`);
      console.log(`  Viewers: ${stream.current_viewer_count || 'N/A'}`);
      console.log(`  Likes: ${stream.like_count || 'N/A'}`);
      console.log(`  Views: ${stream.view_count || 'N/A'}`);
      console.log(`  Last Fetched: ${stream.last_fetched_at}\n`);
    });

    // Also check all streams in database
    const allStreams = await client`SELECT id, youtube_video_id, title, is_live FROM streams ORDER BY id`;
    console.log(`\nTotal streams in database: ${allStreams.length}`);
    allStreams.forEach((s) => {
      console.log(`  ${s.youtube_video_id}: ${s.title} (live: ${s.is_live})`);
    });

  } finally {
    await client.end();
  }
}

main().catch(console.error);
