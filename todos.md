# YouTube Live Stream Monitor - TODO List

**Last Updated:** 2025-12-30
**Project Status:** Phase 0 - Setup & Planning
**PRD Version:** 2.0 (Approved)
**Implementation Plan:** `plans/youtube-live-stream-monitor-mvp.md`

---

## Legend

- 🔴 **Blocked** - Cannot start (missing dependencies)
- 🟡 **Ready** - All dependencies met, can start
- 🟢 **In Progress** - Currently being worked on
- ✅ **Completed** - Finished and verified
- ⏸️ **Deferred** - Postponed to future phase

**Dependencies Format:** `Depends on: [TASK-ID]`

---

## Phase 0: Project Setup & Infrastructure

### SETUP-001: Environment Setup
**Status:** 🟡 Ready
**Priority:** P0
**Depends on:** None
**Tasks:**
- [ ] Copy `.env.example` to `.env.local`
- [ ] Generate `NEXTAUTH_SECRET` using `openssl rand -base64 32`
- [ ] Generate `CRON_SECRET` using `openssl rand -base64 32`
- [ ] Set up local environment variables
- [ ] Document all required environment variables

### SETUP-002: Vercel Account & Database Setup
**Status:** 🟡 Ready
**Priority:** P0
**Depends on:** SETUP-001
**Tasks:**
- [ ] Create Vercel account (if not exists)
- [ ] Connect GitHub repository to Vercel
- [ ] Add Vercel Postgres storage addon
- [ ] Configure production environment variables in Vercel dashboard
- [ ] Pull Vercel Postgres connection strings to local: `vercel env pull .env.local`
- [ ] Verify database connection works locally

### SETUP-003: YouTube Data API Setup
**Status:** 🟡 Ready
**Priority:** P0
**Depends on:** SETUP-001
**Tasks:**
- [ ] Create Google Cloud project at console.cloud.google.com
- [ ] Enable "YouTube Data API v3" in API Library
- [ ] Create API Key under Credentials
- [ ] Restrict API key to YouTube Data API v3 only
- [ ] Add `YOUTUBE_API_KEY` to `.env.local`
- [ ] Add `YOUTUBE_API_KEY` to Vercel environment variables
- [ ] Test API key with sample video ID
- [ ] Document quota limits and usage monitoring

### SETUP-004: Resend Email Service Setup
**Status:** 🟡 Ready
**Priority:** P1
**Depends on:** SETUP-001
**Tasks:**
- [ ] Sign up for Resend account at resend.com
- [ ] Verify email address
- [ ] Add and verify custom domain (or use resend.dev for testing)
- [ ] Generate API key from Resend dashboard
- [ ] Add `RESEND_API_KEY` to `.env.local`
- [ ] Add `RESEND_API_KEY` to Vercel environment variables
- [ ] Add `EMAIL_FROM` address to environment variables
- [ ] Test email sending with sample notification

### SETUP-005: Install Dependencies
**Status:** 🟡 Ready
**Priority:** P0
**Depends on:** None
**Files:** `package.json`
**Tasks:**
- [ ] Install `@googleapis/youtube@^20.0.0` for YouTube Data API v3
- [ ] Install **Drizzle ORM**: `drizzle-orm`, `@vercel/postgres`
- [ ] Install Drizzle Kit (dev): `drizzle-kit` for migrations
- [ ] Install `pg` for PostgreSQL driver (Better Auth requirement)
- [ ] Install `resend@latest` for email notifications
- [ ] Install `react-email@latest` for email templates
- [ ] Install **Recharts**: `recharts@latest` for charts
- [ ] Install `@tanstack/react-query@latest` for data fetching with auto-refresh
- [ ] Install `date-fns@latest` for date manipulation and formatting
- [ ] Install **Better Auth**: `better-auth@latest` for authentication
- [ ] Install `zod@latest` for form validation
- [ ] Verify all shadcn/ui and Radix UI dependencies installed
- [ ] Run `npm install` and verify no dependency conflicts
- [ ] Update package.json with exact versions
- [ ] Test dev server starts: `npm run dev`

---

## Phase 1: Core Monitoring & Authentication (Weeks 1-4)

### AUTH-001: Better Auth Integration
**Status:** 🟡 Ready
**Priority:** P0
**Depends on:** SETUP-001, SETUP-005, SETUP-002
**Files:** `lib/auth.ts`, `lib/auth-client.ts`
**Reference:** `plans/youtube-live-stream-monitor-mvp.md` lines 136-198
**Tasks:**
- [ ] Create `lib/auth.ts` with Better Auth server configuration
- [ ] Configure Better Auth with PostgreSQL connection pool:
  - [ ] `max: 1` connection (serverless optimization)
  - [ ] `idleTimeoutMillis: 5000` for auto-cleanup
- [ ] Configure `emailAndPassword` provider:
  - [ ] Enable email/password authentication
  - [ ] Set `minPasswordLength: 8`
  - [ ] Implement `sendResetPassword` hook with Resend integration
- [ ] Configure session management:
  - [ ] `expiresIn: 60 * 60 * 24 * 7` (7 days)
  - [ ] `updateAge: 60 * 60 * 24` (refresh after 1 day)
  - [ ] `freshAge: 60 * 10` (fresh for 10 minutes)
- [ ] Configure rate limiting:
  - [ ] `enabled: true`
  - [ ] `window: 60` seconds
  - [ ] `max: 10` attempts
  - [ ] `storage: "database"` for multi-instance support
- [ ] Add environment variables validation:
  - [ ] `BETTER_AUTH_SECRET` (required)
  - [ ] `BETTER_AUTH_URL` (required)
  - [ ] `POSTGRES_URL` (required)
- [ ] Test Better Auth initialization without errors
- [ ] Verify database tables created (users, sessions, accounts, verificationTokens)
- [ ] Optional: Add Google OAuth provider configuration (can defer to Phase 5)

### AUTH-002: User Registration & Login UI
**Status:** 🔴 Blocked
**Priority:** P0
**Depends on:** AUTH-001
**Tasks:**
- [ ] Create registration page (`app/auth/register/page.tsx`)
- [ ] Create login page (`app/auth/login/page.tsx`)
- [ ] Add form validation (min 8 characters for passwords)
- [ ] Implement client-side form with shadcn/ui components
- [ ] Add email verification flow (optional for MVP)
- [ ] Create password reset page (`app/auth/reset-password/page.tsx`)
- [ ] Add password reset token generation and validation
- [ ] Implement "Forgot Password" email flow with Resend
- [ ] Create user profile management page
- [ ] Add account deletion functionality

### AUTH-003: Protected Routes & Middleware
**Status:** 🔴 Blocked
**Priority:** P0
**Depends on:** AUTH-001, AUTH-002
**Tasks:**
- [ ] Create authentication middleware (`middleware.ts`)
- [ ] Protect dashboard routes (redirect to login if not authenticated)
- [ ] Protect API routes with session validation
- [ ] Add logout functionality
- [ ] Implement session persistence across page refreshes
- [ ] Add user context provider for client components
- [ ] Create auth helpers (`lib/auth-helpers.ts`)

### DB-001: Drizzle ORM Schema Implementation
**Status:** 🔴 Blocked
**Priority:** P0
**Depends on:** SETUP-002, SETUP-005
**Files:** `db/schema.ts`, `drizzle.config.ts`
**Reference:** `plans/youtube-live-stream-monitor-mvp.md` lines 208-280
**Tasks:**
- [ ] Create `drizzle.config.ts` with Vercel Postgres connection
- [ ] Create `db/schema.ts` with all table definitions
- [ ] Note: Better Auth creates `users`, `sessions`, `accounts`, `verificationTokens` automatically
- [ ] Define `streams` table:
  - [ ] Serial `id` primary key
  - [ ] Varchar `videoId` (50 chars) unique, not null
  - [ ] Text fields: `title`, `thumbnailUrl`, `description`
  - [ ] Boolean `isLive` default false
  - [ ] Timestamps: `lastCheckedAt`, `createdAt`, `updatedAt`
  - [ ] Unique index on `videoId`
  - [ ] Index on `lastCheckedAt`
- [ ] Define `userStreams` many-to-many table:
  - [ ] Foreign keys to `users.id` and `streams.id` with CASCADE delete
  - [ ] `alertEnabled` boolean default true
  - [ ] `alertThresholdViewerDrop` integer default 20
  - [ ] `lastAlertSentAt` timestamp
  - [ ] Unique constraint on `(userId, streamId)`
  - [ ] Indexes on `userId` and `streamId`
- [ ] Define `streamMetrics` time-series table (will be partitioned later):
  - [ ] Serial `id` primary key
  - [ ] Foreign key to `streams.id` with CASCADE delete
  - [ ] Timestamp `timestamp` not null, default now
  - [ ] Integers: `concurrentViewers`, `totalLikes`, `totalViews` (default 0)
  - [ ] Boolean `isLive` default false
  - [ ] Composite index: `(streamId, timestamp DESC)`
  - [ ] Index on `timestamp` for pruning
- [ ] Define `streamChanges` log table:
  - [ ] Foreign key to `streams.id`
  - [ ] Varchar `changeType` ('title', 'thumbnail', 'description')
  - [ ] Text fields: `oldValue`, `newValue`
  - [ ] Indexes on `(streamId, timestamp DESC)` and `timestamp`
- [ ] Define `dataDeletionLog` audit table:
  - [ ] Fields: `deletedAt`, `tableName`, `recordsDeleted`, `oldestTimestamp`, `newestTimestamp`
- [ ] Generate migration with: `drizzle-kit generate:pg`
- [ ] Apply migration with: `drizzle-kit push:pg`
- [ ] Verify all tables created in Vercel Postgres
- [ ] Insert sample data and verify foreign key constraints

### DB-002: Database Partitioning Setup (PostgreSQL)
**Status:** 🔴 Blocked
**Priority:** P0
**Depends on:** DB-001
**Files:** `db/migrations/partition-stream-metrics.sql`
**Reference:** `plans/youtube-live-stream-monitor-mvp.md` lines 282-328
**Tasks:**
- [ ] Create manual SQL migration file: `db/migrations/partition-stream-metrics.sql`
- [ ] Rename existing table: `ALTER TABLE stream_metrics RENAME TO stream_metrics_old`
- [ ] Create partitioned table with PARTITION BY RANGE (timestamp)
- [ ] Set composite primary key: `PRIMARY KEY (id, timestamp)`
- [ ] Create 30 daily partitions (one per day for 30-day retention)
  - [ ] Example: `CREATE TABLE stream_metrics_2025_12_30 PARTITION OF stream_metrics ...`
- [ ] Install pg_partman extension: `CREATE EXTENSION IF NOT EXISTS pg_partman`
- [ ] Configure pg_partman auto-management:
  - [ ] Call `partman.create_parent()` with daily partitioning
  - [ ] Set retention: `retention = '30 days'`
  - [ ] Set `retention_keep_table = false` to auto-drop old partitions
- [ ] Create indexes on each partition:
  - [ ] Composite index: `(stream_id, timestamp DESC)`
- [ ] Test partitioning with sample data insertion
- [ ] Verify old partitions drop automatically after 30 days
- [ ] Document partitioning strategy in database docs

### DB-003: Database Query Optimization
**Status:** 🔴 Blocked
**Priority:** P0
**Depends on:** DB-002
**Tasks:**
- [ ] Verify all indexes created by Drizzle schema
- [ ] Verify partition indexes created by SQL migration
- [ ] Test time-range query performance:
  - [ ] Query last 7 days of metrics for single stream
  - [ ] Query last 30 days of metrics for single stream
  - [ ] Verify query executes in <500ms
- [ ] Test batch insert performance with INSERT...UNNEST pattern
- [ ] Insert 10,000 sample metrics records for load testing
- [ ] Run EXPLAIN ANALYZE on critical queries
- [ ] Optimize any slow queries identified
- [ ] Document query optimization patterns

### API-001: YouTube API Client Setup
**Status:** 🔴 Blocked
**Priority:** P0
**Depends on:** SETUP-003, SETUP-005
**Tasks:**
- [ ] Create YouTube API client wrapper (`lib/youtube-client.ts`)
- [ ] Implement `videos.list` batch request (up to 50 IDs)
- [ ] Add error handling with exponential backoff
- [ ] Add retry logic (max 3 retries)
- [ ] Implement quota usage tracking
- [ ] Add logging for API calls and errors
- [ ] Create type definitions for YouTube API responses
- [ ] Test API client with sample video IDs
- [ ] Document API usage and quota calculations

### API-002: Stream Data Polling Service
**Status:** 🔴 Blocked
**Priority:** P0
**Depends on:** API-001, DB-001
**Tasks:**
- [ ] Create polling service (`lib/youtube-poller.ts`)
- [ ] Implement `pollYouTubeMetrics()` function
- [ ] Query all active streams from database
- [ ] Batch video IDs (50 per request)
- [ ] Extract metrics: concurrent_viewers, likes, views, is_live
- [ ] Insert metrics into `stream_metrics` table
- [ ] Update `streams.last_checked_at` timestamp
- [ ] Handle offline streams (is_live = false)
- [ ] Add error logging and monitoring
- [ ] Test polling with real YouTube live streams
- [ ] Verify 60-second polling accuracy (±5 seconds)

### API-003: Metadata Change Detection
**Status:** 🔴 Blocked
**Priority:** P0
**Depends on:** API-002
**Tasks:**
- [ ] Implement `checkMetadataChanges()` function
- [ ] Compare current vs previous: title, thumbnail_url, description
- [ ] Insert change records into `stream_changes` table
- [ ] Update `streams` table with new metadata
- [ ] Handle null/undefined values gracefully
- [ ] Add logging for detected changes
- [ ] Test with manually updated stream metadata
- [ ] Verify change log accuracy

### API-004: Stream Deduplication Logic
**Status:** 🔴 Blocked
**Priority:** P0
**Depends on:** DB-001
**Tasks:**
- [ ] Create `addStreamForUser()` function
- [ ] Check if video_id exists in `streams` table
- [ ] If exists: create `user_streams` relationship only
- [ ] If new: insert into `streams` and create relationship
- [ ] Prevent duplicate polling for same video_id
- [ ] Add validation for YouTube video ID format
- [ ] Test with multiple users adding same stream
- [ ] Verify single poll per unique video_id

### CRON-001: Vercel Cron Configuration
**Status:** 🔴 Blocked
**Priority:** P0
**Depends on:** SETUP-002
**Tasks:**
- [ ] Create `vercel.json` with cron jobs configuration
- [ ] Configure `/api/cron/poll-youtube` to run every minute
- [ ] Configure `/api/cron/prune-data` to run daily at 00:00 UTC
- [ ] Add `CRON_SECRET` verification to protect endpoints
- [ ] Test cron configuration locally (simulate cron calls)
- [ ] Deploy to Vercel and verify cron jobs execute
- [ ] Set up monitoring for cron job failures

### CRON-002: YouTube Polling Cron Endpoint
**Status:** 🔴 Blocked
**Priority:** P0
**Depends on:** API-002, CRON-001
**Tasks:**
- [ ] Create `/api/cron/poll-youtube/route.ts`
- [ ] Add authorization check using `CRON_SECRET`
- [ ] Call `pollYouTubeMetrics()` function
- [ ] Return success/error response with metrics
- [ ] Add error logging to external service (Sentry optional)
- [ ] Test endpoint with manual trigger
- [ ] Verify endpoint runs every minute via Vercel Cron
- [ ] Monitor for failures and timeouts

### CRON-003: Data Pruning Cron Endpoint
**Status:** 🔴 Blocked
**Priority:** P0
**Depends on:** DB-001, CRON-001
**Tasks:**
- [ ] Create `/api/cron/prune-data/route.ts`
- [ ] Add authorization check using `CRON_SECRET`
- [ ] Delete `stream_metrics` records older than 30 days
- [ ] Delete `stream_changes` records older than 30 days
- [ ] Insert deletion audit log into `data_deletion_log`
- [ ] Return count of deleted records
- [ ] Test with sample old data (31 days ago)
- [ ] Verify daily execution at 00:00 UTC
- [ ] Add compliance monitoring (zero records >30 days)

### UI-001: Stream Management UI
**Status:** 🔴 Blocked
**Priority:** P0
**Depends on:** AUTH-003, API-004
**Tasks:**
- [ ] Create dashboard page (`app/dashboard/page.tsx`)
- [ ] Add "Add Stream" form with video ID input
- [ ] Validate YouTube video ID format
- [ ] Display list of user's monitored streams
- [ ] Show stream card: thumbnail, title, current status (online/offline)
- [ ] Add "Remove Stream" button with confirmation dialog
- [ ] Handle loading and error states
- [ ] Add empty state when no streams monitored
- [ ] Test adding/removing streams
- [ ] Verify stream deduplication in UI

---

## Phase 2: Visualization & Change Tracking (Weeks 5-6)

### CHART-001: Chart Library Integration
**Status:** 🔴 Blocked
**Priority:** P0
**Depends on:** SETUP-005
**Tasks:**
- [ ] Evaluate chart libraries (Recharts vs Tremor)
- [ ] Install selected chart library
- [ ] Create chart wrapper component (`components/ui/time-series-chart.tsx`)
- [ ] Configure responsive chart settings
- [ ] Add tooltip support for hover interactions
- [ ] Test chart rendering with sample data
- [ ] Optimize for 43,200 data points (30 days × 1440 minutes)

### CHART-002: Time-Series Data API
**Status:** 🔴 Blocked
**Priority:** P0
**Depends on:** DB-002
**Tasks:**
- [ ] Create `/api/streams/[id]/metrics/route.ts`
- [ ] Accept query params: `timeRange` (today, 7d, 14d, 30d)
- [ ] Query `stream_metrics` with date range filter
- [ ] Return formatted data for charts (timestamp, viewers, likes, views)
- [ ] Optimize query performance (<500ms for 30 days)
- [ ] Add caching headers (60-second cache)
- [ ] Test with various time ranges
- [ ] Verify response time <2 seconds

### CHART-003: Interactive Charts UI
**Status:** 🔴 Blocked
**Priority:** P0
**Depends on:** CHART-001, CHART-002
**Tasks:**
- [ ] Create stream detail page (`app/dashboard/streams/[id]/page.tsx`)
- [ ] Add time range selector (Today, 7d, 14d, 30d)
- [ ] Render line chart for concurrent viewers
- [ ] Add separate lines/charts for likes and views
- [ ] Implement auto-refresh every 60 seconds for "Today" view
- [ ] Add zoom/pan interactions (optional)
- [ ] Show loading skeleton while fetching data
- [ ] Handle empty states and errors
- [ ] Test chart interactions (hover, range selection)

### CHART-004: Change Log Timeline Overlay
**Status:** 🔴 Blocked
**Priority:** P0
**Depends on:** CHART-003, API-003
**Tasks:**
- [ ] Create `/api/streams/[id]/changes/route.ts`
- [ ] Query `stream_changes` with date range
- [ ] Return changes with timestamps
- [ ] Add change markers to chart timeline
- [ ] Style markers by change type (title, thumbnail, description)
- [ ] Show tooltip with old/new values on hover
- [ ] Test with streams that have metadata changes
- [ ] Verify markers align with correct timestamps

### CHART-005: Chart Downsampling (LTTB Algorithm)
**Status:** 🔴 Blocked
**Priority:** P0
**Depends on:** CHART-003
**Files:** `lib/downsample.ts`, `components/stream-chart.tsx`
**Reference:** `plans/youtube-live-stream-monitor-mvp.md` lines 686-714
**Tasks:**
- [ ] Create `lib/downsample.ts` with LTTB implementation
- [ ] Implement Largest Triangle Three Buckets (LTTB) algorithm:
  - [ ] Accept data array and target size (default: 2000 points)
  - [ ] Always include first and last points
  - [ ] For middle points: select point with largest triangle area
  - [ ] Return downsampled array maintaining visual fidelity
- [ ] Apply downsampling to 30-day chart view:
  - [ ] Input: 43,200 data points (1 per minute × 30 days)
  - [ ] Output: 2,000 points (downsample ratio ~21.6:1)
  - [ ] Verify visual similarity to original chart
- [ ] Add downsampling logic to `StreamChart` component:
  - [ ] If timeRange === '30d', call downsample() function
  - [ ] Otherwise, use raw data
- [ ] Test downsampling performance:
  - [ ] Verify chart renders in <2 seconds with 30 days data
  - [ ] Verify visual accuracy (compare downsampled vs full chart)
- [ ] Add unit tests for downsample function
- [ ] Document LTTB algorithm and rationale

### CHART-006: Real-Time Chart Updates
**Status:** 🔴 Blocked
**Priority:** P1
**Depends on:** CHART-005
**Tasks:**
- [ ] Install and configure TanStack Query for data fetching
- [ ] Wrap chart component with QueryClientProvider
- [ ] Configure 60-second refetch interval for "Today" view only
- [ ] Disable auto-refresh for historical views (7d, 14d, 30d)
- [ ] Add optimistic updates for new data points
- [ ] Handle stale data gracefully with loading indicators
- [ ] Add visual indicator for data freshness (e.g., "Updated 30s ago")
- [ ] Test auto-refresh behavior with live stream
- [ ] Optimize for performance:
  - [ ] Use React.memo for chart components
  - [ ] Use useMemo for expensive calculations
  - [ ] Debounce rapid updates

---

## Phase 3: Alerting System (Weeks 7-8)

### EMAIL-001: Resend Email Integration
**Status:** 🔴 Blocked
**Priority:** P1
**Depends on:** SETUP-004, SETUP-005
**Tasks:**
- [ ] Create email service wrapper (`lib/email-service.ts`)
- [ ] Implement `sendEmail()` function with Resend API
- [ ] Add error handling and retry logic
- [ ] Test email sending with sample notification
- [ ] Verify email delivery success rate

### EMAIL-002: Email Templates
**Status:** 🔴 Blocked
**Priority:** P1
**Depends on:** EMAIL-001
**Tasks:**
- [ ] Create stream offline email template (`emails/stream-offline.tsx`)
- [ ] Create viewer drop alert email template (`emails/viewer-drop.tsx`)
- [ ] Add stream thumbnail, title, and timestamp to templates
- [ ] Add unsubscribe link in footer (CAN-SPAM compliance)
- [ ] Style templates with responsive HTML
- [ ] Test templates in email clients
- [ ] Verify template rendering with React Email

### ALERT-001: Offline Detection Logic
**Status:** 🔴 Blocked
**Priority:** P1
**Depends on:** API-002
**Tasks:**
- [ ] Add offline detection to polling service
- [ ] Compare previous vs current `is_live` status
- [ ] Detect status change from `true` to `false`
- [ ] Trigger offline alert when stream goes offline
- [ ] Update stream status in database
- [ ] Add logging for status changes
- [ ] Test with stream that goes offline

### ALERT-002: Stream Offline Email Alerts
**Status:** 🔴 Blocked
**Priority:** P1
**Depends on:** ALERT-001, EMAIL-002
**Tasks:**
- [ ] Create `sendOfflineAlert()` function
- [ ] Query all users monitoring the offline stream
- [ ] Send email to each user via Resend
- [ ] Include stream title, thumbnail, offline timestamp
- [ ] Add link to dashboard in email
- [ ] Track alert delivery (log success/failure)
- [ ] Implement optional "back online" notification
- [ ] Test with real stream offline event
- [ ] Verify alert delivery within 2 minutes

### ALERT-003: Viewer Drop Threshold Logic
**Status:** 🔴 Blocked
**Priority:** P1
**Depends on:** API-002
**Tasks:**
- [ ] Add viewer drop detection to polling service
- [ ] Compare current vs previous concurrent_viewers (1 min ago)
- [ ] Calculate percentage drop: `((prev - current) / prev) * 100`
- [ ] Check if drop >= user's threshold (default 20%)
- [ ] Trigger alert if threshold exceeded
- [ ] Implement rate limiting (no duplicate alerts within 10 min)
- [ ] Test with various viewer drop scenarios

### ALERT-004: Viewer Drop Email Alerts
**Status:** 🔴 Blocked
**Priority:** P1
**Depends on:** ALERT-003, EMAIL-002
**Tasks:**
- [ ] Create `sendViewerDropAlert()` function
- [ ] Include viewer count before/after, percentage drop
- [ ] Add timestamp and link to dashboard
- [ ] Check `last_alert_sent_at` for rate limiting
- [ ] Update `last_alert_sent_at` after sending
- [ ] Test with threshold breach scenarios
- [ ] Verify 10-minute cooldown works correctly

### ALERT-005: Alert Preferences UI
**Status:** 🔴 Blocked
**Priority:** P1
**Depends on:** UI-001
**Tasks:**
- [ ] Add alert settings to stream card/detail page
- [ ] Add toggle for `alert_enabled` (on/off)
- [ ] Add input for `alert_threshold_viewer_drop` percentage
- [ ] Create `/api/user-streams/[id]/settings/route.ts`
- [ ] Update `user_streams` table with preferences
- [ ] Add form validation (threshold 1-100%)
- [ ] Show current alert settings in UI
- [ ] Test saving and loading preferences
- [ ] Add "Test Alert" button (optional)

---

## Phase 4: Polish & Launch (Week 9)

### POLISH-001: UI/UX Refinements
**Status:** 🔴 Blocked
**Priority:** P2
**Depends on:** UI-001, CHART-003
**Tasks:**
- [ ] Review all shadcn/ui component usage
- [ ] Ensure consistent spacing and typography
- [ ] Add loading skeletons for all async content
- [ ] Improve error messages and empty states
- [ ] Add success toast notifications
- [ ] Implement smooth transitions and animations
- [ ] Review color palette and contrast ratios
- [ ] Test with colorblind simulation tools

### POLISH-002: Mobile Responsiveness
**Status:** 🔴 Blocked
**Priority:** P2
**Depends on:** POLISH-001
**Tasks:**
- [ ] Test all pages on mobile viewports (375px, 768px, 1024px)
- [ ] Optimize charts for small screens
- [ ] Ensure touch-friendly button sizes
- [ ] Test hamburger menu and navigation
- [ ] Fix any layout overflow issues
- [ ] Verify forms work on mobile keyboards
- [ ] Test on real devices (iOS Safari, Android Chrome)

### POLISH-003: Performance Optimization
**Status:** 🔴 Blocked
**Priority:** P2
**Depends on:** CHART-005, ALERT-005
**Tasks:**
- [ ] Run Lighthouse performance audit
- [ ] Optimize chart rendering (memoization, virtualization)
- [ ] Add database query result caching
- [ ] Implement image optimization (Next.js Image)
- [ ] Minimize bundle size (analyze with webpack-bundle-analyzer)
- [ ] Add loading states to prevent layout shifts (CLS)
- [ ] Optimize API route response times
- [ ] Test with 30 days of data (43,200 records)
- [ ] Verify chart loads in <2 seconds

### POLISH-004: Documentation
**Status:** 🔴 Blocked
**Priority:** P2
**Depends on:** None
**Tasks:**
- [ ] Write README.md with setup instructions
- [ ] Document environment variables in `.env.example`
- [ ] Create developer guide for local development
- [ ] Document database schema and migrations
- [ ] Add API endpoint documentation
- [ ] Create user guide for end users
- [ ] Document deployment process
- [ ] Add troubleshooting section

### DEPLOY-001: Production Deployment
**Status:** 🔴 Blocked
**Priority:** P2
**Depends on:** POLISH-003, POLISH-004
**Tasks:**
- [ ] Review Vercel production settings
- [ ] Verify all environment variables set in Vercel
- [ ] Run production build locally (`npm run build`)
- [ ] Fix any build errors or warnings
- [ ] Deploy to Vercel production
- [ ] Verify database migrations applied
- [ ] Test authentication flow in production
- [ ] Test YouTube API polling in production
- [ ] Verify cron jobs execute correctly
- [ ] Test email delivery from production
- [ ] Monitor initial production errors (Sentry)
- [ ] Set up custom domain (optional)
- [ ] Add SSL certificate verification

### DEPLOY-002: Monitoring & Observability
**Status:** 🔴 Blocked
**Priority:** P2
**Depends on:** DEPLOY-001
**Tasks:**
- [ ] Set up Vercel Analytics
- [ ] Configure error tracking (Sentry optional)
- [ ] Create admin dashboard for quota monitoring
- [ ] Add database performance monitoring
- [ ] Set up uptime monitoring (UptimeRobot or similar)
- [ ] Configure alerts for cron job failures
- [ ] Monitor email delivery success rate
- [ ] Track API quota usage daily
- [ ] Document monitoring checklist

---

## Future Enhancements (Phase 5+)

### FUTURE-001: Workspace Management (Phase 5)
**Status:** ⏸️ Deferred
**Priority:** P3
**Depends on:** DEPLOY-002
**Tasks:**
- [ ] Design workspace schema (multi-workspace per user)
- [ ] Implement workspace creation and switching
- [ ] Add team member invitations
- [ ] Implement role-based access control (RBAC)
- [ ] Add workspace-level settings and billing

### FUTURE-002: Twitch Integration (Phase 5)
**Status:** ⏸️ Deferred
**Priority:** P3
**Depends on:** DEPLOY-002
**Tasks:**
- [ ] Research Twitch API and quota limits
- [ ] Set up Twitch Developer account and API key
- [ ] Implement Twitch API client
- [ ] Add Twitch stream polling service
- [ ] Update database schema for multi-platform support
- [ ] Add platform selector in UI

### FUTURE-003: Advanced Analytics (Phase 6)
**Status:** ⏸️ Deferred
**Priority:** P3
**Depends on:** CHART-005
**Tasks:**
- [ ] Peak viewer time analysis
- [ ] Correlation analysis (title changes vs viewer growth)
- [ ] Export data to CSV/JSON
- [ ] Generate PDF reports
- [ ] Add comparison charts (multiple streams)

### FUTURE-004: Real-Time WebSocket Updates (Phase 6)
**Status:** ⏸️ Deferred
**Priority:** P3
**Depends on:** CHART-005
**Tasks:**
- [ ] Implement WebSocket server (Socket.io or native)
- [ ] Push real-time metrics to connected clients
- [ ] Replace 60-second polling with live updates
- [ ] Optimize connection management
- [ ] Add reconnection logic

### FUTURE-005: Mobile Apps (Phase 7)
**Status:** ⏸️ Deferred
**Priority:** P3
**Depends on:** DEPLOY-002
**Tasks:**
- [ ] Evaluate React Native vs Flutter
- [ ] Set up mobile app project
- [ ] Implement native push notifications
- [ ] Build iOS app
- [ ] Build Android app
- [ ] Submit to App Store and Google Play

---

## Notes & Best Practices

### When Adding New Tasks
1. Assign unique task ID (e.g., `FEATURE-XXX`)
2. Set priority (P0 = Must Have, P1 = Should Have, P2 = Nice to Have, P3 = Future)
3. Identify all dependencies (block on incomplete tasks)
4. Update status as work progresses
5. Move completed tasks to bottom with ✅ status

### When Completing Tasks
1. Mark task as ✅ Completed
2. Update `Last Updated` date at top of file
3. Check if any blocked tasks can now be unblocked
4. Update dependent tasks from 🔴 to 🟡
5. Commit changes with message: `chore: update todos - completed [TASK-ID]`

### Priority Definitions
- **P0 (Must Have)**: Critical for MVP launch
- **P1 (Should Have)**: Important but can be phased
- **P2 (Nice to Have)**: Polish and enhancements
- **P3 (Future)**: Post-launch features

### Dependency Management
- Never start a task with unmet dependencies
- If blocked, check if dependency can be split into smaller tasks
- Update dependency tree when new tasks are added
- Use this todo list as source of truth for sprint planning

---

**Total Tasks:** 85+ (across all phases, refined with implementation details)
**Estimated Timeline:** 9 weeks for Phases 1-4 (MVP)
**Next Review Date:** Weekly during development

---

## Key Updates from Comprehensive Plan (2025-12-30)

### Technical Decisions Finalized
- **Authentication:** Better Auth with PostgreSQL adapter (replaced NextAuth consideration)
- **ORM:** Drizzle ORM (chosen over Prisma for 14x better serverless performance)
- **Charts:** Recharts (chosen over Tremor for flexibility and real-time support)
- **Downsampling:** LTTB algorithm for 30-day charts (43,200 → 2,000 points)
- **Partitioning:** Daily PostgreSQL partitions with pg_partman auto-management

### New Tasks Added
- **DB-002:** Database partitioning setup with pg_partman extension
- **CHART-005:** LTTB downsampling implementation for performance
- **Enhanced SETUP-005:** Specific package versions and dependencies
- **Enhanced AUTH-001:** Detailed Better Auth configuration with connection pooling
- **Enhanced DB-001:** Complete Drizzle schema with all table definitions

### Resolved Questions (47 from SpecFlow Analysis)
All architecture questions documented in PRD v2.0 section "Resolved Architecture Questions":
- Email verification: Optional for MVP
- Password requirements: Min 8 characters
- Session duration: 7 days with auto-refresh
- Offline streams: Allow adding, queue for monitoring
- YouTube quota: Graceful degradation, admin alerts
- Vercel timeout: Max 200 streams per execution
- Missing data: Show as gaps, no interpolation
- Chart performance: Downsample to 2,000 points

### Implementation Plan Reference
For detailed code examples, architecture diagrams, and risk mitigation strategies, see:
📄 **`plans/youtube-live-stream-monitor-mvp.md`**

This plan includes:
- Complete Better Auth configuration code
- Drizzle schema with partitioning SQL
- YouTube API client with ETag caching
- LTTB downsampling algorithm
- Email templates with CAN-SPAM compliance
- 4-phase timeline with milestones
- Alternative approaches considered
- Acceptance criteria for all features
