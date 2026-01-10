/**
 * Migration script to create activity_logs table
 * Run with: npx tsx scripts/create-activity-logs-table.ts
 */

import { config } from 'dotenv';
import { sql } from '@vercel/postgres';

// Load environment variables
config({ path: '.env.local' });

async function createActivityLogsTable() {
  console.log('Creating activity_logs table...');

  try {
    // Create activity_logs table
    await sql.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type TEXT NOT NULL CHECK (type IN ('user_edit', 'user_delete', 'user_create', 'role_change', 'login', 'signup')),
        admin_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
        admin_name TEXT,
        target_user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
        target_user_name TEXT,
        target_user_email TEXT,
        description TEXT NOT NULL,
        metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    console.log('✅ activity_logs table created');

    // Create indexes
    console.log('Creating indexes...');

    await sql.query(`
      CREATE INDEX IF NOT EXISTS activity_logs_type_idx ON activity_logs(type);
    `);

    await sql.query(`
      CREATE INDEX IF NOT EXISTS activity_logs_admin_id_idx ON activity_logs(admin_id);
    `);

    await sql.query(`
      CREATE INDEX IF NOT EXISTS activity_logs_target_user_id_idx ON activity_logs(target_user_id);
    `);

    await sql.query(`
      CREATE INDEX IF NOT EXISTS activity_logs_created_at_idx ON activity_logs(created_at);
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

createActivityLogsTable();
