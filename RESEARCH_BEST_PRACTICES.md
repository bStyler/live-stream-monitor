# Best Practices Research Report

**Generated**: 2025-01-04
**Topics**: Chart Downsampling, Real-time Data, Testing Strategies for Next.js 15+

---

## Table of Contents

1. [Chart Downsampling - LTTB Algorithm](#1-chart-downsampling---lttb-algorithm)
2. [Real-time Data Updates with TanStack Query](#2-real-time-data-updates-with-tanstack-query)
3. [Testing Next.js 15+ Applications (App Router)](#3-testing-nextjs-15-applications-app-router)
4. [CI/CD Setup for Next.js Projects](#4-cicd-setup-for-nextjs-projects)
5. [Integration Testing for API Routes](#5-integration-testing-for-api-routes)
6. [Component Testing for React 19](#6-component-testing-for-react-19)
7. [E2E Testing for Full-Stack Applications](#7-e2e-testing-for-full-stack-applications)

---

## 1. Chart Downsampling - LTTB Algorithm

### Overview

**LTTB (Largest-Triangle-Three-Buckets)** is a downsampling algorithm specifically designed for time-series data visualization. It preserves the visual characteristics and sharp inflections of the original data while dramatically reducing the dataset size.

**Source Authority**: High - Algorithm created by Sveinn Steinarsson (University of Iceland) in 2013, widely adopted in production systems.

### Why LTTB Over Simple Averaging

Simple averaging distorts data visualization. When downsampling 5,000 points to 100 using averaging, the resulting graph can show a y-axis range of only ±1.5 instead of the actual ±10, obscuring the signal's true behavior.

LTTB preserves signal characteristics rather than distorting them, making it superior for:
- Anomaly detection
- Financial charting (price volatility patterns)
- Sensor monitoring
- Real-time analytics dashboards

**Real-world impact**: A week of 5-second interval data = 120,960 data points. With LTTB, you can reduce this to 800 points for an 800px wide chart, saving network bandwidth and CPU cycles.

### TypeScript Implementations

#### Option 1: @seanvelasco/lttb (Recommended for TypeScript)

**Installation**:
```bash
npm install @seanvelasco/lttb
```

**Usage**:
```typescript
import LTTB from '@seanvelasco/lttb'

const threshold = 300
const untreatedData = [/* your time series data */]

// Accepts number[] or typed arrays (Uint8Array, Uint16Array, etc)
const downsampledData = LTTB(untreatedData, threshold)
```

**Pros**:
- 100% TypeScript
- Modern ESM module
- Supports typed arrays for performance
- Simple API

**Package Details**:
- Repository: https://github.com/seanvelasco/lttb
- Language: TypeScript (100%)
- License: Open source

#### Option 2: downsample-lttb (Alternative)

**Installation**:
```bash
npm install downsample-lttb
```

**Usage**:
```javascript
const downsampler = require("downsample-lttb");
const dataSeries = [[1,2],[2,2],[3,3],[4,3],[5,6],[6,3],[7,3],[8,5],[9,4],[10,4],[11,1],[12,2]];
const downsampled = downsampler.processData(dataSeries, 3);
// Output: [ [ 1, 2 ], [ 5, 6 ], [ 12, 2 ] ]
```

**Pros**:
- Works with [x, y] coordinate pairs
- Simple API
- MIT License

**Repository**: https://github.com/pingec/downsample-lttb

#### Option 3: downsample (Collection Package)

**Installation**:
```bash
npm install downsample
```

**Features**:
- Multiple downsampling algorithms (LTTB, ASAP, Min/Max, Mode-Median)
- TypeScript support
- Benchmarked performance
- Based on Sveinn Steinarsson's 2013 paper

**Repository**: https://github.com/janjakubnanista/downsample

### Use Cases for Live Stream Monitor Project

1. **Viewer Count Charts**: Downsample historical viewer data for weekly/monthly views
2. **Real-time Monitoring**: Reduce streaming data points for responsive UI
3. **Network Optimization**: Minimize API payload sizes
4. **Storage Efficiency**: Compress historical metrics while preserving anomalies

### Implementation Recommendation

**For this project**: Use `@seanvelasco/lttb`
- Native TypeScript support matches project stack
- Simple API for straightforward integration
- Handles both arrays and typed arrays
- Minimal dependencies

**Sources**:
- [LTTB GitHub Repository](https://github.com/seanvelasco/lttb)
- [downsample-lttb npm](https://github.com/pingec/downsample-lttb)
- [Advanced Downsampling with LTTB - DEV Community](https://dev.to/crate/advanced-downsampling-with-the-lttb-algorithm-3okh)
- [Optimizing Line Chart Performance - DEV](https://dev.to/said96dev/optimizing-line-chart-performance-with-lttb-algorithm-21dj)
- [Enhancing Telemetry with LTTB - Sift](https://www.siftstack.com/mission-critical/lttb-downsampling)

---

## 2. Real-time Data Updates with TanStack Query

### Overview

TanStack Query (formerly React Query) provides powerful primitives for managing server state, including real-time polling with `refetchInterval`.

**Source Authority**: High - Official TanStack Query documentation (v5)

### Core Concepts

#### Basic Polling with refetchInterval

```typescript
const { data } = useQuery({
  queryKey: ['stream-status'],
  queryFn: fetchStreamStatus,
  refetchInterval: 5000, // Poll every 5 seconds
  refetchIntervalInBackground: true // Continue polling when tab inactive
})
```

#### Dynamic Interval with Function

```typescript
const queryOptions = {
  refetchInterval: (query) => {
    // Access data via query.state.data (not transformed by select)
    return query.state.data ? 5000 : false;
  },
  refetchIntervalInBackground: true
};
```

**Note**: In TanStack Query v5, the callback signature changed to only receive `query` object. Access data via `query.state.data`.

### Advanced Patterns

#### Adaptive Polling Based on Error State

```typescript
const result = useQuery({
  queryKey: ['todos'],
  queryFn: fetchTodos,
  refetchInterval: (query) => {
    // Refetch more frequently when in error state
    return query.state.status === 'error' ? 5000 : 30000
  },
  refetchIntervalInBackground: true,
  retry: false, // Disable built-in retries for custom control
})
```

**Use case**: Poll more aggressively when errors occur, less frequently during normal operation.

#### Conditional Polling Based on Data State

```typescript
useQuery({
  queryKey: ['stream', streamId],
  queryFn: () => fetchStream(streamId),
  refetchInterval: (query) => {
    const stream = query.state.data;
    // Only poll if stream is live
    if (stream?.status === 'live') return 3000;
    return false; // Stop polling if not live
  },
  refetchIntervalInBackground: false, // Stop when tab inactive
})
```

### Best Practices for Live Stream Monitor

#### 1. Must Have - Adaptive Polling

**Priority**: P0

Poll more frequently for active streams, less frequently for inactive ones:

```typescript
useQuery({
  queryKey: ['stream-stats', streamId],
  queryFn: () => fetchStreamStats(streamId),
  refetchInterval: (query) => {
    const data = query.state.data;
    if (!data) return false;

    // Live stream: poll every 3 seconds
    if (data.isLive) return 3000;

    // Scheduled but not live: poll every 30 seconds
    if (data.scheduledStartTime) return 30000;

    // Offline: don't poll
    return false;
  },
  refetchIntervalInBackground: true,
})
```

#### 2. Should Have - Error Recovery

**Priority**: P1

Implement exponential backoff for failed requests:

```typescript
useQuery({
  queryKey: ['stream-data'],
  queryFn: fetchStreamData,
  refetchInterval: (query) => {
    if (query.state.status === 'error') {
      const failureCount = query.state.failureCount || 0;
      // Exponential backoff: 5s, 10s, 20s, max 60s
      return Math.min(5000 * Math.pow(2, failureCount), 60000);
    }
    return 10000; // Normal polling
  },
  retry: 3,
})
```

#### 3. Nice to Have - Coordinated Polling

**Priority**: P2

For multiple streams, stagger polling to avoid request spikes:

```typescript
const streamIds = ['stream1', 'stream2', 'stream3'];

streamIds.forEach((id, index) => {
  useQuery({
    queryKey: ['stream', id],
    queryFn: () => fetchStream(id),
    refetchInterval: 10000,
    // Stagger initial fetch by index * 500ms
    initialDataUpdatedAt: Date.now() - (index * 500),
  })
})
```

### Important Defaults to Remember

1. `refetchInterval` operates independently of `staleTime`
2. Interval continues even if data is considered "fresh"
3. Use `refetchIntervalInBackground: true` carefully (battery/performance impact)
4. Callback receives `query.state.data` (untransformed by `select`)

### Integration with Next.js App Router

```typescript
// app/providers.tsx
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode, useState } from 'react'

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5000,
        refetchOnWindowFocus: true,
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
```

```typescript
// app/layout.tsx
import { Providers } from './providers'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

**Sources**:
- [TanStack Query Official Docs](https://github.com/context7/tanstack_query)
- [Configure Refetch Interval](https://github.com/context7/tanstack_query/blob/main/framework/solid/reference/useQuery.md)
- [Migrating to v5](https://github.com/context7/tanstack_query/blob/main/framework/react/guides/migrating-to-v5.md)
- [Custom Background Refetch Strategy](https://github.com/context7/tanstack_query/blob/main/framework/react/guides/query-retries.md)

---

## 3. Testing Next.js 15+ Applications (App Router)

### Overview

Next.js 15 with App Router introduces React Server Components (RSC), which require a hybrid testing approach combining unit tests (Vitest), component tests (React Testing Library), and E2E tests (Playwright).

**Source Authority**: High - Official Next.js documentation and community best practices (2025)

### Testing Strategy Matrix

| Test Type | Tool | Purpose | Async RSC Support |
|-----------|------|---------|-------------------|
| Unit Tests | Vitest | Synchronous Server/Client Components | No |
| Component Tests | React Testing Library + Vitest | Client Components, User Interactions | No |
| E2E Tests | Playwright | Full application flows, Async RSC | Yes |

### Recommended Approach (Official Next.js)

**Use Vitest for**:
- Synchronous Server Components
- Client Components
- Utility functions
- Business logic

**Use Playwright for**:
- Async Server Components
- Full page flows
- Dynamic routing
- Server Actions

**Rationale**: Vitest currently does not support async Server Components. E2E tests are recommended for these cases.

### Vitest Setup

#### Installation

```bash
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom @testing-library/user-event @testing-library/jest-dom
```

#### Configuration - vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
    },
  },
})
```

#### Setup File - vitest.setup.ts

```typescript
import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})
```

#### Package.json Script

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

### Quick Start Alternative

Use the official Next.js example:

```bash
npx create-next-app@latest --example with-vitest my-app
```

### Playwright Setup

#### Installation

```bash
npm init playwright@latest
```

The installer prompts you to add a GitHub Actions workflow automatically.

#### Configuration - playwright.config.ts

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },

  // Automatically start Next.js dev server
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
})
```

#### Example E2E Test

```typescript
// e2e/dashboard.spec.ts
import { test, expect } from '@playwright/test'

test('should navigate to stream details', async ({ page }) => {
  await page.goto('/')

  await page.click('text=View Stream')

  await expect(page).toHaveURL(/\/streams\/.*/)
  await expect(page.locator('h1')).toContainText('Stream Details')
})
```

### Quick Start Alternative

```bash
npx create-next-app@latest --example with-playwright my-app
```

### Best Practices for Next.js 15 Testing

#### 1. Must Have - Separate Test Types

**Priority**: P0

- Unit tests in `__tests__` directories alongside components
- E2E tests in dedicated `e2e/` directory
- Integration tests in `tests/integration/`

```
app/
  dashboard/
    __tests__/
      page.test.tsx
    page.tsx
e2e/
  dashboard.spec.ts
tests/
  integration/
    api-routes.test.ts
```

#### 2. Must Have - Test Server Components Correctly

**Priority**: P0

For async Server Components, use Playwright:

```typescript
// e2e/server-component.spec.ts
test('async server component renders data', async ({ page }) => {
  await page.goto('/dashboard')

  // Wait for async data to load
  await expect(page.locator('[data-testid="stream-list"]')).toBeVisible()

  // Verify data rendered
  const streamCount = await page.locator('[data-testid="stream-card"]').count()
  expect(streamCount).toBeGreaterThan(0)
})
```

For synchronous Server Components, use Vitest:

```typescript
// app/components/__tests__/Header.test.tsx
import { render, screen } from '@testing-library/react'
import Header from '../Header'

test('renders header with title', () => {
  render(<Header title="Dashboard" />)
  expect(screen.getByText('Dashboard')).toBeInTheDocument()
})
```

#### 3. Should Have - Test Data Loading States

**Priority**: P1

```typescript
// app/components/__tests__/StreamCard.test.tsx
import { render, screen } from '@testing-library/react'
import StreamCard from '../StreamCard'

test('shows loading skeleton', () => {
  render(<StreamCard loading={true} />)
  expect(screen.getByTestId('skeleton')).toBeInTheDocument()
})

test('shows error state', () => {
  render(<StreamCard error="Failed to load" />)
  expect(screen.getByText(/failed to load/i)).toBeInTheDocument()
})
```

#### 4. Should Have - Test Dynamic Routes

**Priority**: P1

Use Playwright to test App Router dynamic routing:

```typescript
test('dynamic route renders correct stream', async ({ page }) => {
  await page.goto('/streams/abc123')

  await expect(page.locator('h1')).toContainText('Stream abc123')

  // Test navigation
  await page.click('[data-testid="back-button"]')
  await expect(page).toHaveURL('/dashboard')
})
```

#### 5. Nice to Have - Visual Regression Testing

**Priority**: P2

Add screenshot comparison with Playwright:

```typescript
test('dashboard visual regression', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page).toHaveScreenshot('dashboard.png')
})
```

### Testing Server Actions

```typescript
// app/actions/__tests__/addStream.test.ts
import { addStream } from '../addStream'

test('addStream creates new stream', async () => {
  const result = await addStream({ url: 'https://youtube.com/watch?v=test' })

  expect(result.success).toBe(true)
  expect(result.streamId).toBeDefined()
})
```

**Sources**:
- [Next.js Testing Guide - Vitest](https://nextjs.org/docs/app/guides/testing/vitest)
- [Next.js Testing Guide - Playwright](https://nextjs.org/docs/pages/guides/testing/playwright)
- [Next.js Testing Overview](https://nextjs.org/docs/pages/building-your-application/testing)
- [Test Strategy in App Router Era](https://shinagawa-web.com/en/blogs/nextjs-app-router-testing-setup)
- [Strapi Next.js Testing Guide](https://strapi.io/blog/nextjs-testing-guide-unit-and-e2e-tests-with-vitest-and-playwright)
- [How to Set Up Next.js 15 for Production](https://janhesters.com/blog/how-to-set-up-nextjs-15-for-production-in-2025)

---

## 4. CI/CD Setup for Next.js Projects

### Overview

Modern Next.js CI/CD leverages GitHub Actions with Vercel for automated testing and deployment. Best practices emphasize automation, environment management, and comprehensive testing before production deployment.

**Source Authority**: High - Official Vercel and GitHub documentation (2025)

### Recommended Architecture

**Deployment Flow**:
1. Push to feature branch → Preview Deployment (Vercel)
2. Pull Request → Run CI tests (GitHub Actions)
3. Merge to main → Production Deployment (Vercel)

### GitHub Actions Workflow

#### Full CI/CD Workflow - .github/workflows/ci.yml

```yaml
name: CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

env:
  NODE_VERSION: '20'

jobs:
  lint-and-test:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run type check
        run: npx tsc --noEmit

      - name: Run unit tests
        run: npm run test

      - name: Run build
        run: npm run build
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          NEXT_PUBLIC_API_URL: ${{ secrets.NEXT_PUBLIC_API_URL }}

  e2e-tests:
    runs-on: ubuntu-latest
    needs: lint-and-test

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install chromium --with-deps

      - name: Build Next.js app
        run: npm run build
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL_TEST }}

      - name: Run Playwright tests
        run: npx playwright test
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL_TEST }}
          YOUTUBE_API_KEY: ${{ secrets.YOUTUBE_API_KEY_TEST }}

      - name: Upload test results
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30

  deploy-preview:
    runs-on: ubuntu-latest
    needs: [lint-and-test, e2e-tests]
    if: github.event_name == 'pull_request'

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Install Vercel CLI
        run: npm install --global vercel@latest

      - name: Pull Vercel Environment
        run: vercel pull --yes --environment=preview --token=${{ secrets.VERCEL_TOKEN }}

      - name: Build Project
        run: vercel build --token=${{ secrets.VERCEL_TOKEN }}

      - name: Deploy to Preview
        run: vercel deploy --prebuilt --token=${{ secrets.VERCEL_TOKEN }}

  deploy-production:
    runs-on: ubuntu-latest
    needs: [lint-and-test, e2e-tests]
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Install Vercel CLI
        run: npm install --global vercel@latest

      - name: Pull Vercel Environment
        run: vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}

      - name: Build Project
        run: vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}

      - name: Deploy to Production
        run: vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}
```

### Required GitHub Secrets

Configure in repository Settings → Secrets and variables → Actions:

```bash
VERCEL_TOKEN           # From Vercel account settings
VERCEL_ORG_ID         # From .vercel/project.json
VERCEL_PROJECT_ID     # From .vercel/project.json
DATABASE_URL          # Production database
DATABASE_URL_TEST     # Test database
YOUTUBE_API_KEY       # Production API key
YOUTUBE_API_KEY_TEST  # Test API key (with quota limits)
```

### Getting Vercel Credentials

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Link project
vercel link

# After linking, find IDs in .vercel/project.json
cat .vercel/project.json
```

### Best Practices

#### 1. Must Have - Separate Test Environment

**Priority**: P0

Use dedicated test database and API keys to avoid affecting production data during CI runs.

```yaml
env:
  DATABASE_URL: ${{ secrets.DATABASE_URL_TEST }}
  YOUTUBE_API_KEY: ${{ secrets.YOUTUBE_API_KEY_TEST }}
```

#### 2. Must Have - Cache Dependencies

**Priority**: P0

Speed up workflow runs with npm caching:

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'npm'  # Automatic caching
```

For custom caching:

```yaml
- name: Cache Next.js build
  uses: actions/cache@v4
  with:
    path: |
      ${{ github.workspace }}/.next/cache
    key: ${{ runner.os }}-nextjs-${{ hashFiles('**/package-lock.json') }}-${{ hashFiles('**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx') }}
    restore-keys: |
      ${{ runner.os }}-nextjs-${{ hashFiles('**/package-lock.json') }}-
```

#### 3. Must Have - Parallel Job Execution

**Priority**: P0

Run independent jobs concurrently:

```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
    steps: [...]

  unit-test:
    runs-on: ubuntu-latest
    steps: [...]

  # These run in parallel, then e2e waits for both
  e2e:
    needs: [lint, unit-test]
    steps: [...]
```

#### 4. Should Have - Conditional Deployment

**Priority**: P1

Only deploy after tests pass:

```yaml
deploy:
  needs: [lint, test, e2e]  # Wait for all tests
  if: github.ref == 'refs/heads/main'
```

#### 5. Should Have - Failure Artifacts

**Priority**: P1

Upload test artifacts for debugging:

```yaml
- name: Upload Playwright report
  if: failure()
  uses: actions/upload-artifact@v4
  with:
    name: playwright-report
    path: playwright-report/
    retention-days: 30
```

#### 6. Nice to Have - Matrix Testing

**Priority**: P2

Test across multiple Node versions:

```yaml
strategy:
  matrix:
    node-version: [18, 20, 22]

steps:
  - uses: actions/setup-node@v4
    with:
      node-version: ${{ matrix.node-version }}
```

### Vercel Integration Benefits

**Automatic Features**:
- Preview deployments for every branch
- Production deployment on main merge
- Environment variable management
- Automatic HTTPS
- CDN distribution
- Deployment comments on PRs

**GitHub Actions Benefits**:
- Full control over CI pipeline
- Custom test environments
- Build artifacts management
- Advanced caching strategies

### Cost Optimization

**Free Tier Optimization**:
1. Use `npm ci` instead of `npm install` (faster, deterministic)
2. Cache dependencies and build artifacts
3. Limit Playwright to chromium only for CI
4. Run E2E tests only on main branch PRs

```yaml
- name: Install Playwright browsers
  run: npx playwright install chromium  # Only chromium for CI
```

### Monitoring and Notifications

Add Slack/Discord notifications:

```yaml
- name: Notify on failure
  if: failure()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    text: 'CI failed for ${{ github.ref }}'
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

**Sources**:
- [Integrating CI/CD with Next.js and Vercel - Medium](https://utsavdesai26.medium.com/integrating-ci-cd-pipelines-with-next-js-and-vercel-a-complete-guide-380433cff420)
- [Deploying to Vercel with GitHub Actions - ALI DEV](https://www.ali-dev.com/blog/deploying-next-js-to-vercel-with-github-actions-a-quick-guide)
- [Vercel GitHub Actions Guide](https://vercel.com/kb/guide/how-can-i-use-github-actions-with-vercel)
- [Setting Up CI/CD for Next.js - Medium](https://medium.com/@vdsnini/setting-up-ci-cd-for-a-next-js-app-with-github-actions-a7286f3b8f1d)
- [Building CI/CD with Vercel - Zealous](https://www.zealousys.com/blog/building-a-ci-cd-pipeline-with-vercel-and-github-actions/)

---

## 5. Integration Testing for API Routes

### Overview

Next.js API route testing combines unit testing with mocked dependencies and integration testing with real database connections. Modern approaches use Vitest, MSW (Mock Service Worker), and dedicated test databases.

**Source Authority**: High - Community best practices and official testing patterns (2025)

### Testing Tools Comparison

| Tool | Purpose | Use Case |
|------|---------|----------|
| node-mocks-http | Mock req/res objects | Unit testing API routes |
| next-test-api-route-handler | Next.js-aware testing | Precise route emulation |
| MSW (Mock Service Worker) | API mocking | External API calls |
| Supertest | HTTP assertions | Integration testing |

### Unit Testing API Routes

#### Setup with node-mocks-http

**Installation**:
```bash
npm install -D node-mocks-http
```

**Example - Testing POST Route**:

```typescript
// app/api/streams/add/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db/drizzle'
import { streams } from '@/db/schema'

export async function POST(request: NextRequest) {
  const { url, userId } = await request.json()

  if (!url) {
    return NextResponse.json({ error: 'URL required' }, { status: 400 })
  }

  const newStream = await db.insert(streams).values({ url, userId }).returning()

  return NextResponse.json(newStream[0], { status: 201 })
}
```

```typescript
// app/api/streams/add/__tests__/route.test.ts
import { describe, it, expect, vi } from 'vitest'
import { POST } from '../route'
import { NextRequest } from 'next/server'

// Mock database
vi.mock('@/db/drizzle', () => ({
  db: {
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([{
          id: '123',
          url: 'https://youtube.com/watch?v=test'
        }]))
      }))
    }))
  }
}))

describe('POST /api/streams/add', () => {
  it('creates new stream', async () => {
    const request = new NextRequest('http://localhost:3000/api/streams/add', {
      method: 'POST',
      body: JSON.stringify({
        url: 'https://youtube.com/watch?v=test',
        userId: 'user123'
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.id).toBe('123')
  })

  it('returns 400 for missing URL', async () => {
    const request = new NextRequest('http://localhost:3000/api/streams/add', {
      method: 'POST',
      body: JSON.stringify({ userId: 'user123' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('URL required')
  })
})
```

#### Alternative: next-test-api-route-handler

**Installation**:
```bash
npm install -D next-test-api-route-handler
```

**Usage**:
```typescript
import { testApiHandler } from 'next-test-api-route-handler'
import * as handler from '../route'

testApiHandler({
  handler,
  test: async ({ fetch }) => {
    const res = await fetch({
      method: 'POST',
      body: JSON.stringify({ url: 'test' })
    })

    expect(res.status).toBe(201)
  },
})
```

**Benefits**: Uses Next.js internal resolvers, automatically tested against each Next.js release.

### Mocking External APIs (YouTube API)

#### Using MSW (Mock Service Worker)

**Installation**:
```bash
npm install -D msw
```

**Setup Mock Server**:

```typescript
// tests/mocks/server.ts
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

export const handlers = [
  // Mock YouTube API
  http.get('https://www.googleapis.com/youtube/v3/videos', ({ request }) => {
    const url = new URL(request.url)
    const id = url.searchParams.get('id')

    return HttpResponse.json({
      items: [{
        id,
        snippet: {
          title: 'Test Stream',
          channelTitle: 'Test Channel'
        },
        liveStreamingDetails: {
          concurrentViewers: '1234',
          actualStartTime: new Date().toISOString()
        }
      }]
    })
  }),

  // Mock error scenario
  http.get('https://www.googleapis.com/youtube/v3/videos', ({ request }) => {
    const url = new URL(request.url)
    if (url.searchParams.get('id') === 'error') {
      return HttpResponse.json(
        { error: { message: 'Video not found' } },
        { status: 404 }
      )
    }
  }),
]

export const server = setupServer(...handlers)
```

**Setup in Tests**:

```typescript
// vitest.setup.ts
import { beforeAll, afterEach, afterAll } from 'vitest'
import { server } from './tests/mocks/server'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

**Using in Tests**:

```typescript
// app/api/streams/[id]/__tests__/route.test.ts
import { GET } from '../route'
import { server } from '@/tests/mocks/server'
import { http, HttpResponse } from 'msw'

describe('GET /api/streams/[id]', () => {
  it('fetches stream data from YouTube', async () => {
    const request = new NextRequest('http://localhost:3000/api/streams/abc123')
    const response = await GET(request, { params: { id: 'abc123' } })
    const data = await response.json()

    expect(data.title).toBe('Test Stream')
    expect(data.viewers).toBe('1234')
  })

  it('handles YouTube API errors', async () => {
    // Override handler for this test
    server.use(
      http.get('https://www.googleapis.com/youtube/v3/videos', () => {
        return HttpResponse.json(
          { error: { message: 'Quota exceeded' } },
          { status: 429 }
        )
      })
    )

    const request = new NextRequest('http://localhost:3000/api/streams/test')
    const response = await GET(request, { params: { id: 'test' } })

    expect(response.status).toBe(500)
  })
})
```

### Database Testing Strategies

#### Strategy 1: Mock Database (Fast)

**Pros**: Fast, isolated, no setup required
**Cons**: Doesn't test actual database logic

```typescript
vi.mock('@/db/drizzle', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([mockData]))
      }))
    }))
  }
}))
```

#### Strategy 2: Test Database (Accurate)

**Pros**: Tests real database interactions
**Cons**: Slower, requires setup/teardown

**Setup with Docker**:

```yaml
# docker-compose.test.yml
version: '3.8'
services:
  postgres-test:
    image: postgres:16
    environment:
      POSTGRES_DB: lsm_test
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
    ports:
      - "5433:5432"
```

**Test Setup**:

```typescript
// tests/setup/database.ts
import { beforeAll, afterAll, beforeEach } from 'vitest'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

let client: postgres.Sql
let testDb: ReturnType<typeof drizzle>

beforeAll(async () => {
  client = postgres(process.env.DATABASE_URL_TEST!)
  testDb = drizzle(client)

  // Run migrations
  await migrate(testDb, { migrationsFolder: './db/migrations' })
})

beforeEach(async () => {
  // Clean database before each test
  await testDb.delete(streams)
  await testDb.delete(users)
})

afterAll(async () => {
  await client.end()
})

export { testDb }
```

**Integration Test Example**:

```typescript
// tests/integration/stream-service.test.ts
import { describe, it, expect } from 'vitest'
import { testDb } from '../setup/database'
import { createStream, getStreams } from '@/lib/stream-service'

describe('Stream Service Integration', () => {
  it('creates and retrieves stream', async () => {
    const created = await createStream({
      url: 'https://youtube.com/watch?v=test',
      userId: 'user123'
    })

    expect(created.id).toBeDefined()

    const retrieved = await getStreams('user123')

    expect(retrieved).toHaveLength(1)
    expect(retrieved[0].url).toBe('https://youtube.com/watch?v=test')
  })
})
```

### Best Practices

#### 1. Must Have - Separate Unit and Integration Tests

**Priority**: P0

```
tests/
  unit/
    api/
      streams/
        add.test.ts          # Mock everything
  integration/
    stream-service.test.ts   # Real database
  mocks/
    server.ts               # MSW handlers
```

#### 2. Must Have - Test Error Handling

**Priority**: P0

```typescript
it('handles database connection errors', async () => {
  vi.mocked(db.insert).mockRejectedValue(new Error('Connection failed'))

  const response = await POST(request)

  expect(response.status).toBe(500)
  expect(await response.json()).toMatchObject({
    error: 'Internal server error'
  })
})
```

#### 3. Should Have - Test Validation

**Priority**: P1

```typescript
describe('Input validation', () => {
  it('rejects invalid YouTube URLs', async () => {
    const request = createRequest({ url: 'not-a-url' })
    const response = await POST(request)

    expect(response.status).toBe(400)
  })

  it('rejects missing userId', async () => {
    const request = createRequest({ url: 'valid-url' })
    const response = await POST(request)

    expect(response.status).toBe(401)
  })
})
```

#### 4. Should Have - Test Rate Limiting

**Priority**: P1

```typescript
it('enforces rate limits', async () => {
  const requests = Array(11).fill(null).map(() =>
    POST(createRequest({ url: 'test' }))
  )

  const responses = await Promise.all(requests)
  const rateLimited = responses.filter(r => r.status === 429)

  expect(rateLimited.length).toBeGreaterThan(0)
})
```

### CI Integration

```yaml
# .github/workflows/test.yml
jobs:
  integration-tests:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: lsm_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci
      - run: npm run test:integration
        env:
          DATABASE_URL_TEST: postgresql://test:test@localhost:5432/lsm_test
```

**Sources**:
- [Unit Testing Next.js API Routes - DEV](https://dev.to/dforrunner/how-to-unit-test-nextjs-13-app-router-api-routes-with-jest-and-react-testing-library-270a)
- [Unit Testing Next.js API Routes - Sean Connolly](https://seanconnolly.dev/unit-testing-nextjs-api-routes)
- [MSW in Next.js - DEV](https://dev.to/mehakb7/mock-service-worker-msw-in-nextjs-a-guide-for-api-mocking-and-testing-e9m)
- [Mock Client & Server API Requests - DEV](https://dev.to/ajth-in/mock-client-side-server-side-api-requests-using-nextjs-and-mswjs-9f1)
- [Webhooks E2E Testing - DEV](https://dev.to/ash_dubai/webhooks-end-to-end-testing-for-nextjs-applications-simplify-your-547e)

---

## 6. Component Testing for React 19

### Overview

React 19 component testing emphasizes user behavior over implementation details. Vitest with React Testing Library provides fast, reliable testing focused on how users interact with components.

**Source Authority**: High - Official Vitest and Testing Library documentation (2025)

### Why Vitest Over Jest in 2025

**Vitest Advantages**:
- **10x faster** - Leverages Vite's bundler
- **Native ESM** - No babel-jest or complex config
- **TypeScript/JSX out-of-the-box** - Uses Vite pipeline
- **Minimal configuration** - Works with existing vite.config
- **Modern** - Built for current JavaScript ecosystem

### Setup

**Installation**:
```bash
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom
```

**Configuration - vitest.config.ts**:
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    css: true, // Parse CSS imports
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData/',
      ],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
    },
  },
})
```

**Setup File - tests/setup.ts**:
```typescript
import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))
```

### Best Practices

#### 1. Must Have - Test User Behavior, Not Implementation

**Priority**: P0

**Bad** (Testing implementation):
```typescript
test('component has correct state', () => {
  const { container } = render(<StreamCard />)
  expect(container.firstChild.classList.contains('active')).toBe(true)
})
```

**Good** (Testing behavior):
```typescript
test('shows live indicator when stream is active', () => {
  render(<StreamCard stream={{ status: 'live' }} />)
  expect(screen.getByText('LIVE')).toBeInTheDocument()
})
```

#### 2. Must Have - Use screen for Queries

**Priority**: P0

**Recommended approach**:
```typescript
import { render, screen } from '@testing-library/react'

test('renders stream title', () => {
  render(<StreamCard title="My Stream" />)
  expect(screen.getByText('My Stream')).toBeInTheDocument()
})
```

**Avoid**:
```typescript
const { container } = render(<StreamCard />)
const title = container.querySelector('.title') // Brittle, implementation-dependent
```

#### 3. Must Have - Simulate Real User Interactions

**Priority**: P0

Use `@testing-library/user-event` (not `fireEvent`):

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

test('user can add stream', async () => {
  const user = userEvent.setup()
  const onAdd = vi.fn()

  render(<AddStreamDialog onAdd={onAdd} />)

  // Type into input
  await user.type(
    screen.getByLabelText('YouTube URL'),
    'https://youtube.com/watch?v=test'
  )

  // Click button
  await user.click(screen.getByRole('button', { name: 'Add Stream' }))

  expect(onAdd).toHaveBeenCalledWith('https://youtube.com/watch?v=test')
})
```

**Why `userEvent` over `fireEvent`**:
- More realistic (includes hover, focus, blur)
- Async by default (matches real interactions)
- Better error messages

#### 4. Must Have - Test Loading and Error States

**Priority**: P0

```typescript
describe('StreamCard', () => {
  test('shows skeleton while loading', () => {
    render(<StreamCard loading={true} />)
    expect(screen.getByTestId('skeleton-loader')).toBeInTheDocument()
  })

  test('shows error message on failure', () => {
    render(<StreamCard error="Failed to load stream" />)
    expect(screen.getByText(/failed to load/i)).toBeInTheDocument()
  })

  test('shows retry button on error', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()

    render(<StreamCard error="Failed" onRetry={onRetry} />)

    await user.click(screen.getByRole('button', { name: /retry/i }))
    expect(onRetry).toHaveBeenCalled()
  })
})
```

#### 5. Should Have - Test Accessibility

**Priority**: P1

```typescript
test('form is accessible', () => {
  render(<AddStreamForm />)

  // Check for proper labels
  expect(screen.getByLabelText('YouTube URL')).toBeInTheDocument()

  // Check ARIA attributes
  const input = screen.getByRole('textbox', { name: 'YouTube URL' })
  expect(input).toHaveAttribute('aria-invalid', 'false')

  // Check keyboard navigation
  expect(input).toHaveAttribute('type', 'url')
})
```

#### 6. Should Have - Test Conditional Rendering

**Priority**: P1

```typescript
test('shows viewer count only for live streams', () => {
  const { rerender } = render(
    <StreamCard stream={{ status: 'offline', viewers: 0 }} />
  )

  expect(screen.queryByText(/viewers/i)).not.toBeInTheDocument()

  rerender(<StreamCard stream={{ status: 'live', viewers: 1234 }} />)

  expect(screen.getByText('1,234 viewers')).toBeInTheDocument()
})
```

#### 7. Nice to Have - Snapshot Testing

**Priority**: P2

Use sparingly for static components:

```typescript
test('renders correctly', () => {
  const { container } = render(<StreamCard title="Test" />)
  expect(container.firstChild).toMatchSnapshot()
})
```

**Caution**: Snapshots are brittle. Prefer explicit assertions.

### Testing Patterns

#### Pattern 1: Testing Forms

```typescript
// components/__tests__/AddStreamDialog.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AddStreamDialog } from '../AddStreamDialog'

describe('AddStreamDialog', () => {
  test('validates YouTube URL format', async () => {
    const user = userEvent.setup()

    render(<AddStreamDialog />)

    const input = screen.getByLabelText('YouTube URL')
    await user.type(input, 'not-a-url')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(screen.getByText(/invalid url/i)).toBeInTheDocument()
  })

  test('submits valid URL', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(<AddStreamDialog onSubmit={onSubmit} />)

    await user.type(
      screen.getByLabelText('YouTube URL'),
      'https://youtube.com/watch?v=abc123'
    )
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(onSubmit).toHaveBeenCalledWith({
      url: 'https://youtube.com/watch?v=abc123'
    })
  })

  test('clears form after successful submission', async () => {
    const user = userEvent.setup()

    render(<AddStreamDialog onSubmit={vi.fn(() => Promise.resolve())} />)

    const input = screen.getByLabelText('YouTube URL')
    await user.type(input, 'https://youtube.com/watch?v=test')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    await waitFor(() => {
      expect(input).toHaveValue('')
    })
  })
})
```

#### Pattern 2: Testing Data Fetching Components

```typescript
// components/__tests__/StreamList.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StreamList } from '../StreamList'
import { server } from '@/tests/mocks/server'
import { http, HttpResponse } from 'msw'

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  )
}

describe('StreamList', () => {
  test('shows loading state initially', () => {
    renderWithQuery(<StreamList userId="user123" />)
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  test('displays streams after loading', async () => {
    renderWithQuery(<StreamList userId="user123" />)

    await waitFor(() => {
      expect(screen.getByText('Stream 1')).toBeInTheDocument()
    })
  })

  test('shows error message on failure', async () => {
    server.use(
      http.get('/api/streams', () => {
        return HttpResponse.json(
          { error: 'Server error' },
          { status: 500 }
        )
      })
    )

    renderWithQuery(<StreamList userId="user123" />)

    await waitFor(() => {
      expect(screen.getByText(/error loading streams/i)).toBeInTheDocument()
    })
  })
})
```

#### Pattern 3: Testing Interactive Components

```typescript
// components/__tests__/StreamCard.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StreamCard } from '../StreamCard'

describe('StreamCard', () => {
  const mockStream = {
    id: '123',
    title: 'Test Stream',
    status: 'live',
    viewers: 1234,
  }

  test('expands details on click', async () => {
    const user = userEvent.setup()

    render(<StreamCard stream={mockStream} />)

    expect(screen.queryByText(/description/i)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /details/i }))

    expect(screen.getByText(/description/i)).toBeInTheDocument()
  })

  test('opens remove dialog', async () => {
    const user = userEvent.setup()

    render(<StreamCard stream={mockStream} />)

    await user.click(screen.getByRole('button', { name: /remove/i }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/confirm removal/i)).toBeInTheDocument()
  })
})
```

### Testing Isolation

```typescript
import { beforeEach, afterEach } from 'vitest'

describe('Component with side effects', () => {
  beforeEach(() => {
    // Setup
    vi.useFakeTimers()
  })

  afterEach(() => {
    // Cleanup
    vi.clearAllMocks()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  test('auto-refreshes every 10 seconds', async () => {
    const onRefresh = vi.fn()

    render(<AutoRefreshComponent onRefresh={onRefresh} />)

    expect(onRefresh).not.toHaveBeenCalled()

    vi.advanceTimersByTime(10000)

    expect(onRefresh).toHaveBeenCalledTimes(1)
  })
})
```

### Browser Mode (Optional)

For components requiring real browser APIs:

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    browser: {
      enabled: true,
      name: 'chromium',
      provider: 'playwright',
    },
  },
})
```

**Use cases**:
- CSS rendering tests
- Clipboard API
- IntersectionObserver
- Real browser events

**Sources**:
- [Vitest Component Testing Guide](https://vitest.dev/guide/browser/component-testing)
- [React Testing with Vitest - Medium](https://vaskort.medium.com/bulletproof-react-testing-with-vitest-rtl-deeaabce9fef)
- [React Component Testing 2025 Guide](https://www.codingeasypeasy.com/blog/react-component-testing-best-practices-with-vitest-and-jest-2025-guide)
- [Mastering Unit Testing in React - Medium](https://medium.com/@victorrillo/mastering-unit-testing-in-react-best-practices-for-efficient-tests-with-vitest-and-react-testing-181408af7a10)
- [React Component Testing Best Practices - DEV](https://dev.to/tahamjp/react-component-testing-best-practices-for-2025-2674)

---

## 7. E2E Testing for Full-Stack Applications

### Overview

End-to-end testing with Playwright simulates real user workflows across the entire application stack, including database interactions and external API calls. This is essential for Next.js App Router applications with async Server Components.

**Source Authority**: High - Official Playwright and Next.js documentation (2025)

### Why Playwright in 2025

**Advantages**:
- **Cross-browser testing** - Chromium, Firefox, WebKit
- **Auto-wait** - No manual waits for elements
- **Network interception** - Mock external APIs
- **Parallel execution** - Fast test runs
- **Rich debugging** - Trace viewer, screenshots, video
- **TypeScript first** - Full type safety
- **App Router support** - Tests async RSC

### Setup

**Installation**:
```bash
npm init playwright@latest
```

Interactive setup includes:
- TypeScript configuration
- Test directory creation
- GitHub Actions workflow (optional)
- Browser downloads

**Configuration - playwright.config.ts**:

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results.json' }],
  ],

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // Mobile browsers
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
})
```

### Test Patterns

#### Pattern 1: User Authentication Flow

```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('user can sign in with email', async ({ page }) => {
    await page.goto('/login')

    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'password123')

    await page.click('button[type="submit"]')

    // Wait for navigation
    await expect(page).toHaveURL('/dashboard')

    // Verify logged in state
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
    await expect(page.locator('text=test@example.com')).toBeVisible()
  })

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/login')

    await page.fill('input[name="email"]', 'wrong@example.com')
    await page.fill('input[name="password"]', 'wrongpassword')

    await page.click('button[type="submit"]')

    await expect(page.locator('text=Invalid credentials')).toBeVisible()
    await expect(page).toHaveURL('/login')
  })
})
```

#### Pattern 2: CRUD Operations

```typescript
// e2e/streams.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Stream Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login')
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
  })

  test('user can add new stream', async ({ page }) => {
    await page.goto('/dashboard')

    // Click add button
    await page.click('button:has-text("Add Stream")')

    // Dialog should appear
    await expect(page.locator('role=dialog')).toBeVisible()

    // Fill form
    await page.fill(
      'input[name="url"]',
      'https://youtube.com/watch?v=dQw4w9WgXcQ'
    )

    // Submit
    await page.click('button:has-text("Add")')

    // Verify stream appears in list
    await expect(
      page.locator('[data-testid="stream-card"]').filter({ hasText: 'dQw4w9WgXcQ' })
    ).toBeVisible()

    // Dialog should close
    await expect(page.locator('role=dialog')).not.toBeVisible()
  })

  test('user can remove stream', async ({ page }) => {
    await page.goto('/dashboard')

    // Find first stream card
    const firstStream = page.locator('[data-testid="stream-card"]').first()
    const streamTitle = await firstStream.locator('h3').textContent()

    // Click remove button
    await firstStream.locator('button[aria-label="Remove stream"]').click()

    // Confirm removal
    await page.click('button:has-text("Confirm")')

    // Verify stream removed
    await expect(page.locator(`text=${streamTitle}`)).not.toBeVisible()
  })

  test('user can view stream details', async ({ page }) => {
    await page.goto('/dashboard')

    // Click on first stream
    await page.locator('[data-testid="stream-card"]').first().click()

    // Should navigate to details page
    await expect(page).toHaveURL(/\/streams\/.+/)

    // Verify details loaded
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('[data-testid="viewer-count"]')).toBeVisible()
  })
})
```

#### Pattern 3: Real-time Updates

```typescript
// e2e/real-time.spec.ts
import { test, expect } from '@playwright/test'

test('displays real-time viewer updates', async ({ page }) => {
  await page.goto('/streams/abc123')

  // Get initial viewer count
  const viewerCount = page.locator('[data-testid="viewer-count"]')
  const initial = await viewerCount.textContent()

  // Wait for update (polling interval is 5 seconds)
  await page.waitForTimeout(6000)

  // Count should update
  const updated = await viewerCount.textContent()

  // Value might change or stay same, but element should still be visible
  expect(updated).toBeDefined()
})
```

### Database Testing

#### Setup Test Database

```typescript
// e2e/helpers/database.ts
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { streams, users } from '@/db/schema'

const client = postgres(process.env.DATABASE_URL_TEST!)
export const testDb = drizzle(client)

export async function seedTestData() {
  // Create test user
  const [user] = await testDb.insert(users).values({
    email: 'test@example.com',
    password: 'hashed_password',
  }).returning()

  // Create test streams
  await testDb.insert(streams).values([
    {
      userId: user.id,
      url: 'https://youtube.com/watch?v=test1',
      title: 'Test Stream 1',
    },
    {
      userId: user.id,
      url: 'https://youtube.com/watch?v=test2',
      title: 'Test Stream 2',
    },
  ])

  return user
}

export async function cleanDatabase() {
  await testDb.delete(streams)
  await testDb.delete(users)
}
```

**Use in tests**:

```typescript
import { test, expect } from '@playwright/test'
import { seedTestData, cleanDatabase } from './helpers/database'

test.describe('Dashboard with real data', () => {
  test.beforeEach(async () => {
    await cleanDatabase()
    await seedTestData()
  })

  test.afterEach(async () => {
    await cleanDatabase()
  })

  test('displays user streams', async ({ page }) => {
    await page.goto('/dashboard')

    await expect(page.locator('[data-testid="stream-card"]')).toHaveCount(2)
    await expect(page.locator('text=Test Stream 1')).toBeVisible()
    await expect(page.locator('text=Test Stream 2')).toBeVisible()
  })
})
```

### Mocking External APIs

#### Network Interception

```typescript
import { test, expect } from '@playwright/test'

test('handles YouTube API errors gracefully', async ({ page }) => {
  // Intercept YouTube API calls
  await page.route('**/youtube.com/v3/videos*', route => {
    route.fulfill({
      status: 429,
      contentType: 'application/json',
      body: JSON.stringify({
        error: {
          code: 429,
          message: 'Quota exceeded'
        }
      })
    })
  })

  await page.goto('/streams/abc123')

  // Should show error message
  await expect(page.locator('text=Unable to load stream data')).toBeVisible()

  // Should show retry button
  await expect(page.locator('button:has-text("Retry")')).toBeVisible()
})

test('successfully fetches stream data', async ({ page }) => {
  // Mock successful API response
  await page.route('**/youtube.com/v3/videos*', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [{
          id: 'abc123',
          snippet: {
            title: 'Mocked Stream Title',
            channelTitle: 'Mocked Channel',
          },
          liveStreamingDetails: {
            concurrentViewers: '5678',
            actualStartTime: new Date().toISOString(),
          }
        }]
      })
    })
  })

  await page.goto('/streams/abc123')

  await expect(page.locator('h1:has-text("Mocked Stream Title")')).toBeVisible()
  await expect(page.locator('text=5,678 viewers')).toBeVisible()
})
```

### Fixtures for Shared Setup

```typescript
// e2e/fixtures.ts
import { test as base } from '@playwright/test'
import { seedTestData, cleanDatabase } from './helpers/database'

type TestFixtures = {
  authenticatedPage: Page
  testUser: { id: string; email: string }
}

export const test = base.extend<TestFixtures>({
  testUser: async ({}, use) => {
    await cleanDatabase()
    const user = await seedTestData()
    await use(user)
    await cleanDatabase()
  },

  authenticatedPage: async ({ page, testUser }, use) => {
    // Login
    await page.goto('/login')
    await page.fill('input[name="email"]', testUser.email)
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')

    await use(page)
  },
})

export { expect } from '@playwright/test'
```

**Usage**:

```typescript
import { test, expect } from './fixtures'

test('authenticated user can add stream', async ({ authenticatedPage, testUser }) => {
  // Page is already logged in
  await authenticatedPage.click('button:has-text("Add Stream")')

  // Rest of test...
})
```

### Best Practices

#### 1. Must Have - Stable Selectors

**Priority**: P0

Use `data-testid` for test-specific selectors:

```typescript
// Good
await page.click('[data-testid="add-stream-button"]')

// Avoid (brittle)
await page.click('.btn-primary')
await page.click('button:nth-child(3)')
```

#### 2. Must Have - Wait for Network Idle

**Priority**: P0

```typescript
test('page loads completely', async ({ page }) => {
  await page.goto('/dashboard', { waitUntil: 'networkidle' })

  // All API calls complete
  await expect(page.locator('[data-testid="stream-list"]')).toBeVisible()
})
```

#### 3. Should Have - Test in Isolation

**Priority**: P1

Each test should be independent:

```typescript
test.describe.configure({ mode: 'parallel' })

test.beforeEach(async () => {
  await cleanDatabase()
  await seedTestData()
})

test.afterEach(async () => {
  await cleanDatabase()
})
```

#### 4. Should Have - Test Critical User Flows

**Priority**: P1

Focus E2E tests on high-value scenarios:

```typescript
test('complete user journey: signup → add stream → view analytics', async ({ page }) => {
  // 1. Sign up
  await page.goto('/signup')
  await page.fill('input[name="email"]', 'newuser@example.com')
  await page.fill('input[name="password"]', 'securepassword')
  await page.click('button:has-text("Sign Up")')

  // 2. Add stream
  await page.waitForURL('/dashboard')
  await page.click('button:has-text("Add Stream")')
  await page.fill('input[name="url"]', 'https://youtube.com/watch?v=test')
  await page.click('button:has-text("Add")')

  // 3. View analytics
  await page.click('[data-testid="stream-card"]:has-text("test")')
  await expect(page).toHaveURL(/\/streams\/.*/)
  await expect(page.locator('[data-testid="analytics-chart"]')).toBeVisible()
})
```

#### 5. Nice to Have - Visual Regression Testing

**Priority**: P2

```typescript
test('dashboard visual regression', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page).toHaveScreenshot('dashboard.png', {
    maxDiffPixels: 100,
  })
})
```

### CI Integration

```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    timeout-minutes: 60
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: lsm_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - name: Install Playwright Browsers
        run: npx playwright install chromium --with-deps

      - name: Run E2E tests
        run: npx playwright test
        env:
          DATABASE_URL_TEST: postgresql://test:test@localhost:5432/lsm_test
          YOUTUBE_API_KEY: ${{ secrets.YOUTUBE_API_KEY_TEST }}

      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

### Debugging

```bash
# Run tests in headed mode
npx playwright test --headed

# Debug specific test
npx playwright test --debug e2e/streams.spec.ts

# Generate trace
npx playwright test --trace on

# Open trace viewer
npx playwright show-trace trace.zip
```

**Sources**:
- [Playwright Official Docs - Next.js](https://nextjs.org/docs/pages/guides/testing/playwright)
- [E2E Testing in Next.js - Enreina](https://enreina.com/blog/e2e-testing-in-next-js-with-playwright-vercel-and-github-actions-a-guide-with-example/)
- [Next.js with Playwright - Medium](https://medium.com/@narayanansundar02/next-js-with-playwright-writing-end-to-end-test-cases-bd08c65a2e12)
- [Guide to Playwright E2E Testing 2025 - DeviQA](https://www.deviqa.com/blog/guide-to-playwright-end-to-end-testing-in-2025/)
- [Strapi Next.js Testing Guide](https://strapi.io/blog/nextjs-testing-guide-unit-and-e2e-tests-with-vitest-and-playwright)
- [Efficient E2E Testing - Medium](https://medium.com/@lucgagan/efficient-e2e-testing-for-next-js-a-playwright-tutorial-06eadfc59111)

---

## Summary and Recommendations

### Implementation Priority Matrix

| Category | Tool/Pattern | Priority | Effort | Impact |
|----------|-------------|----------|--------|--------|
| Chart Optimization | LTTB (@seanvelasco/lttb) | P0 | Low | High |
| Real-time Data | TanStack Query + Adaptive Polling | P0 | Medium | High |
| Unit Testing | Vitest + React Testing Library | P0 | Medium | High |
| E2E Testing | Playwright | P0 | High | High |
| API Mocking | MSW | P1 | Medium | Medium |
| CI/CD | GitHub Actions + Vercel | P0 | Medium | High |
| Database Testing | Test Database + Fixtures | P1 | High | Medium |

### Phase 1: Immediate Implementation

1. **Chart Downsampling**
   - Install `@seanvelasco/lttb`
   - Implement for historical viewer data
   - Target: 800 points for 7-day view

2. **Real-time Polling**
   - Configure TanStack Query adaptive intervals
   - Live streams: 3s, scheduled: 30s, offline: stop

3. **Basic Testing Setup**
   - Install Vitest + Playwright
   - Configure test environments
   - Write first component tests

### Phase 2: Comprehensive Testing

4. **Unit Test Coverage**
   - Component tests for all UI
   - API route unit tests with mocks
   - Target: 80% coverage

5. **Integration Tests**
   - API routes with test database
   - MSW for YouTube API mocking
   - Stream CRUD operations

6. **E2E Critical Paths**
   - User auth flow
   - Add/remove stream
   - View stream details

### Phase 3: CI/CD & Automation

7. **GitHub Actions**
   - Lint + type check
   - Unit tests
   - E2E tests
   - Automated deployments

8. **Quality Gates**
   - Tests must pass before merge
   - Preview deployments for PRs
   - Production deployment on main

---

## Additional Resources

### Documentation
- [TanStack Query Docs](https://tanstack.com/query/latest)
- [Vitest Guide](https://vitest.dev/guide/)
- [Playwright Docs](https://playwright.dev/)
- [React Testing Library](https://testing-library.com/react)
- [MSW Documentation](https://mswjs.io/)

### Example Repositories
- [Next.js with Vitest](https://github.com/vercel/next.js/tree/canary/examples/with-vitest)
- [Next.js with Playwright](https://github.com/vercel/next.js/tree/canary/examples/with-playwright)
- [Next Starter 2025](https://github.com/milosh86/next-starter)

### Articles
- [Testing Next.js Applications - 2025 Guide](https://caisy.io/blog/nextjs-testing-guide)
- [Production Next.js Setup](https://janhesters.com/blog/how-to-set-up-nextjs-15-for-production-in-2025)
