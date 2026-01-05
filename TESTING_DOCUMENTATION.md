# Testing Documentation Research

**Last Updated**: 2026-01-04

This document contains comprehensive research on testing strategies, configuration, and best practices for the Live Stream Monitor project.

---

## Table of Contents

1. [Next.js 15 Testing Setup (App Router)](#1-nextjs-15-testing-setup-app-router)
2. [TanStack Query v5 - Real-Time Updates](#2-tanstack-query-v5-real-time-updates)
3. [Recharts Performance Optimization](#3-recharts-performance-optimization)
4. [Vercel Cron Jobs Configuration](#4-vercel-cron-jobs-configuration)
5. [Drizzle ORM Testing Patterns](#5-drizzle-orm-testing-patterns)
6. [Better Auth Testing Strategies](#6-better-auth-testing-strategies)
7. [Playwright for Next.js Integration Testing](#7-playwright-for-next-js-integration-testing)
8. [Recommended Testing Stack](#8-recommended-testing-stack)

---

## 1. Next.js 15 Testing Setup (App Router)

### Current State of React Server Components Testing

**Critical Limitation**: Vitest currently does NOT support async React Server Components. While you can run unit tests for synchronous Server and Client Components, async components require E2E testing.

### Recommended Testing Approach

```
┌─────────────────────────────────────────────────────────┐
│  Testing Strategy for Next.js 15 App Router             │
├─────────────────────────────────────────────────────────┤
│  Client Components        → Vitest + React Testing Lib  │
│  Sync Server Components   → Vitest + React Testing Lib  │
│  Async Server Components  → Playwright E2E Tests        │
│  API Routes              → Vitest Integration Tests     │
│  Full User Flows         → Playwright E2E Tests         │
└─────────────────────────────────────────────────────────┘
```

### Vitest Setup for Next.js 15

#### Installation

```bash
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom vite-tsconfig-paths
```

#### Configuration: `vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        '.next/',
        'coverage/',
        '**/*.config.ts',
        '**/*.d.ts'
      ]
    }
  }
})
```

#### Setup File: `vitest.setup.ts`

```typescript
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Cleanup after each test
afterEach(() => {
  cleanup()
})
```

#### Testing Client Components

```typescript
// components/__tests__/StreamCard.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StreamCard } from '@/components/StreamCard'

describe('StreamCard', () => {
  it('renders stream title', () => {
    const mockStream = {
      id: '1',
      title: 'Test Stream',
      viewerCount: 1000,
      isLive: true
    }

    render(<StreamCard stream={mockStream} />)
    expect(screen.getByText('Test Stream')).toBeInTheDocument()
  })
})
```

#### Testing Synchronous Server Components

```typescript
// app/__tests__/DashboardLayout.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import DashboardLayout from '@/app/dashboard/layout'

describe('DashboardLayout', () => {
  it('renders children correctly', () => {
    render(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>
    )

    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })
})
```

### Testing API Routes

```typescript
// app/api/streams/__tests__/route.test.ts
import { describe, it, expect, vi } from 'vitest'
import { GET } from '@/app/api/streams/route'
import { NextRequest } from 'next/server'

describe('/api/streams', () => {
  it('returns streams list', async () => {
    const mockRequest = new NextRequest('http://localhost:3000/api/streams')
    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(Array.isArray(data.streams)).toBe(true)
  })
})
```

### Package.json Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:e2e": "playwright test"
  }
}
```

### Sources

- [Testing: Vitest | Next.js](https://nextjs.org/docs/app/guides/testing/vitest)
- [Setting up Vitest for Next.js 15 - Wisp CMS](https://www.wisp.blog/blog/setting-up-vitest-for-nextjs-15)
- [NextJs Unit Testing and End-to-End Testing](https://strapi.io/blog/nextjs-testing-guide-unit-and-e2e-tests-with-vitest-and-playwright)

---

## 2. TanStack Query v5 - Real-Time Updates

### RefetchInterval Configuration

TanStack Query v5 provides powerful options for implementing real-time updates and automatic polling.

### Basic Polling Setup

```typescript
import { useQuery } from '@tanstack/react-query'

function StreamMonitor() {
  const { data, status, error, isFetching } = useQuery({
    queryKey: ['streams'],
    queryFn: async () => {
      const response = await fetch('/api/streams')
      return response.json()
    },
    // Refetch every 30 seconds
    refetchInterval: 30000,
    // Continue refetching even when window is not focused
    refetchIntervalInBackground: true,
  })

  return (
    <div>
      {isFetching && <span>Updating...</span>}
      {/* Render stream data */}
    </div>
  )
}
```

### Dynamic Refetch Intervals

```typescript
const { data } = useQuery({
  queryKey: ['streams'],
  queryFn: fetchStreams,
  refetchInterval: (query) => {
    // Refetch faster if data is stale, slower otherwise
    return query.state.isStale ? 1000 : 10000
  },
  refetchIntervalInBackground: true
})
```

### Error Recovery Pattern

```typescript
const result = useQuery({
  queryKey: ['todos'],
  queryFn: fetchTodos,
  refetchInterval: (query) => {
    // Refetch more frequently when in error state
    return query.state.status === 'error' ? 5000 : 30000
  },
  refetchIntervalInBackground: true,
  retry: false, // Disable built-in retries, use refetchInterval instead
})
```

### Global Configuration for QueryClient

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnMount: true,           // Refetch on mount if stale (default)
      refetchOnWindowFocus: 'always', // Always refetch on window focus
      refetchOnReconnect: false,      // Do not refetch on reconnect
      refetchInterval: 5000,          // Refetch every 5 seconds
      refetchIntervalInBackground: true, // Continue in background
      staleTime: 2 * 60 * 1000,       // Data fresh for 2 minutes
    }
  }
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* Your app */}
    </QueryClientProvider>
  )
}
```

### Conditional Refetch on Mount

```typescript
const customRefetchClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnMount: (query) => {
        // Only refetch if the query is marked as 'invalid'
        return query.state.isInvalid
      }
    }
  }
})
```

### Key Options Explained

| Option | Type | Description |
|--------|------|-------------|
| `refetchInterval` | `number \| false \| ((query: Query) => number \| false)` | Interval in ms for automatic refetching. Set to `false` to disable. |
| `refetchIntervalInBackground` | `boolean` | If `true`, queries continue refetching when window is not focused. Default: `false` |
| `staleTime` | `number \| 'static'` | Time in ms until data is considered stale. Use `Infinity` for never stale. |
| `refetchOnWindowFocus` | `boolean \| 'always'` | Refetch when window regains focus. |
| `refetchOnReconnect` | `boolean \| 'always'` | Refetch when network reconnects. |
| `refetchOnMount` | `boolean \| 'always' \| ((query: Query) => boolean)` | Refetch on component mount. |

### Best Practices for Real-Time Updates

1. **Use appropriate intervals**: Don't poll too frequently to avoid unnecessary load
   - Real-time critical data: 5-10 seconds
   - Live updates: 30-60 seconds
   - Background sync: 5-10 minutes

2. **Consider staleTime**: Set `staleTime` to prevent refetching data that's still fresh
   ```typescript
   {
     refetchInterval: 30000,
     staleTime: 2 * 60 * 1000, // Don't refetch if data is less than 2 minutes old
   }
   ```

3. **Handle background refetching**: Use `refetchIntervalInBackground: true` for monitoring dashboards

4. **Implement error handling**: Use dynamic intervals to retry faster during errors

5. **Show loading states**: Use `isFetching` to indicate background updates
   ```typescript
   {isFetching && !isLoading && <RefreshIndicator />}
   ```

### Sources

- [TanStack Query v5 Documentation](https://tanstack.com/query/latest)
- Context7 Documentation for TanStack Query v5

---

## 3. Recharts Performance Optimization

### Key Performance Strategies

#### 1. ResponsiveContainer with Debouncing

```jsx
import { ResponsiveContainer, LineChart, Line } from 'recharts'

function OptimizedChart({ data }) {
  return (
    <ResponsiveContainer
      width="100%"
      height={400}
      debounce={300} // Debounce resize events by 300ms
      onResize={(width, height) => {
        console.log(`Chart resized to ${width}x${height}`)
      }}
    >
      <LineChart data={data}>
        <Line type="monotone" dataKey="value" stroke="#8884d8" />
      </LineChart>
    </ResponsiveContainer>
  )
}
```

**Why this matters**: Debouncing resize events prevents excessive re-renders during window resizing.

#### 2. Disable Animations for Large Datasets

```jsx
import { LineChart, Line } from 'recharts'

function LargeDatasetChart({ data }) {
  return (
    <LineChart data={data}>
      <Line
        type="monotone"
        dataKey="value"
        stroke="#8884d8"
        isAnimationActive={false} // Disable animations for performance
        dot={false} // Disable dots for better performance
      />
    </LineChart>
  )
}
```

#### 3. Control Animation Properties

```jsx
import React, { useState } from 'react'
import { LineChart, Line, ResponsiveContainer } from 'recharts'

function AnimatedChart({ data }) {
  const [animationKey, setAnimationKey] = useState(0)

  return (
    <div>
      <button onClick={() => setAnimationKey(prev => prev + 1)}>
        Replay Animation
      </button>

      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data} key={animationKey}>
          <Line
            type="monotone"
            dataKey="value"
            stroke="#8884d8"
            isAnimationActive={true}
            animationDuration={2000}
            animationEasing="ease-in-out"
            animationBegin={0}
            onAnimationStart={() => console.log('Animation started')}
            onAnimationEnd={() => console.log('Animation ended')}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
```

#### 4. Brush Component for Large Datasets

```jsx
import { LineChart, Line, Brush, XAxis, YAxis, ResponsiveContainer } from 'recharts'

function BrushExample({ data }) {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={data}>
        <XAxis dataKey="name" />
        <YAxis />
        <Line type="monotone" dataKey="value" stroke="#8884d8" dot={false} />

        {/* Brush for data filtering - shows 20 items at a time */}
        <Brush
          dataKey="name"
          height={30}
          stroke="#8884d8"
          startIndex={0}
          endIndex={20}
          onChange={(range) => console.log('Brush range:', range)}
        >
          <LineChart>
            <Line type="monotone" dataKey="value" stroke="#8884d8" dot={false} />
          </LineChart>
        </Brush>
      </LineChart>
    </ResponsiveContainer>
  )
}
```

#### 5. Memoization for Chart Components

```jsx
import React, { useMemo } from 'react'
import { LineChart, Line, ResponsiveContainer } from 'recharts'

function MemoizedChart({ rawData, dateRange }) {
  // Only recompute when rawData or dateRange changes
  const filteredData = useMemo(() => {
    return rawData.filter(item => {
      const date = new Date(item.timestamp)
      return date >= dateRange.start && date <= dateRange.end
    })
  }, [rawData, dateRange])

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={filteredData}>
        <Line type="monotone" dataKey="value" stroke="#8884d8" />
      </LineChart>
    </ResponsiveContainer>
  )
}

export default React.memo(MemoizedChart)
```

### Performance Best Practices Summary

| Technique | When to Use | Performance Impact |
|-----------|-------------|-------------------|
| **Debounce ResponsiveContainer** | Always | Medium - prevents resize thrashing |
| **Disable animations** | Large datasets (>100 points) | High - eliminates animation overhead |
| **Remove dots** | Dense data (>50 points) | Medium - reduces SVG elements |
| **Use Brush component** | Very large datasets (>1000 points) | High - limits rendered data |
| **Memoization** | Computed data transformations | High - prevents unnecessary recalculations |
| **Disable tooltips** | Performance-critical charts | Medium - reduces event listeners |
| **Limit tick count** | Many data points | Low-Medium - reduces axis labels |

### Redux-Based State Management

Recharts (v3.5.1+) uses Redux (@reduxjs/toolkit) internally for state management. This handles:
- Chart layout calculations
- Tooltip interactions
- Axis calculations
- Graphical item rendering

The Redux architecture enables advanced features like chart synchronization and programmatic control through custom hooks.

### Sources

- Context7 Documentation for Recharts
- [Recharts Official Documentation](https://recharts.org/)

---

## 4. Vercel Cron Jobs Configuration

### Configuration Format

Vercel cron jobs are configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/prune-data",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/check-streams",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

### Cron Expression Examples

| Expression | Description |
|------------|-------------|
| `0 2 * * *` | Every day at 2:00 AM UTC |
| `*/5 * * * *` | Every 5 minutes |
| `0 */6 * * *` | Every 6 hours |
| `0 0 * * 0` | Every Sunday at midnight |
| `0 9 * * 1-5` | Every weekday at 9:00 AM |

### Plan-Specific Features

#### Hobby Plan Limitations

- Cron jobs invoke **anywhere within the specified minute**
  - Example: `0 1 * * *` triggers between 1:00 AM and 1:59 AM
- **NOT suitable** for time-critical operations

#### Pro Plan Benefits

- **Precise timing**: Cron jobs execute at the exact scheduled time
- **Recommended for production** applications requiring reliable timing
- Same pricing as Hobby for cron jobs themselves (they use Function invocations)

### Hard Limits (All Plans)

- **20 cron jobs maximum** per project
- Only triggered on **production deployments** (not preview deployments)
- **No automatic retries** - if a cron job fails, Vercel won't retry
- Subject to **Function duration limits** (same as Vercel Functions)

### API Route Implementation

```typescript
// app/api/cron/prune-data/route.ts
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge' // Optional: use edge runtime
export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Maximum execution time in seconds

export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization')

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    // Your cron job logic here
    const result = await pruneOldData()

    return NextResponse.json({
      success: true,
      message: 'Data pruned successfully',
      result
    })
  } catch (error) {
    console.error('Cron job failed:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### Security Best Practices

#### 1. Use Authorization Headers

```typescript
// Verify CRON_SECRET environment variable
const authHeader = request.headers.get('authorization')
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

#### 2. Environment Variables

```bash
# .env.local (for local testing)
CRON_SECRET=your-secret-key-here
```

Add `CRON_SECRET` to Vercel project environment variables.

#### 3. Validate Request Origin

```typescript
const userAgent = request.headers.get('user-agent')
if (!userAgent?.includes('vercel-cron')) {
  return NextResponse.json({ error: 'Invalid request source' }, { status: 403 })
}
```

### Monitoring and Logging

```typescript
export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    console.log('[Cron] Starting prune-data job')

    const result = await pruneOldData()

    const duration = Date.now() - startTime
    console.log(`[Cron] Completed in ${duration}ms`, { result })

    return NextResponse.json({ success: true, duration, result })
  } catch (error) {
    console.error('[Cron] Error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
```

### Testing Cron Jobs Locally

```typescript
// scripts/test-cron.ts
async function testCronJob() {
  const response = await fetch('http://localhost:3000/api/cron/prune-data', {
    headers: {
      'Authorization': `Bearer ${process.env.CRON_SECRET}`
    }
  })

  const data = await response.json()
  console.log('Cron job result:', data)
}

testCronJob()
```

### Sources

- [Usage & Pricing for Cron Jobs](https://vercel.com/docs/cron-jobs/usage-and-pricing)
- [Managing Cron Jobs](https://vercel.com/docs/cron-jobs/manage-cron-jobs)
- [Cron Jobs Documentation](https://vercel.com/docs/cron-jobs)
- [How to Setup Cron Jobs on Vercel](https://vercel.com/guides/how-to-setup-cron-jobs-on-vercel)

---

## 5. Drizzle ORM Testing Patterns

### Modern Testing Approach (2026): PGlite

**PGlite** is the recommended approach for testing Drizzle ORM applications in 2026. It runs WASM-compiled PostgreSQL in memory.

#### Advantages

- No Docker containers required
- Zero delay - instant startup
- Real PostgreSQL behavior
- Supports parallelism and watch mode
- Perfect for CI/CD pipelines

#### Installation

```bash
npm install -D @electric-sql/pglite
```

#### Basic Setup

```typescript
// lib/test-db.ts
import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import * as schema from './schema'

export async function createTestDb() {
  const client = new PGlite()
  const db = drizzle(client, { schema })

  // Push schema to in-memory database
  await db.schema.push()

  return { db, client }
}
```

#### Using in Tests

```typescript
// __tests__/streams.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { createTestDb } from '@/lib/test-db'
import { streams } from '@/db/schema'
import { eq } from 'drizzle-orm'

describe('Stream Operations', () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>

  beforeEach(async () => {
    // Create fresh database for each test
    testDb = await createTestDb()
  })

  it('should insert and retrieve stream', async () => {
    const { db } = testDb

    await db.insert(streams).values({
      id: 'test-123',
      userId: 'user-1',
      platform: 'youtube',
      channelId: 'UCtest',
      streamKey: 'test-key'
    })

    const result = await db.select()
      .from(streams)
      .where(eq(streams.id, 'test-123'))

    expect(result).toHaveLength(1)
    expect(result[0].platform).toBe('youtube')
  })
})
```

### Database Templates Pattern (PostgreSQL)

For more complex test setups, use database templates to avoid repeated migrations.

```typescript
// vitest.global-setup.ts
import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'

export async function setup() {
  const pool = new Pool({
    connectionString: process.env.TEST_DATABASE_URL
  })

  const db = drizzle(pool)

  // Create template database with schema
  await pool.query('DROP DATABASE IF EXISTS template_test')
  await pool.query('CREATE DATABASE template_test')

  const templatePool = new Pool({
    connectionString: process.env.TEST_DATABASE_URL?.replace('/postgres', '/template_test')
  })

  const templateDb = drizzle(templatePool)
  await migrate(templateDb, { migrationsFolder: './drizzle' })

  await templatePool.end()
  await pool.end()
}

export async function teardown() {
  // Cleanup if needed
}
```

```typescript
// vitest.setup.ts
import { beforeEach, afterEach } from 'vitest'
import { Pool } from 'pg'

let testPool: Pool
let testDbName: string

beforeEach(async () => {
  // Generate unique database name
  testDbName = `test_${Date.now()}_${Math.random().toString(36).slice(2)}`

  const pool = new Pool({
    connectionString: process.env.TEST_DATABASE_URL
  })

  // Clone template database
  await pool.query(`CREATE DATABASE ${testDbName} TEMPLATE template_test`)
  await pool.end()

  // Connect to test database
  testPool = new Pool({
    connectionString: process.env.TEST_DATABASE_URL?.replace('/postgres', `/${testDbName}`)
  })
})

afterEach(async () => {
  await testPool.end()

  const pool = new Pool({
    connectionString: process.env.TEST_DATABASE_URL
  })

  await pool.query(`DROP DATABASE ${testDbName}`)
  await pool.end()
})
```

### Mock Database Pattern

For unit tests that shouldn't touch a real database:

```typescript
import { drizzle } from 'drizzle-orm/node-postgres'
import { vi } from 'vitest'
import * as schema from './schema'

// Create mock database
export function createMockDb() {
  const db = drizzle.mock({ schema })

  return db
}
```

### Transaction-Based Testing

```typescript
import { describe, it, beforeEach, afterEach } from 'vitest'
import { db } from '@/db/drizzle'

describe('Stream Service', () => {
  let transaction: any

  beforeEach(async () => {
    // Start transaction
    transaction = await db.transaction()
  })

  afterEach(async () => {
    // Rollback transaction (cleanup)
    await transaction.rollback()
  })

  it('should create stream', async () => {
    // Use transaction.db for all operations
    // Changes will be rolled back after test
  })
})
```

### Test Data Generation

Using `@praha/drizzle-factory`:

```bash
npm install -D @praha/drizzle-factory
```

```typescript
import { createFactory } from '@praha/drizzle-factory'
import { streams } from '@/db/schema'

const streamFactory = createFactory({
  table: streams,
  defaults: {
    platform: 'youtube',
    userId: () => `user-${Math.random()}`,
    channelId: () => `UC${Math.random().toString(36).slice(2)}`,
    streamKey: () => `key-${Math.random().toString(36).slice(2)}`
  }
})

// In tests
const testStream = await streamFactory.create({ platform: 'twitch' })
```

### Testing Best Practices

1. **Use PGlite for most tests** - Fast, isolated, real PostgreSQL
2. **Use database templates** - For complex setups requiring migrations
3. **Parallel test execution** - Each test gets its own database instance
4. **Seed data factories** - Consistent, reusable test data
5. **Transaction-based tests** - For integration tests with shared database

### Sources

- [Using in-memory Postgres when testing with vitest - GitHub Issue](https://github.com/drizzle-team/drizzle-orm/issues/4205)
- [How to Test Your Node.js & Postgres App Using Drizzle & PGlite](https://dev.to/benjamindaniel/how-to-test-your-nodejs-postgres-app-using-drizzle-pglite-4fb3)
- [API with NestJS - Unit tests with the Drizzle ORM](http://wanago.io/2024/09/23/api-nestjs-drizzle-orm-unit-tests/)

---

## 6. Better Auth Testing Strategies

### About Better Auth

Better Auth is "the most comprehensive authentication framework for TypeScript," supporting React, Vue, Svelte, Astro, Solid, Next.js, Nuxt, Tanstack Start, and Hono. It uses a plugin architecture for extensibility.

### Testing Approaches

#### 1. Mock the Auth Provider in Development

```typescript
// lib/auth.ts
import { betterAuth } from 'better-auth'

export const auth = betterAuth({
  // Use test database in test environment
  database: process.env.NODE_ENV === 'test'
    ? testDatabase
    : productionDatabase,

  providers: process.env.NODE_ENV === 'test'
    ? [
        // Mock provider for testing
        {
          id: 'mock',
          name: 'Mock',
          async authenticate(credentials) {
            return {
              id: 'test-user-id',
              email: 'test@example.com',
              name: 'Test User'
            }
          }
        }
      ]
    : [
        // Real providers for production
        google({ clientId: '...', clientSecret: '...' }),
        github({ clientId: '...', clientSecret: '...' })
      ]
})
```

#### 2. E2E Testing with Playwright

```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test('should login with credentials', async ({ page }) => {
    await page.goto('/login')

    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')

    // Wait for redirect
    await page.waitForURL('/dashboard')

    // Verify authenticated state
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
  })

  test('should handle invalid credentials', async ({ page }) => {
    await page.goto('/login')

    await page.fill('input[name="email"]', 'wrong@example.com')
    await page.fill('input[name="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')

    await expect(page.locator('.error-message')).toContainText('Invalid credentials')
  })
})
```

#### 3. Session Management Testing

```typescript
// __tests__/auth-session.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { createTestDb } from '@/lib/test-db'
import { auth } from '@/lib/auth'

describe('Auth Session Management', () => {
  beforeEach(async () => {
    // Setup test database
    await createTestDb()
  })

  it('should create session on login', async () => {
    const result = await auth.signIn({
      email: 'test@example.com',
      password: 'password123'
    })

    expect(result.session).toBeDefined()
    expect(result.session.userId).toBe('test-user-id')
  })

  it('should invalidate session on logout', async () => {
    const { session } = await auth.signIn({
      email: 'test@example.com',
      password: 'password123'
    })

    await auth.signOut(session.token)

    const isValid = await auth.validateSession(session.token)
    expect(isValid).toBe(false)
  })
})
```

#### 4. Two-Factor Authentication Testing

Test scenarios for 2FA:

```typescript
describe('Two-Factor Authentication', () => {
  it('should require 2FA code after password verification', async () => {
    const user = await createTestUser({ twoFactorEnabled: true })

    const result = await auth.signIn({
      email: user.email,
      password: 'password123'
    })

    expect(result.requiresTwoFactor).toBe(true)
    expect(result.session).toBeUndefined()
  })

  it('should complete login with valid 2FA code', async () => {
    const user = await createTestUser({ twoFactorEnabled: true })

    // First step - password
    const firstStep = await auth.signIn({
      email: user.email,
      password: 'password123'
    })

    // Generate valid TOTP code
    const totpCode = generateTOTP(user.twoFactorSecret)

    // Second step - 2FA
    const result = await auth.verifyTwoFactor({
      userId: firstStep.userId,
      code: totpCode
    })

    expect(result.session).toBeDefined()
  })

  it('should reject invalid 2FA code', async () => {
    const user = await createTestUser({ twoFactorEnabled: true })

    const firstStep = await auth.signIn({
      email: user.email,
      password: 'password123'
    })

    await expect(
      auth.verifyTwoFactor({
        userId: firstStep.userId,
        code: '000000' // Invalid code
      })
    ).rejects.toThrow('Invalid 2FA code')
  })
})
```

#### 5. OAuth Provider Testing

```typescript
// __tests__/oauth.test.ts
import { describe, it, expect, vi } from 'vitest'

describe('OAuth Authentication', () => {
  it('should handle Google OAuth callback', async () => {
    // Mock the OAuth provider
    const mockGoogleProfile = {
      id: 'google-123',
      email: 'user@gmail.com',
      name: 'Google User',
      picture: 'https://example.com/avatar.jpg'
    }

    vi.mock('@/lib/oauth-providers', () => ({
      googleProvider: {
        getProfile: vi.fn().mockResolvedValue(mockGoogleProfile)
      }
    }))

    const result = await auth.handleOAuthCallback({
      provider: 'google',
      code: 'mock-auth-code'
    })

    expect(result.user.email).toBe('user@gmail.com')
    expect(result.session).toBeDefined()
  })
})
```

### Testing Best Practices for Authentication

1. **Test both happy and error paths**
   - Valid credentials → successful login
   - Invalid credentials → error message
   - Expired sessions → redirect to login
   - Missing permissions → 403 responses

2. **Test security edge cases**
   - SQL injection attempts
   - XSS attacks in user input
   - CSRF token validation
   - Rate limiting

3. **Test across different devices** (E2E)
   - Mobile browsers
   - Different OS versions
   - Network conditions (slow 3G, offline)

4. **Test session lifecycle**
   - Session creation
   - Session validation
   - Session renewal
   - Session expiration
   - Concurrent sessions

5. **Mock external providers in unit tests**
   - Don't make real OAuth calls
   - Use test credentials
   - Mock provider responses

### Sources

- [Better Auth](https://www.better-auth.com/)
- [Auth.js Testing Guide](https://authjs.dev/guides/testing)
- [Is Better Auth the key to solving authentication headaches?](https://blog.logrocket.com/better-auth-authentication/)

---

## 7. Playwright for Next.js Integration Testing

### Installation

```bash
npm install -D @playwright/test
npx playwright install
```

### Configuration: `playwright.config.ts`

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
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

### Testing Next.js App Router

#### Basic Page Test

```typescript
// e2e/dashboard.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Dashboard Page', () => {
  test('should display stream list', async ({ page }) => {
    await page.goto('/dashboard')

    // Wait for streams to load
    await page.waitForSelector('[data-testid="stream-card"]')

    const streamCards = await page.locator('[data-testid="stream-card"]')
    expect(await streamCards.count()).toBeGreaterThan(0)
  })

  test('should navigate to stream details', async ({ page }) => {
    await page.goto('/dashboard')

    // Click first stream card
    await page.locator('[data-testid="stream-card"]').first().click()

    // Verify navigation to stream details page
    await expect(page).toHaveURL(/\/dashboard\/streams\//)
    await expect(page.locator('h1')).toContainText('Stream Details')
  })
})
```

#### Testing React Server Components

For async Server Components, E2E testing is the recommended approach:

```typescript
// e2e/server-component.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Server Component Data Fetching', () => {
  test('should render server-fetched data', async ({ page }) => {
    await page.goto('/dashboard/streams/123')

    // Server component should render without loading state
    // (data is fetched on server)
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('[data-testid="viewer-count"]')).toContainText('viewers')
  })
})
```

#### Testing API Routes

```typescript
// e2e/api.spec.ts
import { test, expect } from '@playwright/test'

test.describe('API Routes', () => {
  test('GET /api/streams should return streams list', async ({ request }) => {
    const response = await request.get('/api/streams')

    expect(response.ok()).toBeTruthy()

    const data = await response.json()
    expect(Array.isArray(data.streams)).toBe(true)
  })

  test('POST /api/streams/add should add new stream', async ({ request }) => {
    const response = await request.post('/api/streams/add', {
      data: {
        platform: 'youtube',
        channelId: 'UCtest123'
      },
      headers: {
        'Content-Type': 'application/json'
      }
    })

    expect(response.ok()).toBeTruthy()

    const data = await response.json()
    expect(data.success).toBe(true)
  })
})
```

#### Component Testing with beforeMount Hook

For testing Next.js components in isolation:

```typescript
// playwright/index.ts (hooks file)
import { beforeMount } from '@playwright/experimental-ct-react/hooks'
import { useRouter } from 'next/router'

export type HooksConfig = {
  router?: {
    query?: Record<string, any>
    asPath?: string
    pathname?: string
  }
}

beforeMount<HooksConfig>(async ({ hooksConfig }) => {
  // Mock Next.js router
  if (hooksConfig?.router) {
    const mockRouter = {
      query: hooksConfig.router.query || {},
      asPath: hooksConfig.router.asPath || '/',
      pathname: hooksConfig.router.pathname || '/',
      push: vi.fn(),
      replace: vi.fn(),
      back: vi.fn()
    }

    // Inject mock router
    vi.mocked(useRouter).mockReturnValue(mockRouter as any)
  }
})
```

```typescript
// components/__tests__/StreamCard.spec.tsx
import { test, expect } from '@playwright/experimental-ct-react'
import type { HooksConfig } from '../playwright'
import { StreamCard } from '@/components/StreamCard'

test('should render with router context', async ({ mount }) => {
  const component = await mount<HooksConfig>(<StreamCard streamId="123" />, {
    hooksConfig: {
      router: {
        query: { id: '123' },
        asPath: '/streams/123'
      }
    }
  })

  await expect(component).toContainText('Stream 123')
})
```

### Testing Real-Time Features

```typescript
// e2e/realtime.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Real-Time Updates', () => {
  test('should show live viewer count updates', async ({ page }) => {
    await page.goto('/dashboard/streams/123')

    // Get initial viewer count
    const initialCount = await page.locator('[data-testid="viewer-count"]').textContent()

    // Wait for TanStack Query refetch interval (30 seconds)
    await page.waitForTimeout(31000)

    // Verify count may have changed
    const updatedCount = await page.locator('[data-testid="viewer-count"]').textContent()

    // Either count changed or stayed the same (both valid)
    expect(updatedCount).toBeDefined()
  })
})
```

### Visual Regression Testing

```typescript
// e2e/visual.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Visual Regression', () => {
  test('dashboard layout matches snapshot', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveScreenshot('dashboard.png', {
      fullPage: true,
      animations: 'disabled'
    })
  })
})
```

### Package.json Scripts

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:report": "playwright show-report"
  }
}
```

### Sources

- [Playwright Next.js Documentation](https://playwright.dev/)
- Context7 Documentation for Playwright

---

## 8. Recommended Testing Stack

Based on the research, here's the recommended testing stack for the Live Stream Monitor project:

```
┌─────────────────────────────────────────────────────────────┐
│  Complete Testing Stack for Live Stream Monitor             │
├─────────────────────────────────────────────────────────────┤
│  Unit Testing                                               │
│  ├─ Vitest                  (Fast, Vite-native)             │
│  ├─ React Testing Library   (Component testing)            │
│  └─ @electric-sql/pglite    (Database testing)             │
│                                                              │
│  Integration Testing                                        │
│  ├─ Vitest                  (API routes, services)          │
│  └─ PGlite                  (Database integration)          │
│                                                              │
│  E2E Testing                                                │
│  ├─ Playwright              (Full user flows)               │
│  └─ Playwright CT           (Component isolation)           │
│                                                              │
│  Real-Time Testing                                          │
│  └─ Playwright              (Polling, updates)              │
│                                                              │
│  Performance Testing                                        │
│  └─ Playwright              (Lighthouse integration)        │
└─────────────────────────────────────────────────────────────┘
```

### Installation Command

```bash
npm install -D \
  vitest @vitejs/plugin-react jsdom \
  @testing-library/react @testing-library/dom @testing-library/jest-dom \
  vite-tsconfig-paths \
  @electric-sql/pglite \
  @playwright/test \
  @playwright/experimental-ct-react
```

### Directory Structure

```
live-stream-monitor/
├── __tests__/              # Unit tests
│   ├── components/
│   ├── lib/
│   └── utils/
├── e2e/                    # E2E tests
│   ├── auth.spec.ts
│   ├── dashboard.spec.ts
│   └── streams.spec.ts
├── vitest.config.ts
├── vitest.setup.ts
└── playwright.config.ts
```

### Test Coverage Goals

| Area | Coverage Goal | Primary Tool |
|------|--------------|--------------|
| Utility functions | 100% | Vitest |
| Client components | 80%+ | Vitest + RTL |
| Server components (sync) | 60%+ | Vitest + RTL |
| Server components (async) | E2E only | Playwright |
| API routes | 90%+ | Vitest |
| Database operations | 90%+ | Vitest + PGlite |
| Critical user flows | 100% | Playwright |
| Auth flows | 100% | Playwright |

---

## Summary

This comprehensive research provides everything needed to implement a robust testing strategy for the Live Stream Monitor project. The combination of Vitest for fast unit tests, PGlite for database testing, and Playwright for E2E testing creates a complete testing ecosystem that handles all aspects of a modern Next.js 15 application with App Router and React Server Components.

Key takeaways:

1. **Use Vitest** for client components and synchronous server components
2. **Use Playwright** for async server components and full user flows
3. **Use PGlite** for fast, isolated database testing
4. **Configure TanStack Query** with appropriate refetch intervals for real-time updates
5. **Optimize Recharts** with debouncing, disabled animations, and brush components
6. **Secure Vercel cron jobs** with CRON_SECRET and proper authorization
7. **Test authentication thoroughly** with E2E tests and mocked providers

---

**Generated**: 2026-01-04
**Project**: Live Stream Monitor
**Framework**: Next.js 15 + React 19 + TypeScript
