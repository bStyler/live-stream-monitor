import { config } from 'dotenv';
import { Client } from 'pg';

config({ path: '.env.local' });

async function main() {
  const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL not set');

  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('Checking for test user account...\n');

    // Check user table
    const users = await client.query(`
      SELECT id, name, email, "emailVerified", "createdAt"
      FROM "user"
      WHERE email = 'test@example.com'
    `);

    if (users.rows.length > 0) {
      console.log('✓ User found in database:');
      console.log(`  ID: ${users.rows[0].id}`);
      console.log(`  Name: ${users.rows[0].name}`);
      console.log(`  Email: ${users.rows[0].email}`);
      console.log(`  Email Verified: ${users.rows[0].emailVerified}`);
      console.log(`  Created At: ${users.rows[0].createdAt}\n`);

      // Check account table
      const accounts = await client.query(`
        SELECT id, "providerId", "accountId"
        FROM account
        WHERE "userId" = $1
      `, [users.rows[0].id]);

      console.log(`✓ Account records: ${accounts.rows.length}`);
      accounts.rows.forEach(acc => {
        console.log(`  Provider: ${acc.providerId}, Account ID: ${acc.accountId}`);
      });

      // Check session table
      const sessions = await client.query(`
        SELECT id, token, "expiresAt"
        FROM session
        WHERE "userId" = $1
      `, [users.rows[0].id]);

      console.log(`\n✓ Active sessions: ${sessions.rows.length}`);
      if (sessions.rows.length > 0) {
        console.log(`  Session expires: ${sessions.rows[0].expiresAt}`);
      }
    } else {
      console.log('✗ No user found with email: test@example.com');
    }

  } finally {
    await client.end();
  }

  process.exit(0);
}

main().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
