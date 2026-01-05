import { config } from 'dotenv';
import { Client } from 'pg';

config({ path: '.env.local' });

async function main() {
  const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL not set');

  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('Checking for Better Auth tables...\n');

    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND (table_name LIKE '%user%' OR table_name LIKE '%session%' OR table_name LIKE '%account%')
      ORDER BY table_name
    `);

    console.log(`Found ${tables.rows.length} auth-related tables:`);
    tables.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

    if (tables.rows.length === 0) {
      console.log('\n⚠️  No Better Auth tables found!');
      console.log('Better Auth should auto-create tables on first request.');
      console.log('There may be a configuration issue.');
    }

  } finally {
    await client.end();
  }

  process.exit(0);
}

main().catch(err => {
  console.error('Check failed:', err);
  process.exit(1);
});
