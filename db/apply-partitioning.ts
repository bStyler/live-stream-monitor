import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables from .env.local
config({ path: '.env.local' });

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set in environment variables');
  }

  const sql = neon(process.env.DATABASE_URL);

  console.log('Applying partitioning migration...\n');

  // Read the SQL migration file
  const migrationPath = join(__dirname, 'migrations', '0001_add_native_partitioning.sql');
  const migrationSQL = readFileSync(migrationPath, 'utf-8');

  console.log('1. Executing partitioning migration...');

  try {
    // Execute the entire SQL file as one transaction
    // The @neondatabase/serverless driver handles multi-statement SQL
    await sql.unsafe(migrationSQL);
    console.log('✓ Partitioning migration applied successfully');
  } catch (err) {
    console.error('Migration failed:', err);
    throw err;
  }

  // Verify partitioning setup
  console.log('\n2. Verifying partitioning setup...');

  const partitions = await sql`
    SELECT
      schemaname,
      tablename,
      pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
    FROM pg_tables
    WHERE tablename LIKE 'stream_metrics%'
    ORDER BY tablename
  `;

  console.log('\n   Partitions created:');
  partitions.forEach((p) => {
    console.log(`   - ${p.tablename} (${p.size})`);
  });

  // Check partition functions
  const functions = await sql`
    SELECT routine_name, routine_type
    FROM information_schema.routines
    WHERE routine_schema = 'public'
      AND routine_name LIKE '%stream_metrics%'
    ORDER BY routine_name
  `;

  if (functions.length > 0) {
    console.log('\n   Helper functions created:');
    functions.forEach((f) => {
      console.log(`   - ${f.routine_name}() [${f.routine_type}]`);
    });
  }

  // Check partition view
  const views = await sql`
    SELECT table_name
    FROM information_schema.views
    WHERE table_schema = 'public'
      AND table_name = 'partition_info'
  `;

  if (views.length > 0) {
    console.log('\n   Monitoring view created:');
    console.log('   - partition_info (shows all partitions with size and row count)');
  }

  console.log('\n✅ Native partitioning setup complete!');
  console.log('\n📝 Partition management:');
  console.log('   • Create new partition: SELECT create_stream_metrics_partition(\'2025-12-31\')');
  console.log('   • Drop old partitions: SELECT * FROM drop_old_stream_metrics_partitions(30)');
  console.log('   • View partitions: SELECT * FROM partition_info');
  console.log('\n📝 Next steps:');
  console.log('   1. Set up a daily cron job (Vercel Cron) to:');
  console.log('      - Create tomorrow\'s partition');
  console.log('      - Drop partitions older than 30 days');
  console.log('   2. Partitions for today + next 7 days already created');
  console.log('   3. Automatic 30-day retention via drop function');

  process.exit(0);
}

main().catch((err) => {
  console.error('Partitioning setup failed:', err);
  process.exit(1);
});
