import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';

// Load environment variables from .env.local
config({ path: '.env.local' });

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set in environment variables');
  }

  const sql = neon(process.env.DATABASE_URL);

  console.log('Verifying database schema...\n');

  // Get all tables
  const tables = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `;

  console.log('Tables created:');
  tables.forEach((row) => {
    console.log(`  ✓ ${row.table_name}`);
  });

  // Get column counts for each table
  console.log('\nTable structures:');
  for (const table of tables) {
    const columns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = ${table.table_name}
      ORDER BY ordinal_position
    `;
    console.log(`\n  ${table.table_name} (${columns.length} columns):`);
    columns.forEach((col) => {
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      console.log(`    - ${col.column_name}: ${col.data_type} ${nullable}`);
    });
  }

  // Get indexes
  console.log('\nIndexes created:');
  const indexes = await sql`
    SELECT
      tablename,
      indexname,
      indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
    ORDER BY tablename, indexname
  `;

  let currentTable = '';
  indexes.forEach((idx) => {
    if (idx.tablename !== currentTable) {
      currentTable = idx.tablename;
      console.log(`\n  ${currentTable}:`);
    }
    console.log(`    - ${idx.indexname}`);
  });

  // Get foreign keys
  console.log('\nForeign keys:');
  const fks = await sql`
    SELECT
      tc.table_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
  `;

  fks.forEach((fk) => {
    console.log(`  ✓ ${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
  });

  console.log('\n✅ Database schema verification complete!');
  process.exit(0);
}

main().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
