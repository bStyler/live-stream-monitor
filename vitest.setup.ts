import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock Next.js environment variables for tests
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.YOUTUBE_API_KEY = 'test-youtube-api-key';
process.env.BETTER_AUTH_SECRET = 'test-auth-secret-for-testing-only-12345678';
process.env.CRON_SECRET = 'test-cron-secret';
