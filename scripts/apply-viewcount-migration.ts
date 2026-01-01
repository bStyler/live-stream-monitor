/**
 * Apply viewCount migration to database
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
    console.log('Applying viewCount migration...\n');

    // Add view_count column to stream_metrics table
    await client.query('ALTER TABLE "stream_metrics" ADD COLUMN IF NOT EXISTS "view_count" integer');

    console.log('✅ Migration applied successfully!');
    console.log('   Added view_count column to stream_metrics table\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
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
