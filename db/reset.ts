import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';

// Load environment variables from .env.local
config({ path: '.env.local' });

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set in environment variables');
  }

  const sql = neon(process.env.DATABASE_URL);

  console.log('Dropping existing schema objects...');

  try {
    // Drop everything in the public schema (CASCADE will drop dependent objects)
    await sql`DROP SCHEMA IF EXISTS public CASCADE`;
    await sql`CREATE SCHEMA public`;
    await sql`GRANT ALL ON SCHEMA public TO public`;
    console.log('Schema reset successfully!');
  } catch (err) {
    console.error('Error resetting schema:', err);
    throw err;
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('Reset failed:', err);
  process.exit(1);
});
