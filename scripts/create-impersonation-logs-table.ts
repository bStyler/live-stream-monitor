/**
 * Migration script to create impersonation_logs table
 * Run with: npx tsx scripts/create-impersonation-logs-table.ts
 */

import { config } from 'dotenv';
import { sql } from '@vercel/postgres';

// Load environment variables
config({ path: '.env.local' });

async function createImpersonationLogsTable() {
  console.log('Creating impersonation_logs table...');

  try {
    // Create impersonation_logs table
    await sql.query(`
      CREATE TABLE IF NOT EXISTS impersonation_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        admin_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        target_user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        ended_at TIMESTAMPTZ,
        ip_address TEXT,
        user_agent TEXT
      );
    `);

    console.log('✅ impersonation_logs table created');

    // Create indexes
    console.log('Creating indexes...');

    await sql.query(`
      CREATE INDEX IF NOT EXISTS impersonation_logs_admin_id_idx ON impersonation_logs(admin_id);
    `);

    await sql.query(`
      CREATE INDEX IF NOT EXISTS impersonation_logs_target_user_id_idx ON impersonation_logs(target_user_id);
    `);

    await sql.query(`
      CREATE INDEX IF NOT EXISTS impersonation_logs_started_at_idx ON impersonation_logs(started_at);
    `);

    console.log('✅ Indexes created');
    console.log('✅ Migration complete!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

createImpersonationLogsTable();
