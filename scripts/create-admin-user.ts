/**
 * Create or promote a user to admin role
 * Usage: npx tsx scripts/create-admin-user.ts <email>
 */

import { config } from 'dotenv';
import { sql } from '@vercel/postgres';

// Load environment variables
config({ path: '.env.local' });

async function createAdminUser() {
  const email = process.argv[2];

  if (!email) {
    console.error('❌ Error: Email is required');
    console.log('Usage: npx tsx scripts/create-admin-user.ts <email>');
    process.exit(1);
  }

  console.log(`🔧 Setting up admin user: ${email}\n`);

  try {
    // Check if user exists
    const userResult = await sql.query(
      `SELECT id, name, email, role FROM "user" WHERE email = $1`,
      [email]
    );

    if (userResult.rows.length === 0) {
      console.log('❌ User not found. Please sign up first, then run this script.');
      console.log(`   Sign up at: http://localhost:3000/sign-up`);
      process.exit(1);
    }

    const user = userResult.rows[0];
    console.log(`✅ Found user: ${user.name} (${user.email})`);
    console.log(`   Current role: ${user.role}`);

    if (user.role === 'admin') {
      console.log('\n✅ User is already an admin!');
      process.exit(0);
    }

    // Promote user to admin
    await sql.query(
      `UPDATE "user" SET role = 'admin' WHERE id = $1`,
      [user.id]
    );

    console.log('\n✅ User promoted to admin successfully!');
    console.log(`   Role: user → admin`);
    console.log(`\n📋 Next steps:`);
    console.log(`   1. Sign in at http://localhost:3000/sign-in`);
    console.log(`   2. Access admin dashboard at http://localhost:3000/admin`);

  } catch (error) {
    console.error('❌ Failed to create admin user:', error);
    throw error;
  }

  process.exit(0);
}

createAdminUser().catch((error) => {
  console.error(error);
  process.exit(1);
});
