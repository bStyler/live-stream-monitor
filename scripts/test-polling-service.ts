/**
 * Test script for YouTube polling service
 * Manually triggers the polling logic to verify it works
 */

import { config } from 'dotenv';
import { pollYouTubeMetrics } from '../lib/youtube-poller';
import { getQuotaUsage } from '../lib/youtube-client';

config({ path: '.env.local' });

async function main() {
  console.log('🧪 Testing YouTube Polling Service\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Run the polling service
    const result = await pollYouTubeMetrics();

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Poll Results:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Success: ${result.success}`);
    console.log(`📺 Streams polled: ${result.polled}`);
    console.log(`📈 Metrics inserted: ${result.metricsInserted}`);
    console.log(`🔔 Changes detected: ${result.changesDetected}`);

    // Show quota usage
    const quota = getQuotaUsage();
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 API Quota Usage:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Used: ${quota.used} / ${quota.limit} units (${quota.percentUsed}%)`);
    console.log(`Remaining: ${quota.remaining} units`);

    console.log('\n✅ Test completed successfully!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
