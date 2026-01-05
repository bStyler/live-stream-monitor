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

  const client = new Client({ connectionString });

  try {
    console.log('Connecting to database...\n');
    await client.connect();

    console.log('Applying partitioning migration...\n');
    const sql = readFileSync('./db/migrations/0001_add_partitioning_native.sql', 'utf-8');
    await client.query(sql);

    console.log('✓ Partitioning migration applied successfully\n');

    // Verify setup
    console.log('Verifying partitioning setup...\n');

    const partitions = await client.query(`
      SELECT c.relname as partition_name
      FROM pg_inherits
      JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
      JOIN pg_class c ON pg_inherits.inhrelid = c.oid
      JOIN pg_namespace nmsp_parent ON nmsp_parent.oid = parent.relnamespace
      WHERE parent.relname = 'stream_metrics'
        AND nmsp_parent.nspname = 'public'
      ORDER BY c.relname
    `);

    console.log(`Partitions created (${partitions.rows.length} total):`);
    partitions.rows.forEach(p => {
      console.log(`  - ${p.partition_name}`);
    });

    const functions = await client.query(`
      SELECT routine_name
      FROM information_schema.routines
      WHERE routine_schema = 'public'
        AND routine_name LIKE '%stream_metrics%'
      ORDER BY routine_name
    `);

    console.log(`\nHelper functions created (${functions.rows.length} total):`);
    functions.rows.forEach(f => {
      console.log(`  - ${f.routine_name}()`);
    });

    console.log('\n✅ DB-002 Partitioning setup complete!\n');
    console.log('Partition Management:');
    console.log('  • Create partition: SELECT create_stream_metrics_partition(\'2025-12-31\')');
    console.log('  • Drop old partitions: SELECT * FROM drop_old_stream_metrics_partitions(30)');
    console.log('  • View partitions: SELECT * FROM partition_info\n');

  } finally {
    await client.end();
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('Partitioning setup failed:', err);
  process.exit(1);
});
