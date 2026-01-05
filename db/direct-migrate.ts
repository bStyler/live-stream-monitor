import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { Client } from 'pg';

// Load environment variables
config({ path: '.env.local' });

async function main() {
  const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  // Use pg Client for better multi-statement support
  const client = new Client({ connectionString });

  try {
    console.log('Connecting to database...');
    await client.connect();

    console.log('Reading migration file...');
    const sql = readFileSync('./db/migrations/0000_wakeful_doomsday.sql', 'utf-8');

    console.log('Executing migration...');
    await client.query(sql);

    console.log('✓ Base migration applied successfully');

  } finally {
    await client.end();
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
