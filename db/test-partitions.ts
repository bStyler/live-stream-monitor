import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';

// Load environment variables from .env.local
config({ path: '.env.local' });

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set in environment variables');
  }

  const sql = neon(process.env.DATABASE_URL);

  console.log('Testing partition setup...\n');

  // Check table type
  console.log('1. Checking stream_metrics table type:');
  const tableType = await sql`
    SELECT
      c.relname as table_name,
      CASE c.relkind
        WHEN 'r' THEN 'regular table'
        WHEN 'p' THEN 'partitioned table'
        ELSE c.relkind::text
      END as table_type
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'stream_metrics'
      AND n.nspname = 'public'
  `;
  console.log(tableType);

  // Query partition_info view
  console.log('\n2. Querying partition_info view:');
  try {
    const partitionInfo = await sql`SELECT * FROM partition_info`;
    console.log(`   Found ${partitionInfo.length} partitions:`);
    partitionInfo.forEach(p => {
      console.log(`   - ${p.partition_name}: ${p.size}, ${p.row_count} rows`);
    });
  } catch (err) {
    console.error('   Error querying partition_info:', err);
  }

  // Manually query child partitions
  console.log('\n3. Manually querying child partitions:');
  const partitions = await sql`
    SELECT
      child.relname as partition_name
    FROM pg_inherits
    JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
    JOIN pg_class child ON pg_inherits.inhrelid = child.oid
    JOIN pg_namespace nmsp_parent ON nmsp_parent.oid = parent.relnamespace
    WHERE parent.relname = 'stream_metrics'
      AND nmsp_parent.nspname = 'public'
    ORDER BY child.relname
  `;
  console.log(`   Found ${partitions.length} child partitions:`);
  partitions.forEach(p => {
    console.log(`   - ${p.partition_name}`);
  });

  // Test creating a partition manually
  console.log('\n4. Testing partition creation function:');
  try {
    const result = await sql`SELECT create_stream_metrics_partition('2025-12-31')`;
    console.log('   Result:', result[0]);
  } catch (err) {
    console.error('   Error:', err);
  }

  // Check functions
  console.log('\n5. Checking partition management functions:');
  const funcs = await sql`
    SELECT routine_name
    FROM information_schema.routines
    WHERE routine_schema = 'public'
      AND routine_name LIKE '%stream_metrics%'
    ORDER BY routine_name
  `;
  console.log(`   Found ${funcs.length} functions:`);
  funcs.forEach(f => {
    console.log(`   - ${f.routine_name}()`);
  });

  process.exit(0);
}

main().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
