import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { Client } from 'pg';

config({ path: '.env.local' });

async function main() {
  const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL not set');

  const client = new Client({ connectionString });

  try {
    console.log('Applying query optimizations...\n');
    await client.connect();

    const sql = readFileSync('./db/migrations/0002_optimize_indexes.sql', 'utf-8');
    await client.query(sql);

    console.log('✓ Optimization indexes created successfully\n');

    // Verify new indexes
    console.log('Verifying new indexes:\n');
    const indexes = await client.query(`
      SELECT
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname LIKE '%_deleted_at%'
         OR indexname LIKE '%covering%'
      ORDER BY tablename, indexname
    `);

    indexes.rows.forEach(idx => {
      console.log(`  ✓ ${idx.tablename}.${idx.indexname}`);
    });

    console.log('\n✅ DB-003 Query Optimization Complete!\n');
    console.log('Optimizations Applied:');
    console.log('  • Partial index for active user streams (user_id + deleted_at)');
    console.log('  • Partial index for unsent alerts (alerts_sent + detected_at)');
    console.log('  • Partial index for live streams (is_live + deleted_at)');
    console.log('  • Partial index for scheduled streams (scheduled_start_time + deleted_at)');
    console.log('  • Covering index for user stream listings\n');

    console.log('Benefits:');
    console.log('  ✓ Faster queries with deleted_at filters (WHERE deleted_at IS NULL)');
    console.log('  ✓ Optimized alert queue processing');
    console.log('  ✓ Reduced index storage (partial indexes only index relevant rows)');
    console.log('  ✓ Covering indexes avoid table lookups for common queries\n');

  } finally {
    await client.end();
  }

  process.exit(0);
}

main().catch(err => {
  console.error('Optimization failed:', err);
  process.exit(1);
});
