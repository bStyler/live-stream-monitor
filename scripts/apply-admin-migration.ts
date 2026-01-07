/**
 * Apply Phase 3 admin system migration
 * Run with: npx tsx scripts/apply-admin-migration.ts
 */

import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import { sql } from '@vercel/postgres';
import fs from 'fs';
import path from 'path';

// Load environment variables
config({ path: '.env.local' });

async function applyMigration() {
  console.log('🔧 Applying Phase 3 admin system migration...\n');

  const db = drizzle(sql);

  // Read the migration file
  const migrationPath = path.join(
    process.cwd(),
    'db',
    'migrations',
    '0003_productive_vision.sql'
  );

  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

  console.log('📄 Migration SQL:');
  console.log('---');
  console.log(migrationSQL);
  console.log('---\n');

  try {
    // Split by statement-breakpoint and execute each statement
    const statements = migrationSQL
      .split('--> statement-breakpoint')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    console.log(`📊 Found ${statements.length} SQL statements to execute\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);

      // Use sql client directly with template literal
      await sql.query(statement);

      console.log(`✅ Statement ${i + 1} completed\n`);
    }

    console.log('✅ Migration completed successfully!');
    console.log('\n📋 Summary:');
    console.log('  - Added role, stream_quota, is_active, last_login_at to user table');
    console.log('  - Created invitations table');
    console.log('  - Created impersonation_logs table');
    console.log('  - Created all necessary indexes');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

applyMigration()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
