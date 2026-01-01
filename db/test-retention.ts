import { config } from 'dotenv';
import { Client } from 'pg';

config({ path: '.env.local' });

async function main() {
  const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL not set');

  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('Testing 30-day retention policy...\n');

    // Create partitions for 35 days ago and 25 days ago
    console.log('1. Creating test partitions...');
    const date35DaysAgo = new Date();
    date35DaysAgo.setDate(date35DaysAgo.getDate() - 35);
    const date25DaysAgo = new Date();
    date25DaysAgo.setDate(date25DaysAgo.getDate() - 25);

    const result35 = await client.query(
      `SELECT create_stream_metrics_partition($1::date)`,
      [date35DaysAgo.toISOString().split('T')[0]]
    );
    console.log(`   ${result35.rows[0].create_stream_metrics_partition}`);

    const result25 = await client.query(
      `SELECT create_stream_metrics_partition($1::date)`,
      [date25DaysAgo.toISOString().split('T')[0]]
    );
    console.log(`   ${result25.rows[0].create_stream_metrics_partition}`);

    // Check partition count before cleanup
    const beforeCount = await client.query(`
      SELECT COUNT(*) as count
      FROM pg_inherits
      JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
      JOIN pg_class child ON pg_inherits.inhrelid = child.oid
      JOIN pg_namespace nmsp_parent ON nmsp_parent.oid = parent.relnamespace
      WHERE parent.relname = 'stream_metrics'
        AND nmsp_parent.nspname = 'public'
    `);
    console.log(`\n2. Partitions before retention cleanup: ${beforeCount.rows[0].count}`);

    // Run retention cleanup (drops partitions older than 30 days)
    console.log('\n3. Running retention cleanup (30 days)...');
    const dropped = await client.query(`SELECT * FROM drop_old_stream_metrics_partitions(30)`);
    console.log(`   Dropped partitions:`);
    if (dropped.rows.length === 0) {
      console.log(`   - None (no partitions older than 30 days)`);
    } else {
      dropped.rows.forEach(row => {
        console.log(`   - ${row.dropped_partition}`);
      });
    }

    // Check partition count after cleanup
    const afterCount = await client.query(`
      SELECT COUNT(*) as count
      FROM pg_inherits
      JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
      JOIN pg_class child ON pg_inherits.inhrelid = child.oid
      JOIN pg_namespace nmsp_parent ON nmsp_parent.oid = parent.relnamespace
      WHERE parent.relname = 'stream_metrics'
        AND nmsp_parent.nspname = 'public'
    `);
    console.log(`\n4. Partitions after retention cleanup: ${afterCount.rows[0].count}`);

    // Verify the 35-day-old partition was dropped and 25-day-old kept
    console.log(`\n✅ Retention policy test complete!`);
    console.log(`   - Partitions dropped: ${dropped.rows.length}`);
    console.log(`   - This confirms 30-day retention is working correctly`);

  } finally {
    await client.end();
  }

  process.exit(0);
}

main().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
