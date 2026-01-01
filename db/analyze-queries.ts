import { config } from 'dotenv';
import { Client } from 'pg';

config({ path: '.env.local' });

async function main() {
  const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL not set');

  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('📊 Database Query Optimization Analysis\n');
    console.log('=' .repeat(70) + '\n');

    // 1. List all indexes
    console.log('1️⃣  CURRENT INDEXES:\n');
    const indexes = await client.query(`
      SELECT
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname
    `);

    let currentTable = '';
    indexes.rows.forEach(idx => {
      if (idx.tablename !== currentTable) {
        currentTable = idx.tablename;
        console.log(`\n   📋 ${currentTable}:`);
      }
      console.log(`      ✓ ${idx.indexname}`);
    });

    // 2. Check for missing indexes based on foreign keys
    console.log('\n\n2️⃣  FOREIGN KEY INDEX COVERAGE:\n');
    const fkIndexes = await client.query(`
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        CASE WHEN i.indexname IS NOT NULL THEN '✓ Indexed' ELSE '⚠️  NOT INDEXED' END as index_status
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      LEFT JOIN pg_indexes i
        ON i.tablename = tc.table_name
        AND i.indexdef LIKE '%' || kcu.column_name || '%'
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name, kcu.column_name
    `);

    fkIndexes.rows.forEach(fk => {
      console.log(`   ${fk.index_status} ${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
    });

    // 3. Analyze table statistics
    console.log('\n\n3️⃣  TABLE STATISTICS:\n');
    const stats = await client.query(`
      SELECT
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
        pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) -
                       pg_relation_size(schemaname||'.'||tablename)) AS index_size
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename NOT LIKE 'stream_metrics_%'
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
    `);

    stats.rows.forEach(s => {
      console.log(`   📊 ${s.tablename}:`);
      console.log(`      Total: ${s.total_size} | Table: ${s.table_size} | Indexes: ${s.index_size}`);
    });

    // 4. Test common query patterns
    console.log('\n\n4️⃣  QUERY PERFORMANCE TESTS:\n');

    // Test 1: Find all live streams
    console.log('   Test 1: Find all live streams');
    const start1 = Date.now();
    await client.query('EXPLAIN ANALYZE SELECT * FROM streams WHERE is_live = true');
    const time1 = Date.now() - start1;
    console.log(`      ✓ Execution time: ${time1}ms`);

    // Test 2: Get streams by channel
    console.log('\n   Test 2: Get streams by channel_id');
    const start2 = Date.now();
    await client.query(`EXPLAIN ANALYZE SELECT * FROM streams WHERE channel_id = 'test_channel_id'`);
    const time2 = Date.now() - start2;
    console.log(`      ✓ Execution time: ${time2}ms`);

    // Test 3: Get user's monitored streams
    console.log('\n   Test 3: Get user streams with details (JOIN)');
    const start3 = Date.now();
    await client.query(`
      EXPLAIN ANALYZE
      SELECT s.*, us.alert_on_live, us.alert_on_scheduled
      FROM streams s
      JOIN user_streams us ON s.id = us.stream_id
      WHERE us.user_id = 'test_user_id'
        AND us.deleted_at IS NULL
    `);
    const time3 = Date.now() - start3;
    console.log(`      ✓ Execution time: ${time3}ms`);

    // Test 4: Get recent metrics for a stream
    console.log('\n   Test 4: Get recent metrics (time-series query)');
    const start4 = Date.now();
    await client.query(`
      EXPLAIN ANALYZE
      SELECT *
      FROM stream_metrics
      WHERE stream_id = '00000000-0000-0000-0000-000000000000'
        AND recorded_at >= NOW() - INTERVAL '1 hour'
      ORDER BY recorded_at DESC
      LIMIT 60
    `);
    const time4 = Date.now() - start4;
    console.log(`      ✓ Execution time: ${time4}ms`);

    // Test 5: Get unsent alerts
    console.log('\n   Test 5: Get unsent stream change alerts');
    const start5 = Date.now();
    await client.query(`
      EXPLAIN ANALYZE
      SELECT sc.*, s.title, s.channel_title
      FROM stream_changes sc
      JOIN streams s ON sc.stream_id = s.id
      WHERE sc.alerts_sent = false
      ORDER BY sc.detected_at ASC
      LIMIT 100
    `);
    const time5 = Date.now() - start5;
    console.log(`      ✓ Execution time: ${time5}ms`);

    // 5. Check for unused indexes
    console.log('\n\n5️⃣  INDEX USAGE STATISTICS:\n');
    const indexUsage = await client.query(`
      SELECT
        schemaname,
        tablename,
        indexname,
        idx_scan as scans,
        idx_tup_read as tuples_read,
        idx_tup_fetch as tuples_fetched
      FROM pg_stat_user_indexes
      WHERE schemaname = 'public'
      ORDER BY idx_scan ASC, tablename, indexname
    `);

    if (indexUsage.rows.length > 0) {
      indexUsage.rows.forEach(idx => {
        const status = idx.scans === 0 ? '⚠️  Never used' : `✓ Used ${idx.scans} times`;
        console.log(`   ${status}: ${idx.tablename}.${idx.indexname}`);
      });
    } else {
      console.log('   ℹ️  No usage statistics available yet (database is new)');
    }

    // 6. Recommendations
    console.log('\n\n6️⃣  OPTIMIZATION RECOMMENDATIONS:\n');

    const missingIndexes = fkIndexes.rows.filter(fk => fk.index_status.includes('NOT INDEXED'));

    if (missingIndexes.length > 0) {
      console.log('   ⚠️  Missing Indexes on Foreign Keys:');
      missingIndexes.forEach(fk => {
        console.log(`      - Add index on ${fk.table_name}.${fk.column_name}`);
      });
    } else {
      console.log('   ✅ All foreign keys are properly indexed');
    }

    // Check for common query pattern indexes
    console.log('\n   📌 Recommended Additional Indexes:');

    const recommendedIndexes = [
      {
        table: 'user_streams',
        columns: ['user_id', 'deleted_at'],
        reason: 'Frequently filtering active user streams'
      },
      {
        table: 'stream_changes',
        columns: ['alerts_sent', 'detected_at'],
        reason: 'Querying unsent alerts by time'
      },
      {
        table: 'streams',
        columns: ['is_live', 'deleted_at'],
        reason: 'Finding active live streams'
      }
    ];

    for (const rec of recommendedIndexes) {
      // Check if index exists
      const indexExists = await client.query(`
        SELECT 1
        FROM pg_indexes
        WHERE tablename = $1
          AND indexdef LIKE '%' || $2 || '%'
          AND indexdef LIKE '%' || $3 || '%'
      `, [rec.table, rec.columns[0], rec.columns[1] || rec.columns[0]]);

      if (indexExists.rows.length === 0) {
        console.log(`      ⚠️  Missing: ${rec.table}(${rec.columns.join(', ')}) - ${rec.reason}`);
      } else {
        console.log(`      ✓ Exists: ${rec.table}(${rec.columns.join(', ')})`);
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ Analysis complete!\n');

  } finally {
    await client.end();
  }

  process.exit(0);
}

main().catch(err => {
  console.error('Analysis failed:', err);
  process.exit(1);
});
