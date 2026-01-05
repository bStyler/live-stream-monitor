import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';

// Load environment variables from .env.local
config({ path: '.env.local' });

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set in environment variables');
  }

  const sql = neon(process.env.DATABASE_URL);

  console.log('Setting up database partitioning...\n');

  // Step 1: Check if pg_partman is available
  console.log('1. Checking for pg_partman extension...');
  const availableExtensions = await sql`
    SELECT name, default_version, installed_version
    FROM pg_available_extensions
    WHERE name = 'pg_partman'
  `;

  if (availableExtensions.length === 0) {
    console.log('⚠️  pg_partman is not available on this PostgreSQL instance.');
    console.log('   Neon may not support pg_partman yet.');
    console.log('   Checking for alternative solutions...\n');

    // Check PostgreSQL version
    const version = await sql`SELECT version()`;
    console.log('PostgreSQL version:', version[0].version);

    console.log('\n📝 Note: We can implement native PostgreSQL partitioning without pg_partman.');
    console.log('   This requires manual partition management via cron jobs.');

    process.exit(1);
  }

  console.log('✓ pg_partman is available:', availableExtensions[0]);

  // Step 2: Install pg_partman extension
  console.log('\n2. Installing pg_partman extension...');
  try {
    await sql`CREATE EXTENSION IF NOT EXISTS pg_partman SCHEMA public CASCADE`;
    console.log('✓ pg_partman extension installed');
  } catch (err) {
    console.error('Failed to install pg_partman:', err);
    throw err;
  }

  // Step 3: Verify installation
  console.log('\n3. Verifying pg_partman installation...');
  const installed = await sql`
    SELECT extname, extversion
    FROM pg_extension
    WHERE extname = 'pg_partman'
  `;

  if (installed.length > 0) {
    console.log('✓ pg_partman version:', installed[0].extversion);
  } else {
    throw new Error('pg_partman installation verification failed');
  }

  console.log('\n✅ Partitioning setup ready!');
  process.exit(0);
}

main().catch((err) => {
  console.error('Setup failed:', err);
  process.exit(1);
});
