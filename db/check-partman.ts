import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';

// Load environment variables from .env.local
config({ path: '.env.local' });

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set in environment variables');
  }

  const sql = neon(process.env.DATABASE_URL);

  console.log('Checking pg_partman status...\n');

  // Check if extension is installed
  console.log('1. Checking extension:');
  const ext = await sql`
    SELECT extname, extversion, nspname as schema
    FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE extname = 'pg_partman'
  `;
  console.log('   Extension:', ext);

  // Check available functions
  console.log('\n2. Checking pg_partman functions:');
  const funcs = await sql`
    SELECT n.nspname as schema, p.proname as function_name
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname IN ('partman', 'public')
      AND p.proname LIKE '%partman%'
    ORDER BY n.nspname, p.proname
    LIMIT 10
  `;
  console.log('   Functions found:', funcs.length);
  funcs.forEach(f => console.log(`   - ${f.schema}.${f.function_name}`));

  // Check if partman schema exists
  console.log('\n3. Checking schemas:');
  const schemas = await sql`
    SELECT schema_name
    FROM information_schema.schemata
    WHERE schema_name IN ('partman', 'public')
    ORDER BY schema_name
  `;
  console.log('   Schemas:', schemas.map(s => s.schema_name).join(', '));

  // Check stream_metrics table structure
  console.log('\n4. Checking stream_metrics table:');
  const tableInfo = await sql`
    SELECT
      c.relname as table_name,
      c.relkind as kind,
      CASE c.relkind
        WHEN 'r' THEN 'regular table'
        WHEN 'p' THEN 'partitioned table'
        ELSE c.relkind::text
      END as type
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'stream_metrics'
      AND n.nspname = 'public'
  `;
  console.log('   Table info:', tableInfo);

  // Check for any child partitions
  console.log('\n5. Checking partitions:');
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
  console.log('   Child partitions:', partitions.length);
  partitions.forEach(p => console.log(`   - ${p.partition_name}`));

  process.exit(0);
}

main().catch((err) => {
  console.error('Check failed:', err);
  process.exit(1);
});
