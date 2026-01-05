# Phase 2 Completion + Comprehensive Testing Infrastructure

**Created:** 2026-01-04
**Status:** Ready for Implementation
**Priority:** P0 (Critical for production stability)
**Estimated Effort:** 3-4 weeks
**Dependencies:** Phase 1 complete ✅, Phase 2 CHART-001 to CHART-004 complete ✅

---

## Overview

This plan covers the completion of Phase 2 (CHART-005, CHART-006, INFRA-001) and the establishment of comprehensive testing infrastructure from ground zero. **The application currently has ZERO tests**, creating high regression risk as new features are added.

**Core Objectives:**
1. Implement LTTB downsampling to optimize 30-day chart performance (43,200 → 2,000 points)
2. Optimize real-time chart updates with TanStack Query
3. Enable Vercel Pro auto-polling for minute-level cron jobs
4. Build comprehensive test suite (unit, integration, E2E) for CI/CD stability
5. Establish GitHub Actions pipeline to prevent regressions

**Impact:**
- **Performance:** 30-day charts render in <2s (currently 5-10s with 43k points)
- **Reliability:** Automated polling replaces manual triggers (0 data gaps)
- **Quality:** Test coverage prevents bugs from reaching production
- **Developer Velocity:** CI/CD catches errors before merge, faster iteration

---

## Problem Statement

### Current State Analysis

**Phase 2 Status:**
- ✅ **CHART-001**: Recharts integration complete
- ✅ **CHART-002**: Time-series metrics API complete
- ✅ **CHART-003**: Interactive charts UI complete
- ✅ **CHART-004**: Change log timeline overlay complete
- 🟡 **CHART-005**: Downsampling NOT implemented (blocks CHART-006)
- 🔴 **CHART-006**: Real-time updates partially implemented (needs optimization)
- 🟡 **INFRA-001**: Vercel Pro upgrade pending (manual polling only)

**Critical Gaps:**

1. **Performance Issues:**
   - 30-day charts fetch **43,200 raw data points** (1 per minute × 30 days)
   - Browser struggles with Recharts rendering >5,000 points
   - Network payload: ~1MB+ JSON per chart view
   - Chart render time: 5-10 seconds on desktop, 15+ seconds on mobile

2. **No Testing Infrastructure:**
   ```bash
   $ find . -name "*.test.ts" -o -name "*.spec.ts"
   # 0 results

   $ cat vitest.config.ts
   # File does not exist

   $ cat .github/workflows/test.yml
   # File does not exist
   ```
   - **Test coverage: 0%**
   - No unit tests for business logic
   - No integration tests for API routes
   - No E2E tests for critical flows
   - No CI/CD to catch regressions

3. **Manual Polling Limitations:**
   - Vercel Hobby plan: Cron jobs disabled
   - Manual `curl` triggers required every minute
   - Data collection gaps during off-hours
   - No automated alerts for stream changes

**Risk Assessment:**
- **HIGH**: Adding CHART-005/006 without tests may break existing charts
- **HIGH**: Production app with 0 test coverage = regressions go undetected
- **MEDIUM**: 43,200 data points may freeze browsers on low-end devices
- **MEDIUM**: Manual polling creates inconsistent data (gaps/duplicates)

---

## Proposed Solution

### High-Level Approach

**Phase 2 Completion Strategy:**

1. **Testing-First Approach:**
   - Set up Vitest + Playwright BEFORE implementing new features
   - Write tests for existing features to prevent regressions
   - Use TDD (Test-Driven Development) for CHART-005/006
   - Establish CI/CD pipeline to run tests on every PR

2. **CHART-005: LTTB Downsampling:**
   - Implement Largest Triangle Three Buckets algorithm
   - Reduce 43,200 points → 2,000 points (21.6:1 ratio)
   - Preserve visual fidelity (peaks, troughs, trends)
   - Apply only to 30-day view (today/7d/14d use raw data)

3. **CHART-006: Real-Time Optimization:**
   - Refine TanStack Query refetchInterval configuration
   - Handle race conditions (time range switching mid-fetch)
   - Pause refresh during user interactions (tooltip hover)
   - Add visual indicators for data freshness

4. **INFRA-001: Vercel Pro Upgrade:**
   - Upgrade Vercel plan to enable cron jobs
   - Enable `/api/cron/poll-youtube` (every minute)
   - Enable `/api/cron/prune-data` (daily at midnight UTC)
   - Set up monitoring for cron execution health

**Testing Infrastructure Strategy:**

1. **Unit Tests (Vitest):**
   - Test LTTB algorithm correctness
   - Test auth helpers, date utilities, formatters
   - Test synchronous Server Components
   - Target: 80%+ coverage for `lib/` directory

2. **Integration Tests (Vitest + PGlite):**
   - Test API routes with in-memory PostgreSQL
   - Test database queries (Drizzle ORM)
   - Test YouTube API client (mock with MSW)
   - Target: 100% coverage for `app/api/` routes

3. **E2E Tests (Playwright):**
   - Test critical user flows (sign-up, add stream, view charts)
   - Test async Server Components
   - Test chart interactions (time range switching, tooltips)
   - Target: 10-15 critical scenarios

4. **CI/CD Pipeline (GitHub Actions):**
   - Run lint, type-check, tests on every PR
   - Run E2E tests on staging environment
   - Prevent merge if any tests fail
   - Automatic Vercel deployment on merge to master

---

## Technical Approach

### Architecture

**Downsampling Architecture:**

```
┌─────────────────────────────────────────────────────────────┐
│                       User Action                           │
│              (Clicks "30 Days" button)                      │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│             API: /api/streams/[id]/metrics                  │
│         Query: timeRange=30d (gte 30 days ago)              │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                PostgreSQL Query                             │
│   SELECT * FROM stream_metrics                              │
│   WHERE stream_id = $1 AND recorded_at >= $2                │
│   ORDER BY recorded_at ASC                                  │
│                                                             │
│   Result: 43,200 raw data points                           │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│          Client-Side Processing                             │
│        (components/stream-chart.tsx)                        │
│                                                             │
│   IF timeRange === '30d' AND data.length > 2000:           │
│     downsampled = downsample(data, 2000) // LTTB           │
│   ELSE:                                                     │
│     downsampled = data // Raw data                         │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                 Recharts Rendering                          │
│       <LineChart data={downsampled} />                      │
│                                                             │
│       Render time: <2 seconds                              │
└─────────────────────────────────────────────────────────────┘
```

**Auto-Refresh Architecture:**

```
┌─────────────────────────────────────────────────────────────┐
│                    Page Load                                │
│        /dashboard/streams/[id]                             │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│           TanStack Query Setup                              │
│                                                             │
│   const { data } = useQuery({                               │
│     queryKey: ['metrics', streamId, timeRange],            │
│     queryFn: fetchMetrics,                                 │
│     refetchInterval: getRefetchInterval(timeRange),        │
│     enabled: !isInteracting, // Pause on hover             │
│   });                                                       │
│                                                             │
│   function getRefetchInterval(range) {                      │
│     if (range === 'today') return 60000; // 60s            │
│     return false; // Disabled for historical views         │
│   }                                                         │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼ (every 60s if timeRange='today')
┌─────────────────────────────────────────────────────────────┐
│              Fetch New Metrics                              │
│         GET /api/streams/[id]/metrics?timeRange=today       │
│                                                             │
│         AbortController: Cancel if range changes           │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│            Update Chart Data                                │
│      React re-render with new data points                  │
│                                                             │
│      Animation: Smooth append to existing chart            │
└─────────────────────────────────────────────────────────────┘
```

**Testing Architecture:**

```
┌─────────────────────────────────────────────────────────────┐
│                  GitHub Pull Request                        │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│            GitHub Actions Workflow                          │
│              (.github/workflows/test.yml)                   │
│                                                             │
│   Jobs (run in parallel):                                   │
│   ┌───────────────────────────────────────────────┐        │
│   │  1. Lint & Type Check                         │        │
│   │     - ESLint (eslint.config.mjs)              │        │
│   │     - TypeScript (tsc --noEmit)               │        │
│   └───────────────────────────────────────────────┘        │
│   ┌───────────────────────────────────────────────┐        │
│   │  2. Unit + Integration Tests (Vitest)         │        │
│   │     - lib/ functions                          │        │
│   │     - API routes (with PGlite)                │        │
│   │     - Components (Testing Library)            │        │
│   │     - Coverage report → Codecov               │        │
│   └───────────────────────────────────────────────┘        │
│   ┌───────────────────────────────────────────────┐        │
│   │  3. E2E Tests (Playwright)                    │        │
│   │     - Chrome, Firefox, Mobile Safari          │        │
│   │     - Critical user flows                     │        │
│   │     - Screenshots on failure                  │        │
│   └───────────────────────────────────────────────┘        │
│   ┌───────────────────────────────────────────────┐        │
│   │  4. Build Test                                │        │
│   │     - npm run build                           │        │
│   │     - Verify no build errors                  │        │
│   └───────────────────────────────────────────────┘        │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼ (all jobs pass)
┌─────────────────────────────────────────────────────────────┐
│              Merge to master Branch                         │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│         Vercel Automatic Deployment                         │
│              (Production)                                   │
└─────────────────────────────────────────────────────────────┘
```

---

### Implementation Phases

#### Phase 1: Testing Foundation (Week 1)

**Goal:** Establish testing infrastructure and write tests for existing features

**Tasks:**

1. **Install Testing Dependencies**
   ```bash
   npm install -D \
     vitest@^2.0.0 \
     @vitest/ui@^2.0.0 \
     @vitejs/plugin-react@^4.3.0 \
     jsdom@^25.0.0 \
     @testing-library/react@^16.0.0 \
     @testing-library/dom@^10.4.0 \
     @testing-library/user-event@^14.5.0 \
     @testing-library/jest-dom@^6.6.3 \
     vite-tsconfig-paths@^5.1.4 \
     @electric-sql/pglite@^0.3.0 \
     @playwright/test@^1.50.0 \
     msw@^3.0.0
   ```

2. **Create Vitest Configuration**
   - File: `vitest.config.ts`
   - Configure React plugin for component tests
   - Set up jsdom environment
   - Configure path aliases (`@/`)
   - Enable coverage reporting (v8 provider)

3. **Create Playwright Configuration**
   - File: `playwright.config.ts`
   - Configure 3 browsers (Chrome, Firefox, Mobile Safari)
   - Set up dev server auto-start
   - Configure screenshot/video on failure
   - Set retry policy (2 retries in CI)

4. **Set Up Test Utilities**
   - File: `vitest.setup.ts`
   - Import `@testing-library/jest-dom/vitest`
   - Configure global test utilities
   - Set up MSW for API mocking

5. **Write Unit Tests for Existing Code**
   - `lib/youtube-client.ts` (extractVideoId, fetchStreamData)
   - `lib/auth-helpers.ts` (requireAuth, requireUserId)
   - `lib/utils.ts` (cn function)
   - Target: 60%+ coverage for lib/ directory

6. **Write Integration Tests for API Routes**
   - `app/api/dashboard/stats/route.ts`
   - `app/api/streams/[id]/metrics/route.ts`
   - `app/api/streams/[id]/changes/route.ts`
   - Use PGlite for in-memory PostgreSQL
   - Mock YouTube API with MSW

7. **Write Component Tests**
   - `components/add-stream-dialog.tsx`
   - `components/remove-stream-dialog.tsx`
   - `components/stream-chart.tsx` (existing, before downsampling)

8. **Set Up GitHub Actions CI/CD**
   - File: `.github/workflows/test.yml`
   - 4 parallel jobs: lint, unit tests, E2E, build
   - Upload coverage to Codecov
   - Require all checks to pass before merge

**Success Criteria:**
- ✅ All tests passing in CI
- ✅ >60% code coverage for existing code
- ✅ GitHub PR checks configured (no merge without passing tests)

**Files Created:**
- `vitest.config.ts`
- `playwright.config.ts`
- `vitest.setup.ts`
- `.github/workflows/test.yml`
- `lib/__tests__/youtube-client.test.ts`
- `lib/__tests__/auth-helpers.test.ts`
- `app/api/__tests__/dashboard-stats.test.ts`
- `components/__tests__/stream-chart.test.tsx`
- `e2e/authentication.spec.ts`
- `e2e/stream-management.spec.ts`

---

#### Phase 2: CHART-005 Implementation (Week 2)

**Goal:** Implement LTTB downsampling algorithm with comprehensive tests

**Tasks:**

1. **Write Unit Tests for Downsampling (TDD)**
   - File: `lib/__tests__/downsample.test.ts`
   - Test case: Preserve first and last points
   - Test case: Handle data.length < targetSize (no downsampling)
   - Test case: Correct output size (exactly 2000 points)
   - Test case: Handle null/undefined values gracefully
   - Test case: Performance (<100ms for 43,200 points)
   - Test case: Visual accuracy (peak preservation)

2. **Implement LTTB Downsampling Algorithm**
   - File: `lib/downsample.ts`
   - Use `@seanvelasco/lttb` package (TypeScript-native)
   - Fallback to decimation if LTTB fails
   - Add error logging for debugging
   - Export `downsample()` and `calculateTriangleArea()` functions

3. **Integrate Downsampling into StreamChart**
   - File: `components/stream-chart.tsx` (modify lines 28-159)
   - Apply downsampling only when `timeRange === '30d'`
   - Use `useMemo` to cache downsampled results
   - Invalidate cache when raw data changes
   - Add loading state during downsampling (>1s)

4. **Update API Response (Optional Server-Side Downsampling)**
   - File: `app/api/streams/[id]/metrics/route.ts`
   - Add query param: `?downsample=true&targetPoints=2000`
   - Server-side downsampling reduces network payload
   - Client-side fallback if param not supported

5. **Write Integration Tests**
   - Test: 30-day API returns 43,200 points
   - Test: Client downsamples to 2000 points
   - Test: Chart renders in <2s with downsampled data
   - Test: Switching from 30d to 7d uses raw data

6. **Write E2E Tests**
   - File: `e2e/chart-downsampling.spec.ts`
   - Test: Navigate to stream detail page → 30 Days tab
   - Test: Verify chart renders (wait for `.recharts-wrapper`)
   - Test: Performance check (renderTime <2000ms)
   - Test: Tooltip hover works after downsampling
   - Test: Change markers visible on downsampled chart

7. **Visual Regression Testing (Optional)**
   - Capture screenshot of raw data chart (7d view)
   - Capture screenshot of downsampled chart (30d view)
   - Use Playwright visual comparison API
   - Verify trends are visually similar (no major deviations)

**Success Criteria:**
- ✅ All downsampling tests pass (unit + integration + E2E)
- ✅ 30-day chart renders in <2 seconds on desktop
- ✅ Downsampled chart visually matches raw data trends
- ✅ No regressions in other time ranges (today, 7d, 14d)

**Files Created/Modified:**
- `lib/downsample.ts` (NEW)
- `lib/__tests__/downsample.test.ts` (NEW)
- `components/stream-chart.tsx` (MODIFIED)
- `components/__tests__/stream-chart.test.tsx` (MODIFIED)
- `e2e/chart-downsampling.spec.ts` (NEW)

---

#### Phase 3: CHART-006 Optimization (Week 2-3)

**Goal:** Optimize real-time chart updates with race condition handling

**Tasks:**

1. **Write Tests for Auto-Refresh Logic (TDD)**
   - File: `app/dashboard/streams/[id]/__tests__/page.test.tsx`
   - Test: refetchInterval=60000 when timeRange='today'
   - Test: refetchInterval=false when timeRange='30d'
   - Test: Cancel in-flight request when range changes
   - Test: Pause refresh when chart is interacting (hover)
   - Test: Resume refresh when interaction ends

2. **Implement Interaction-Based Pausing**
   - File: `app/dashboard/streams/[id]/page.tsx`
   - Add state: `const [isInteracting, setIsInteracting] = useState(false)`
   - Set `isInteracting=true` on chart `onMouseEnter`
   - Set `isInteracting=false` on chart `onMouseLeave`
   - Disable refetchInterval when `isInteracting=true`

3. **Implement Request Cancellation**
   - Modify query to pass `AbortSignal` to fetch
   - TanStack Query auto-cancels on queryKey change
   - Add logging for cancelled requests (debugging)

4. **Add Data Freshness Indicator**
   - Show "Last updated: X seconds ago" badge
   - Use `date-fns` `formatDistanceToNow()`
   - Update badge every 5 seconds (separate interval)
   - Turn yellow after 90s (warning: stale data)

5. **Optimize Chart Re-Render Performance**
   - Memoize chart components: `const MemoizedLineChart = React.memo(LineChart)`
   - Use `useMemo` for expensive data transformations
   - Debounce rapid updates (300ms)
   - Test memory usage after 100+ refresh cycles

6. **Write Integration Tests**
   - Test: Fetch metrics for 'today' range
   - Test: Wait 61 seconds, verify new data fetched
   - Test: Switch range mid-refresh, verify cancellation
   - Test: Hover tooltip, verify refresh paused

7. **Write E2E Tests**
   - File: `e2e/chart-auto-refresh.spec.ts`
   - Test: Open stream detail → Today tab → Wait 61s → Verify chart updated
   - Test: Switch from Today to 30d mid-refresh → No errors
   - Test: Hover tooltip → Verify refresh paused → Mouse leave → Verify resumed

**Success Criteria:**
- ✅ Auto-refresh works reliably every 60s for 'today' view
- ✅ No race conditions when switching time ranges
- ✅ Chart interactions (hover) pause refresh
- ✅ No memory leaks after 1 hour of continuous refresh
- ✅ All tests pass

**Files Created/Modified:**
- `app/dashboard/streams/[id]/page.tsx` (MODIFIED)
- `app/dashboard/streams/[id]/__tests__/page.test.tsx` (NEW)
- `components/data-freshness-badge.tsx` (NEW)
- `e2e/chart-auto-refresh.spec.ts` (NEW)

---

#### Phase 4: INFRA-001 Vercel Pro Upgrade (Week 3)

**Goal:** Enable automated cron jobs for continuous data collection

**Tasks:**

1. **Pre-Upgrade Preparation**
   - Audit current manual polling frequency (identify gaps)
   - Document expected metrics collection rate (streams × frequency)
   - Set up monitoring dashboard for cron health
   - Create rollback plan if cron fails

2. **Implement Cron Monitoring Endpoint**
   - File: `app/api/health/cron-status/route.ts` (NEW)
   - Query `stream_metrics` for most recent insertion timestamp
   - Calculate time since last poll (in minutes)
   - Return status: `healthy` (< 5 min), `degraded` (5-15 min), `unhealthy` (> 15 min)
   - Public endpoint (no auth) for external monitoring

3. **Set Up External Health Check**
   - Register with UptimeRobot (free tier)
   - Configure HTTP check: `GET https://live-stream-monitor.vercel.app/api/health/cron-status`
   - Check interval: 5 minutes
   - Alert channel: Email to admin
   - Expected response: `{"status": "healthy", "lastPoll": "2026-01-04T12:34:56Z"}`

4. **Upgrade Vercel Plan**
   - Navigate to Vercel dashboard → Project Settings → Upgrade
   - Select **Pro plan** ($20/month)
   - Confirm payment method
   - Wait for upgrade confirmation email

5. **Update vercel.json Configuration**
   - File: `vercel.json` (MODIFIED)
   - Add cron jobs:
     ```json
     {
       "crons": [
         {
           "path": "/api/cron/poll-youtube",
           "schedule": "* * * * *"
         },
         {
           "path": "/api/cron/prune-data",
           "schedule": "0 0 * * *"
         }
       ]
     }
     ```

6. **Deploy to Production**
   - Commit changes: `git commit -m "feat(infra): enable Vercel cron jobs (INFRA-001)"`
   - Push to master: `git push origin master`
   - Vercel auto-deploys with cron enabled
   - Verify deployment success in Vercel dashboard

7. **Monitor First 24 Hours**
   - Check Vercel logs for cron executions (every minute)
   - Verify stream_metrics table receives 1,440 polls/day × N streams
   - Check for timeout errors (should be <1% failure rate)
   - Monitor YouTube API quota usage (should stay <10,000/day)
   - Verify UptimeRobot reports `healthy` status

8. **Write Cron Health Tests**
   - File: `app/api/health/__tests__/cron-status.test.ts`
   - Test: Returns `healthy` when last poll <5 min ago
   - Test: Returns `degraded` when last poll 5-15 min ago
   - Test: Returns `unhealthy` when last poll >15 min ago
   - Test: Handles database connection errors gracefully

9. **Create Runbook for Cron Failures**
   - File: `docs/runbooks/cron-failure-recovery.md` (NEW)
   - Document symptoms (UptimeRobot alert, empty metrics)
   - Document diagnosis steps (check Vercel logs, DB connection)
   - Document recovery steps (manual trigger, restart cron, rollback)
   - Document escalation path (contact Vercel support)

**Success Criteria:**
- ✅ Vercel Pro plan active
- ✅ Cron jobs executing every minute (verified in logs)
- ✅ 0 data gaps compared to manual polling baseline
- ✅ UptimeRobot reports `healthy` status 24/7
- ✅ YouTube API quota <10,000/day (well within limit)
- ✅ Runbook tested with manual cron trigger

**Files Created/Modified:**
- `vercel.json` (MODIFIED)
- `app/api/health/cron-status/route.ts` (NEW)
- `app/api/health/__tests__/cron-status.test.ts` (NEW)
- `docs/runbooks/cron-failure-recovery.md` (NEW)

---

#### Phase 5: Testing Hardening (Week 4)

**Goal:** Achieve 80%+ code coverage and comprehensive E2E scenarios

**Tasks:**

1. **Expand Unit Test Coverage**
   - `lib/youtube-poller.ts` (pollYouTubeMetrics, metadata change detection)
   - `lib/stream-service.ts` (addStreamForUser, removeStreamForUser)
   - `db/schema.ts` (Drizzle schema validation)
   - Target: 80%+ coverage for all `lib/` files

2. **Write API Route Tests for All Endpoints**
   - `app/api/streams/add/route.ts` (stream deduplication)
   - `app/api/streams/remove/route.ts` (authorization checks)
   - `app/api/cron/poll-youtube/route.ts` (CRON_SECRET validation, timeout handling)
   - `app/api/cron/prune-data/route.ts` (30-day deletion, audit logging)

3. **Write Component Tests for All UI**
   - `components/ui/dialog.tsx` (shadcn/ui)
   - `components/providers/query-provider.tsx`
   - `app/dashboard/page.tsx` (stream cards, empty state)

4. **Write E2E Tests for Critical Flows**
   - File: `e2e/complete-user-journey.spec.ts`
   - Flow: Sign up → Add stream → View dashboard → Open chart → Switch time range → Remove stream
   - Flow: Auto-refresh during live stream monitoring (61s wait)
   - Flow: Downsampling on 30-day chart with 50k+ data points

5. **Add Performance Tests**
   - File: `e2e/performance.spec.ts`
   - Test: 30-day chart renders in <2s (desktop)
   - Test: 30-day chart renders in <5s (mobile emulation)
   - Test: Dashboard with 10 streams loads in <3s
   - Test: API route responds in <500ms (95th percentile)

6. **Add Accessibility Tests**
   - Use Playwright's built-in accessibility scanner
   - Test: All interactive elements have ARIA labels
   - Test: Keyboard navigation works (Tab, Enter, Esc)
   - Test: Screen reader announcements for chart updates

7. **Add Visual Regression Tests**
   - File: `e2e/visual-regression.spec.ts`
   - Capture screenshots of dashboard, stream detail, charts
   - Compare against baseline screenshots (stored in `e2e/snapshots/`)
   - Fail if visual diff >5% (requires manual review)

8. **Configure Coverage Thresholds**
   - File: `vitest.config.ts` (MODIFIED)
   - Set minimum coverage: 80% statements, 75% branches
   - Fail CI if coverage drops below threshold
   - Exclude: `*.config.ts`, `*.d.ts`, `node_modules/`

**Success Criteria:**
- ✅ 80%+ code coverage (statements)
- ✅ 100% coverage for API routes
- ✅ All critical user flows tested with E2E
- ✅ Performance benchmarks met (<2s for 30d chart)
- ✅ Accessibility score >90 (Lighthouse/axe)
- ✅ Visual regression baseline established

**Files Created:**
- `lib/__tests__/youtube-poller.test.ts`
- `lib/__tests__/stream-service.test.ts`
- `app/api/__tests__/*.test.ts` (all routes)
- `e2e/complete-user-journey.spec.ts`
- `e2e/performance.spec.ts`
- `e2e/visual-regression.spec.ts`
- `e2e/snapshots/` (baseline screenshots)

---

## Alternative Approaches Considered

### Alternative 1: Server-Side Downsampling

**Approach:** Downsample data in API route before sending to client

**Pros:**
- Reduces network payload (send 2000 points instead of 43,200)
- Offloads CPU work to Vercel serverless (more powerful than client devices)
- Consistent downsampling across all clients (no variation)

**Cons:**
- Increases API route execution time (may approach 10s timeout on Vercel Hobby)
- No caching (every request recalculates)
- Harder to debug (algorithm runs server-side, less visibility)

**Decision:** Rejected - Client-side downsampling with `useMemo` caching is faster and more flexible. API can still add optional `?downsample=true` param for mobile clients.

---

### Alternative 2: Pre-Computed Downsampled Data in Database

**Approach:** Create `stream_metrics_downsampled` table with pre-downsampled data

**Pros:**
- Instant query response (no runtime downsampling)
- Consistent performance (predictable latency)
- Reduced CPU usage (one-time computation)

**Cons:**
- Requires background job to recompute on new data insertion
- Storage cost (2x data: raw + downsampled)
- Complexity (2 tables to maintain, sync issues)
- Inflexible (what if user wants different target sizes?)

**Decision:** Rejected - Premature optimization. Client-side downsampling is fast enough (<100ms). Consider this approach only if >100k data points per stream.

---

### Alternative 3: Vitest vs. Jest for Testing

**Approach:** Use Jest instead of Vitest

**Pros:**
- More mature ecosystem (10+ years)
- Better documentation and StackOverflow answers
- Familiar to most developers

**Cons:**
- Slow (10x slower than Vitest per benchmarks)
- Poor ESM support (Next.js 15 uses ESM by default)
- Requires complex configuration for Next.js App Router
- No built-in UI for test debugging

**Decision:** Rejected - Vitest is the modern standard for Next.js testing in 2026. Official Next.js docs recommend Vitest. Speed matters for CI/CD (fast feedback loop).

---

### Alternative 4: Cypress vs. Playwright for E2E

**Approach:** Use Cypress instead of Playwright

**Pros:**
- Developer-friendly API
- Time-travel debugging
- Automatic waiting for elements

**Cons:**
- Slower than Playwright (single browser at a time)
- No multi-tab/multi-window support
- Worse TypeScript support
- Requires extra setup for Next.js

**Decision:** Rejected - Playwright is faster (parallel browsers), has better TypeScript support, and is officially recommended by Next.js team. Playwright also supports component testing.

---

## Acceptance Criteria

### Functional Requirements

**CHART-005: Downsampling**
- [ ] 30-day chart fetches 43,200 data points from API
- [ ] Client-side downsampling reduces to exactly 2,000 points
- [ ] First and last data points are always included (no time range truncation)
- [ ] Peak viewer counts are preserved (all local maxima included)
- [ ] Downsampling completes in <100ms for 43,200 points
- [ ] Chart renders in <2 seconds on desktop, <5 seconds on mobile
- [ ] Downsampling only applied when `timeRange === '30d'`
- [ ] Other time ranges (today, 7d, 14d) use raw data (no downsampling)
- [ ] Downsampled chart visually matches raw data trends (manual QA verification)

**CHART-006: Real-Time Updates**
- [ ] Auto-refresh enabled only for `timeRange === 'today'`
- [ ] Refresh interval is exactly 60 seconds (measured with performance.now())
- [ ] In-flight requests are cancelled when time range changes (no race conditions)
- [ ] Auto-refresh pauses when user hovers tooltip (isInteracting=true)
- [ ] Auto-refresh resumes when user stops interacting (onMouseLeave)
- [ ] Data freshness badge shows "Last updated: X seconds ago"
- [ ] Badge turns yellow after 90 seconds (stale data warning)
- [ ] Chart updates smoothly (no flicker, no layout shift)

**INFRA-001: Vercel Pro Upgrade**
- [ ] Vercel Pro plan active (verified in dashboard)
- [ ] Cron job executes every minute (1,440 executions per day)
- [ ] Prune-data cron executes daily at 00:00 UTC
- [ ] CRON_SECRET validation rejects unauthorized requests (401 Unauthorized)
- [ ] YouTube API quota stays under 10,000 units/day (<100% usage)
- [ ] 0 data gaps in `stream_metrics` table (verified with query)
- [ ] UptimeRobot reports `healthy` status 24/7
- [ ] Health check endpoint responds in <500ms

### Non-Functional Requirements

**Performance**
- [ ] 30-day chart renders in <2 seconds on desktop (Chrome, Intel i5)
- [ ] 30-day chart renders in <5 seconds on mobile (iPhone 14 emulation)
- [ ] API route `/api/streams/[id]/metrics?timeRange=30d` responds in <500ms (p95)
- [ ] Downsampling algorithm completes in <100ms for 43,200 points
- [ ] Auto-refresh consumes <10MB additional memory over 1 hour
- [ ] No memory leaks (heap stable after 100+ refresh cycles)

**Testing**
- [ ] 80%+ code coverage (statements)
- [ ] 100% coverage for API routes
- [ ] 100% coverage for `lib/downsample.ts`
- [ ] All critical user flows tested with E2E (sign-up, add stream, charts)
- [ ] 10+ E2E scenarios covering edge cases
- [ ] Performance tests validate <2s chart render time
- [ ] Visual regression tests prevent UI regressions

**CI/CD**
- [ ] GitHub Actions workflow runs on every PR
- [ ] All tests must pass before merge allowed
- [ ] Coverage report uploaded to Codecov
- [ ] Lint + type-check must pass
- [ ] Build succeeds without errors/warnings
- [ ] E2E tests run in 3 browsers (Chrome, Firefox, Safari)

### Quality Gates

**Code Quality**
- [ ] ESLint: 0 errors, 0 warnings
- [ ] TypeScript: 0 type errors (strict mode)
- [ ] All functions have JSDoc comments
- [ ] All tests have descriptive names (BDD-style: "should...")

**Testing Quality**
- [ ] All tests use `arrange-act-assert` pattern
- [ ] No magic numbers (use named constants)
- [ ] No flaky tests (100% pass rate over 10 runs)
- [ ] All E2E tests have screenshots on failure

**Documentation**
- [ ] TESTING.md created with test strategy
- [ ] All new functions have JSDoc comments
- [ ] DECISIONS.md documents architecture choices
- [ ] Runbook created for cron failure recovery

---

## Success Metrics

### Key Performance Indicators (KPIs)

**Performance:**
- 30-day chart render time: **<2 seconds** (target), currently 5-10s
- API response time (p95): **<500ms**, currently 1-2s
- Network payload for 30d chart: **<200KB** (downsampled), currently ~1MB

**Reliability:**
- Data collection uptime: **99.9%** (max 1.4 hours downtime/month)
- Cron execution success rate: **>99%** (max 14 failed polls/day)
- Test pass rate in CI: **100%** (0 flaky tests)

**Code Quality:**
- Test coverage: **>80%** statements, **>75%** branches
- TypeScript type errors: **0**
- ESLint errors/warnings: **0**

**User Experience:**
- Chart interaction latency: **<100ms** (tooltip hover, zoom)
- Auto-refresh staleness: **<90 seconds** (yellow warning threshold)
- Mobile chart usability: **Lighthouse Performance score >80**

### Measurement Methods

**Performance Monitoring:**
- Use `performance.now()` in E2E tests to measure render time
- Add Vercel Analytics for real-user monitoring (RUM)
- Set up Sentry for error tracking and performance insights
- Query Vercel logs for API response times (p50, p95, p99)

**Reliability Monitoring:**
- UptimeRobot pings `/api/health/cron-status` every 5 minutes
- Query `stream_metrics` table for data gap detection
- GitHub Actions stores test results history
- Set up Vercel alerts for cron job failures

**Code Quality Monitoring:**
- Codecov integration for coverage tracking (trend over time)
- GitHub Actions enforces coverage thresholds (fail if <80%)
- TypeScript compiler runs in CI (`tsc --noEmit`)
- ESLint runs in CI with `--max-warnings 0`

---

## Dependencies & Prerequisites

### External Dependencies

**Services:**
- Vercel Pro plan ($20/month) - Required for minute-level cron jobs
- Codecov (free tier) - Optional for coverage reporting
- UptimeRobot (free tier) - Optional for health monitoring

**APIs:**
- YouTube Data API v3 - Existing (quota: 10,000 units/day)
- Vercel Postgres - Existing (database)

### Internal Dependencies

**Must be Complete:**
- ✅ Phase 1 complete (all tasks)
- ✅ CHART-001 to CHART-004 complete
- ✅ Database schema finalized (no migrations pending)
- ✅ Authentication system working (Better Auth)

**Technical Prerequisites:**
- Node.js 20+ installed
- npm or pnpm package manager
- Git configured with GitHub
- Access to Vercel dashboard (admin role)
- Access to YouTube API key
- Access to production database (DATABASE_URL)

### Team Prerequisites

**Skills Required:**
- TypeScript (intermediate level)
- Next.js 15+ App Router (intermediate)
- Testing (Vitest, Playwright, Testing Library)
- SQL/PostgreSQL (basic level)
- CI/CD (GitHub Actions, basic level)

**Time Commitment:**
- 1 developer × 3-4 weeks full-time
- OR 2 developers × 2 weeks full-time (parallel work)

---

## Risk Analysis & Mitigation

### High-Risk Issues

**Risk 1: LTTB Algorithm Introduces Visual Artifacts**
- **Impact:** Users see misleading trends (missed peaks, smoothed spikes)
- **Probability:** Medium (30%)
- **Mitigation:**
  - Write visual accuracy tests (compare raw vs downsampled charts)
  - Manual QA review of 10+ real-world streams
  - Fallback to decimation if LTTB fails
  - Allow users to toggle between raw/downsampled views (advanced setting)

**Risk 2: Auto-Refresh Memory Leaks**
- **Impact:** Browser crashes after hours of continuous monitoring
- **Probability:** Medium (20%)
- **Mitigation:**
  - Write memory leak tests (100+ refresh cycles)
  - Use React DevTools Profiler to detect leaks
  - Add `useEffect` cleanup for all event listeners
  - Set max refresh count (stop after 1,000 iterations, reload page)

**Risk 3: Cron Jobs Fail Silently**
- **Impact:** Days of missing data before detection
- **Probability:** Low (10%) but **HIGH IMPACT**
- **Mitigation:**
  - Set up UptimeRobot health checks (5-minute interval)
  - Email alerts to admin on unhealthy status
  - Create runbook for manual recovery
  - Test cron failure scenarios in staging

### Medium-Risk Issues

**Risk 4: Test Suite Takes Too Long (>10 minutes)**
- **Impact:** Slow CI/CD feedback loop, developers skip tests
- **Probability:** Medium (30%)
- **Mitigation:**
  - Run tests in parallel (4 jobs in GitHub Actions)
  - Use Vitest's built-in parallelization
  - Cache npm dependencies in CI
  - Skip E2E tests for draft PRs (run only on ready-for-review)

**Risk 5: Downsampling Performance Varies by Device**
- **Impact:** Low-end devices still freeze (<100ms on M2, 3s on Android)
- **Probability:** Medium (25%)
- **Mitigation:**
  - Test on emulated slow CPU (Playwright 6x throttling)
  - Add loading spinner if downsampling >1s
  - Consider WebWorker for downsampling on slow devices
  - Fallback to server-side downsampling via query param

**Risk 6: YouTube API Quota Exceeded**
- **Impact:** Auto-polling stops during peak hours, data gaps
- **Probability:** Low (15%)
- **Mitigation:**
  - Monitor quota usage daily (add alert at 80%)
  - Implement ETag caching (save 50% quota on unchanged streams)
  - Reduce polling frequency for offline streams (every 5 min vs 1 min)
  - Request quota increase from Google (up to 100,000/day)

### Low-Risk Issues

**Risk 7: Flaky E2E Tests**
- **Impact:** CI randomly fails, frustration, delays
- **Probability:** Medium (40% probability, low impact)
- **Mitigation:**
  - Use Playwright's built-in retry mechanism (2 retries in CI)
  - Add explicit waits (`waitForSelector`) instead of `setTimeout`
  - Use `data-testid` attributes for stable selectors
  - Run tests locally 10 times to detect flakiness before merge

**Risk 8: Coverage Threshold Too Aggressive**
- **Impact:** Unable to meet 80% coverage, CI always fails
- **Probability:** Low (10%)
- **Mitigation:**
  - Start with 60% threshold, increase gradually
  - Exclude generated files (migrations, `.next/`)
  - Focus on high-value code (business logic, API routes)
  - Allow temporary coverage dip if new feature is experimental

---

## Resource Requirements

### Infrastructure

**Development:**
- GitHub repository (existing)
- Local development environment (Node.js 20+, PostgreSQL)
- Vercel preview environments (automatic on PR)

**Production:**
- Vercel Pro plan ($20/month) - **NEW COST**
- Vercel Postgres (current plan: Hobby, $0/month)
- YouTube Data API quota (free tier: 10,000 units/day)

**Testing:**
- GitHub Actions minutes (2,000 free/month on Team plan)
- Codecov (free tier: unlimited public repos)
- UptimeRobot (free tier: 50 monitors)

**Total Additional Cost:** $20/month (Vercel Pro only)

### Time Estimates

**By Phase:**
- Phase 1 (Testing Foundation): 40 hours (1 week)
- Phase 2 (CHART-005): 40 hours (1 week)
- Phase 3 (CHART-006): 20 hours (0.5 week)
- Phase 4 (INFRA-001): 20 hours (0.5 week)
- Phase 5 (Testing Hardening): 40 hours (1 week)

**Total:** 160 hours = 4 weeks (1 developer full-time)

**Parallel Work (2 developers):**
- Developer 1: Phases 1, 2 (Testing + CHART-005)
- Developer 2: Phases 3, 4, 5 (CHART-006 + INFRA-001 + Hardening)
- Total time: 2 weeks with 2 developers

### Tooling

**Required:**
- Vitest (unit/integration testing)
- Playwright (E2E testing)
- Testing Library (component testing)
- MSW (API mocking)
- PGlite (in-memory PostgreSQL)

**Optional:**
- Codecov (coverage reporting)
- UptimeRobot (health monitoring)
- Sentry (error tracking)

---

## Future Considerations

### Extensibility

**Post-Launch Enhancements:**
1. **Configurable Downsampling Target**
   - Allow users to choose resolution (1000, 2000, 5000 points)
   - Mobile users default to 1000, desktop to 5000
   - Store preference in `user_settings` table

2. **Server-Side Downsampling for Mobile**
   - Add query param: `?downsample=true&targetPoints=1000`
   - Reduce network payload for mobile clients
   - Cache downsampled results in Redis (TTL: 60s)

3. **Real-Time WebSocket Updates**
   - Replace 60s polling with WebSocket connection
   - Push new data points to client as they're collected
   - Reduce latency from 60s to <5s

4. **Advanced Auto-Refresh Settings**
   - Customizable refresh intervals (15s, 30s, 60s, 120s)
   - Per-stream refresh settings (high-priority streams: 15s)
   - Auto-pause refresh during low battery mode (mobile)

### Technical Debt Prevention

**Avoid These Pitfalls:**
1. **Don't skip tests for "quick fixes"** - All code changes require tests
2. **Don't hardcode magic numbers** - Use named constants (DOWNSAMPLE_TARGET = 2000)
3. **Don't ignore flaky tests** - Fix or delete, don't skip
4. **Don't let coverage drop** - Enforce thresholds in CI

**Code Quality Maintenance:**
- Run `npm audit` weekly for security vulnerabilities
- Update dependencies monthly (breaking changes in minor releases)
- Review test coverage trends in Codecov (catch coverage drift)
- Schedule quarterly performance audit (Lighthouse, WebPageTest)

---

## Documentation Plan

### Documents to Create

**1. TESTING.md**
- Testing strategy overview (unit, integration, E2E)
- How to run tests locally (`npm run test`, `npm run test:e2e`)
- How to write new tests (examples, patterns)
- Debugging flaky tests guide
- Coverage requirements and how to check

**2. DECISIONS.md**
- Why LTTB over decimation/averaging
- Why Vitest over Jest
- Why Playwright over Cypress
- Why client-side downsampling over server-side
- Why 2,000 points target (not 1,000 or 5,000)

**3. docs/runbooks/cron-failure-recovery.md**
- Symptoms of cron failure (UptimeRobot alert, missing data)
- Diagnosis steps (check Vercel logs, DB query)
- Recovery steps (manual trigger, redeploy, contact support)
- Escalation path (who to contact, when)

**4. API.md**
- Document all API routes (path, method, auth, params, response)
- Include examples (curl, fetch)
- Document caching behavior (Cache-Control headers)
- Document rate limits (if any)

### Documents to Update

**1. README.md**
- Add testing section (how to run tests)
- Add deployment section (Vercel Pro requirements)
- Add monitoring section (UptimeRobot, Codecov)
- Update tech stack (add Vitest, Playwright)

**2. todos.md**
- Mark CHART-005, CHART-006, INFRA-001 as ✅ Completed
- Update "Last Updated" timestamp
- Update Phase 2 status to "✅ Complete"
- Add new tasks if discovered during implementation

**3. .env.example**
- Add `CODECOV_TOKEN` (optional)
- Add `UPTIME_ROBOT_API_KEY` (optional)
- Document Vercel Pro requirement for cron jobs

---

## References & Research

### Internal References

**Architecture Decisions:**
- `plans/youtube-live-stream-monitor-mvp.md` (lines 686-714: LTTB algorithm)
- `todos.md` (lines 369-512: Phase 2 tasks)
- `CLAUDE.md` (lines 1-200: Project conventions)

**Similar Implementations:**
- `components/stream-chart.tsx` (existing chart component)
- `app/api/streams/[id]/metrics/route.ts` (metrics API)
- `app/dashboard/streams/[id]/page.tsx` (auto-refresh logic)

**Database Schema:**
- `db/schema.ts` (lines 1-300: stream_metrics table definition)
- `drizzle.config.ts` (Drizzle ORM configuration)

### External References

**LTTB Algorithm:**
- [Largest Triangle Three Buckets - GitHub](https://github.com/seanvelasco/lttb)
- [Sift Science: Downsampling Time Series](https://sift.com/blog/downsampling-time-series-algorithms)
- [Original Paper by Sveinn Steinarsson](https://skemman.is/bitstream/1946/15343/3/SS_MSthesis.pdf)

**Testing Frameworks:**
- [Next.js Testing: Vitest](https://nextjs.org/docs/app/guides/testing/vitest)
- [Playwright for Next.js](https://playwright.dev/docs/intro)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [PGlite Documentation](https://pglite.dev/)

**TanStack Query:**
- [TanStack Query v5: refetchInterval](https://tanstack.com/query/latest/docs/framework/react/guides/window-focus-refetching)
- [TanStack Query v5: Cancellation](https://tanstack.com/query/latest/docs/framework/react/guides/query-cancellation)

**Vercel:**
- [Vercel Cron Jobs Documentation](https://vercel.com/docs/cron-jobs)
- [Vercel Pro Plan Features](https://vercel.com/docs/limits/overview)

### Related Work

**Similar Projects:**
- [Recharts Performance Optimization](https://recharts.org/en-US/guide/performance)
- [Next.js Testing Examples](https://github.com/vercel/next.js/tree/canary/examples/with-vitest)

---

## Appendix

### A. Code Examples

**LTTB Downsampling Function:**

```typescript
// lib/downsample.ts
import lttb from '@seanvelasco/lttb';

export interface DataPoint {
  timestamp: string;
  viewers: number;
  likes: number;
  views: number;
}

/**
 * Downsample time-series data using LTTB algorithm
 * @param data - Raw data points (e.g., 43,200 points for 30 days)
 * @param targetSize - Target number of points (default: 2000)
 * @returns Downsampled data preserving visual fidelity
 */
export function downsample(
  data: DataPoint[],
  targetSize: number = 2000
): DataPoint[] {
  // No downsampling needed if data is already small
  if (data.length <= targetSize) {
    return data;
  }

  try {
    // Transform to LTTB format: [x, y] pairs
    const lttbInput = data.map((point, index) => [
      index, // x-axis: index (time is implicit)
      point.viewers, // y-axis: metric value
    ]);

    // Run LTTB algorithm
    const downsampled = lttb(lttbInput, targetSize);

    // Map back to original DataPoint format
    return downsampled.map(([index]) => data[index]);
  } catch (error) {
    console.error('Downsampling failed, falling back to decimation:', error);

    // Fallback: Simple decimation (every Nth point)
    const step = Math.floor(data.length / targetSize);
    return data.filter((_, index) => index % step === 0);
  }
}
```

**StreamChart with Downsampling:**

```typescript
// components/stream-chart.tsx (modified)
import { useMemo } from 'react';
import { downsample } from '@/lib/downsample';

interface StreamChartProps {
  data: DataPoint[];
  metric: 'viewers' | 'likes' | 'views';
  timeRange: 'today' | '7d' | '14d' | '30d';
}

export function StreamChart({ data, metric, timeRange }: StreamChartProps) {
  // Apply downsampling only for 30-day view
  const chartData = useMemo(() => {
    if (timeRange === '30d' && data.length > 2000) {
      console.log(`Downsampling ${data.length} points to 2000`);
      return downsample(data, 2000);
    }
    return data;
  }, [data, timeRange]);

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={chartData}>
        <XAxis dataKey="timestamp" tickFormatter={formatTimestamp} />
        <YAxis />
        <Tooltip content={<CustomTooltip />} />
        <Line type="monotone" dataKey={metric} stroke="#3b82f6" dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

**Auto-Refresh with Interaction Pausing:**

```typescript
// app/dashboard/streams/[id]/page.tsx (modified)
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

export default function StreamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [timeRange, setTimeRange] = useState<'today' | '7d' | '14d' | '30d'>('today');
  const [isInteracting, setIsInteracting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['metrics', id, timeRange],
    queryFn: async ({ signal }) => {
      const res = await fetch(`/api/streams/${id}/metrics?timeRange=${timeRange}`, { signal });
      return res.json();
    },
    refetchInterval: timeRange === 'today' && !isInteracting ? 60000 : false,
  });

  return (
    <div
      onMouseEnter={() => setIsInteracting(true)}
      onMouseLeave={() => setIsInteracting(false)}
    >
      <StreamChart
        data={data?.metrics || []}
        metric="viewers"
        timeRange={timeRange}
      />
    </div>
  );
}
```

**Vitest Configuration:**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['lib/**', 'components/**', 'app/**'],
      exclude: [
        'node_modules/',
        '.next/',
        '**/*.d.ts',
        '**/*.config.ts',
        '**/types.ts',
      ],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 75,
        lines: 80,
      },
    },
  },
});
```

**Playwright Configuration:**

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
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
      name: 'Mobile Safari',
      use: { ...devices['iPhone 14'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
```

**GitHub Actions CI/CD Workflow:**

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [master, feat/*]
  pull_request:
    branches: [master]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npx tsc --noEmit

  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run test:coverage
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/lcov.info
          fail_ci_if_error: true

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      - name: Upload Playwright report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30

  build:
    runs-on: ubuntu-latest
    env:
      DATABASE_URL: ${{ secrets.DATABASE_URL }}
      YOUTUBE_API_KEY: ${{ secrets.YOUTUBE_API_KEY }}
      BETTER_AUTH_SECRET: ${{ secrets.BETTER_AUTH_SECRET }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
```

---

### B. Testing Examples

**Unit Test: LTTB Downsampling:**

```typescript
// lib/__tests__/downsample.test.ts
import { describe, it, expect } from 'vitest';
import { downsample } from '../downsample';

describe('downsample', () => {
  it('should preserve first and last points', () => {
    const data = Array.from({ length: 1000 }, (_, i) => ({
      timestamp: new Date(2026, 0, 1, 0, i).toISOString(),
      viewers: Math.random() * 1000,
      likes: 0,
      views: 0,
    }));

    const result = downsample(data, 100);

    expect(result[0]).toEqual(data[0]);
    expect(result[result.length - 1]).toEqual(data[data.length - 1]);
  });

  it('should return exact target size', () => {
    const data = Array.from({ length: 5000 }, (_, i) => ({
      timestamp: new Date(2026, 0, 1, 0, i).toISOString(),
      viewers: i,
      likes: 0,
      views: 0,
    }));

    const result = downsample(data, 2000);
    expect(result.length).toBe(2000);
  });

  it('should complete in <100ms for 43,200 points', () => {
    const data = Array.from({ length: 43200 }, (_, i) => ({
      timestamp: new Date(2026, 0, 1, 0, i).toISOString(),
      viewers: Math.random() * 10000,
      likes: 0,
      views: 0,
    }));

    const start = performance.now();
    downsample(data, 2000);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(100);
  });
});
```

**Integration Test: Metrics API:**

```typescript
// app/api/streams/[id]/metrics/__tests__/route.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { GET } from '../route';
import { setupTestDatabase } from '@/lib/test-utils';

describe('GET /api/streams/[id]/metrics', () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });

  it('should return metrics for 30-day range', async () => {
    const req = new Request('http://localhost/api/streams/test-id/metrics?timeRange=30d');
    const params = Promise.resolve({ id: 'test-stream-id' });

    const response = await GET(req, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.metrics).toBeInstanceOf(Array);
    expect(data.dataPoints).toBeGreaterThan(0);
  });

  it('should apply cache headers', async () => {
    const req = new Request('http://localhost/api/streams/test-id/metrics?timeRange=7d');
    const params = Promise.resolve({ id: 'test-stream-id' });

    const response = await GET(req, { params });

    expect(response.headers.get('cache-control')).toContain('s-maxage=60');
  });
});
```

**E2E Test: Chart Rendering:**

```typescript
// e2e/chart-downsampling.spec.ts
import { test, expect } from '@playwright/test';

test('30-day chart renders with downsampled data', async ({ page }) => {
  // Navigate to stream detail page
  await page.goto('/dashboard/streams/test-stream-id');

  // Click 30 Days button
  await page.click('text=30 Days');

  // Wait for chart to render
  await page.waitForSelector('.recharts-wrapper', { timeout: 10000 });

  // Verify chart is visible
  const chart = page.locator('.recharts-wrapper');
  await expect(chart).toBeVisible();

  // Performance check: should render in <2 seconds
  const metrics = await page.evaluate(() => performance.now());
  expect(metrics).toBeLessThan(2000);

  // Verify tooltip works
  await chart.hover();
  await expect(page.locator('.custom-tooltip')).toBeVisible();
});
```

---

### C. Glossary

**LTTB (Largest Triangle Three Buckets):** Downsampling algorithm that preserves visual characteristics by selecting data points with the largest triangle areas formed with adjacent points.

**Downsampling:** Reducing the number of data points in a dataset while preserving its visual shape and important features (peaks, troughs, trends).

**Decimation:** Simple downsampling by taking every Nth point (e.g., every 20th point from 43,200 → 2,160). Fast but loses important peaks.

**Vitest:** Modern testing framework for JavaScript/TypeScript, 10x faster than Jest, designed for Vite/Next.js projects.

**Playwright:** E2E testing framework supporting multiple browsers, official recommendation for Next.js testing.

**PGlite:** In-memory PostgreSQL database running via WebAssembly, perfect for fast integration tests without Docker.

**MSW (Mock Service Worker):** API mocking library that intercepts network requests, used for testing without hitting real APIs.

**TanStack Query (React Query):** Data-fetching library with built-in caching, auto-refresh, and optimistic updates.

**Vercel Cron Jobs:** Scheduled serverless functions on Vercel (similar to cron on Linux), requires Pro plan for minute-level precision.

**CI/CD (Continuous Integration/Continuous Deployment):** Automated pipeline that runs tests and deploys code on every commit.

**Code Coverage:** Percentage of code executed during tests, measured by tools like v8 (for Vitest) or Istanbul.

**Flaky Test:** Test that passes/fails intermittently without code changes, usually due to timing issues or race conditions.

**AbortSignal:** Web API for canceling fetch requests, passed to `fetch()` to cancel in-flight network requests.

---

## Summary

This comprehensive plan covers:
- **CHART-005**: LTTB downsampling to optimize 30-day charts (43,200 → 2,000 points)
- **CHART-006**: Real-time chart updates with race condition handling
- **INFRA-001**: Vercel Pro upgrade for auto-polling (minute-level cron jobs)
- **Testing Infrastructure**: Ground-up test suite (Vitest, Playwright, GitHub Actions)

**Total Effort:** 4 weeks (1 developer) or 2 weeks (2 developers in parallel)

**Total Cost:** $20/month (Vercel Pro only)

**Impact:**
- 30-day charts render in <2s (currently 5-10s)
- 0 data gaps with auto-polling (currently manual gaps)
- 80%+ test coverage (currently 0%)
- CI/CD prevents regressions (currently no automation)

**Next Step:** Review this plan with stakeholders, answer critical questions (#1-7 from SpecFlow analysis), then begin Phase 1 (Testing Foundation).
