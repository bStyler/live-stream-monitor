# Product Requirements Document: YouTube Live Stream Monitor

**Version:** 2.0
**Date:** December 30, 2025
**Status:** Approved - Ready for Implementation
**Owner:** Product Team
**Implementation Plan:** See `plans/youtube-live-stream-monitor-mvp.md`

---

## Executive Summary

YouTube Live Stream Monitor is a new SaaS platform being built from scratch to track 24/7 live streams on YouTube (with future Twitch support). The system polls YouTube's Data API every minute to capture real-time metrics (concurrent viewers, likes, views), detects metadata changes (title, thumbnail, description), and displays this data on interactive time-series charts. The platform enforces YouTube's 30-day data retention policy through automated pruning and provides alert capabilities for stream outages and significant viewer drops.

**Current State:** Greenfield project - building from scratch
**This PRD Scope:** Complete YouTube monitoring system with authentication, time-series visualization, change tracking, and alerting
**Key Constraint:** Maximum 30-day data retention per YouTube/Google API policies

---

## Key Technical Decisions

### Technology Stack (2025 Best Practices)

**Authentication:** Better Auth (framework-agnostic, PostgreSQL-native)
- ✅ Chosen over NextAuth (complex config) and Clerk (paid, vendor lock-in)
- ✅ Modern framework with bcrypt hashing, CSRF protection, rate limiting
- ✅ PostgreSQL adapter with connection pooling optimization

**ORM:** Drizzle ORM (type-safe, serverless-optimized)
- ✅ Chosen over Prisma (14x better serverless performance)
- ✅ Smaller bundle size, better for time-series operations
- ✅ Flexible raw SQL support when needed

**Charts:** Recharts (flexible, real-time capable)
- ✅ Chosen over Tremor (more flexible for custom requirements)
- ✅ Better support for real-time data updates
- ✅ Easier optimization for large datasets (43,200 points)

**Database Strategy:** PostgreSQL with Manual Partitioning
- ✅ Native Vercel Postgres support (no additional services)
- ✅ Daily table partitions with pg_partman for 30-day retention
- ✅ Simpler than TimescaleDB for MVP scale
- ✅ Clear migration path to TimescaleDB if needed

**Real-Time Updates:** Client-Side Polling (TanStack Query)
- ✅ Simplest for MVP, perfect for serverless
- ✅ 60-second refresh interval acceptable UX
- ✅ Can upgrade to WebSocket/SSE post-MVP if needed

**Deployment:** Vercel (unified platform)
- ✅ Best Next.js integration
- ✅ Built-in Postgres, Cron, and CDN
- ✅ Zero-config deployment

### Resolved Architecture Questions

**Q: Email verification required?**
- **Decision:** Optional for MVP (can enable later in Better Auth config)

**Q: Password requirements?**
- **Decision:** Minimum 8 characters, enforced by Better Auth

**Q: Session duration?**
- **Decision:** 7 days with automatic refresh, Better Auth managed

**Q: Add offline streams?**
- **Decision:** Yes, allow adding offline streams for future monitoring

**Q: YouTube API quota exceeded?**
- **Decision:** Log error, skip poll, alert admin, graceful degradation

**Q: Vercel function timeout (10s)?**
- **Decision:** Max 200 streams per cron execution, upgrade to Pro if needed

**Q: Email delivery failure?**
- **Decision:** Retry once after 5 minutes, log as failed

**Q: Chart missing data points?**
- **Decision:** Show as gaps (null values), no interpolation

**Q: 30-day chart performance?**
- **Decision:** Downsample to 2,000 points using LTTB algorithm

---

## Problem Statement

### The Problem

Content creators and organizations running 24/7 YouTube live streams currently lack effective monitoring solutions:

1. **No Real-Time Metrics Visualization**: No way to see historical trends for concurrent viewers, likes, and views over time
2. **No Change Tracking**: Title, thumbnail, and description updates are not logged or tracked
3. **Manual Monitoring Required**: Content creators must manually check streams for status and performance
4. **No Automated Alerts**: No notifications when streams go offline or experience significant viewer drops
5. **Data Retention Compliance**: Existing tools don't respect YouTube's 30-day data retention policy
6. **API Inefficiency**: No solutions efficiently handle multiple users monitoring the same streams

### Impact

- Users must manually check streams for status and performance trends
- No historical context for troubleshooting performance issues or optimizing content
- Extended downtime periods go unnoticed, resulting in viewer and revenue loss
- Risk of YouTube API Terms of Service violations with non-compliant data retention
- Wasted API quota from duplicate monitoring requests

---

## Objectives

### Primary Objectives

1. **Implement Time-Series Data Collection**: Poll YouTube Data API every minute to capture viewers, likes, and views
2. **Build Interactive Charts**: Display metrics with selectable time ranges (Today, Last 7 days, Last 14 days, Last 30 days)
3. **Track Metadata Changes**: Log and visualize title, thumbnail, and description updates on timeline
4. **Ensure YouTube Compliance**: Automatically prune data older than 30 days
5. **Optimize API Usage**: Deduplicate data collection when multiple users monitor the same stream
6. **Enable Alerting**: Send email notifications for stream outages and configurable threshold breaches

### Success Criteria

- ✅ Metrics collected every 60 seconds with <5 second variance
- ✅ Charts render in <2 seconds with 30 days of data
- ✅ 100% compliance with 30-day data retention policy (zero violations)
- ✅ API quota savings >50% through deduplication for shared streams
- ✅ Alerts delivered within 2 minutes of detection

---

## User Personas

### Persona 1: Content Creator (Primary User)
- **Background**: Runs 1-3 YouTube live streams (lofi music, study streams, ambient content)
- **Current Workflow**: Manually checks viewer count multiple times per day
- **Pain Points**:
  - Can't see viewer trends over time
  - Doesn't know when stream went offline until viewers complain
  - No way to correlate title changes with viewer fluctuations
- **Goals**:
  - Monitor stream health at a glance
  - Receive immediate alerts if stream goes down
  - Analyze which titles/thumbnails perform better

### Persona 2: Multi-Channel Manager (Secondary User)
- **Background**: Manages 10-20 streams across different channels
- **Current Workflow**: Spreadsheet tracking of stream status, manual checks every hour
- **Pain Points**:
  - Too time-consuming to manually monitor all streams
  - Misses outages on lower-priority streams
  - Can't identify patterns across channels
- **Goals**:
  - Centralized dashboard for all monitored streams
  - Automated alerting with configurable thresholds per stream
  - Historical data to optimize streaming schedules

---

## Functional Requirements

### Core Monitoring Features

#### FR-1: YouTube Stream Data Collection
**Priority:** P0 (Must Have)

**Description:** System must poll YouTube Data API to collect real-time stream metrics

**Requirements:**
- Poll every 60 seconds (±5 second variance acceptable)
- Collect per stream:
  - Concurrent viewer count
  - Total likes
  - Total views
  - Live stream status (online/offline)
  - Thumbnail URL
  - Video title
  - Video description
- Use single master YouTube Data API key (shared across all users)
- Batch API requests when possible (YouTube allows up to 50 video IDs per request)
- Handle API failures gracefully (retry with exponential backoff, log errors)

**Acceptance Criteria:**
- Given a stream is being monitored
- When the polling interval elapses
- Then the system makes a YouTube Data API call using video ID
- And stores metrics with timestamp (±5 second accuracy)
- And updates stream status (online/offline)

---

#### FR-2: Stream Deduplication
**Priority:** P0 (Must Have)

**Description:** Prevent duplicate data collection when multiple users monitor the same stream

**Requirements:**
- Maintain a master `streams` table with unique video IDs
- When user adds stream:
  - Check if video ID already exists
  - If exists: Create reference to existing stream (don't create duplicate)
  - If new: Create new stream record and start monitoring
- Poll each unique video ID only once per minute regardless of how many users monitor it
- User-specific settings (alert thresholds) stored separately from stream data

**Acceptance Criteria:**
- Given video ID "ABC123" is already monitored by User A
- When User B adds video ID "ABC123"
- Then system creates a user-stream relationship (not a duplicate stream)
- And polling occurs once per minute for "ABC123" (not twice)
- And both users see the same metrics data

**Database Schema (Conceptual):**
```
users
- id
- username
- email
- created_at

streams (deduplicated)
- id
- video_id (unique)
- title
- thumbnail_url
- description
- is_live (boolean)
- last_checked_at
- created_at

user_streams (many-to-many)
- id
- user_id (FK)
- stream_id (FK)
- alert_threshold_viewer_drop (percentage)
- alert_enabled (boolean)
- created_at
```

---

#### FR-3: Time-Series Metrics Storage
**Priority:** P0 (Must Have)

**Description:** Store metrics data with timestamps for historical charting

**Requirements:**
- Store metrics every minute with:
  - stream_id (reference to streams table)
  - timestamp (UTC, second precision)
  - concurrent_viewers (integer)
  - total_likes (integer)
  - total_views (integer)
  - is_live (boolean)
- Optimize for time-range queries (Today, Last 7 days, Last 14 days, Last 30 days)
- Support aggregation queries (hourly/daily averages for longer time ranges)

**Acceptance Criteria:**
- Given metrics are collected every minute
- When querying for "Last 7 days"
- Then return all data points within the date range
- And query executes in <2 seconds for 30 days of data

**Database Schema (Conceptual):**
```
stream_metrics (time-series data)
- id
- stream_id (FK, indexed)
- timestamp (indexed)
- concurrent_viewers
- total_likes
- total_views
- is_live
- created_at

Indexes:
- (stream_id, timestamp DESC) - for time-range queries
- (timestamp) - for data pruning
```

---

#### FR-4: Metadata Change Tracking
**Priority:** P0 (Must Have)

**Description:** Detect and log changes to stream title, thumbnail, and description

**Requirements:**
- On each API poll, compare current metadata with previous values
- If changed, insert record into `stream_changes` log table
- Track changes for:
  - Title (old_value → new_value)
  - Thumbnail URL (old_value → new_value)
  - Description (old_value → new_value)
- Display changes on timeline alongside metrics chart
- Store full old/new values (not diffs) for complete audit trail

**Acceptance Criteria:**
- Given stream title changes from "Lofi Hip Hop Radio" to "Lofi Hip Hop - 24/7 Study Beats"
- When next polling cycle executes
- Then system detects title mismatch
- And inserts change log entry with timestamp, old_title, new_title
- And timeline displays "Title changed" marker at timestamp

**Database Schema (Conceptual):**
```
stream_changes (change log)
- id
- stream_id (FK)
- timestamp
- change_type (enum: 'title', 'thumbnail', 'description')
- old_value (text)
- new_value (text)
- created_at

Index:
- (stream_id, timestamp DESC) - for timeline queries
```

---

#### FR-5: Interactive Time-Series Charts
**Priority:** P0 (Must Have)

**Description:** Display metrics on interactive charts with selectable time ranges

**Requirements:**
- Chart types:
  - Line chart for concurrent viewers over time
  - Separate charts or overlays for likes and views (TBD during design)
- Time range selector with options:
  - Today (00:00 to now)
  - Last 7 days
  - Last 14 days
  - Last 30 days
- Display change log markers on timeline (title/thumbnail/description changes)
- Auto-refresh chart data every 60 seconds when viewing "Today"
- Support zoom/pan interactions (optional enhancement)

**Acceptance Criteria:**
- Given user selects "Last 7 days" time range
- When chart renders
- Then X-axis shows last 7 days with appropriate time granularity
- And Y-axis shows concurrent viewer count
- And change markers appear at corresponding timestamps
- And tooltip shows exact values on hover

**UI Components (using shadcn/ui):**
- Chart component (consider Recharts or similar library compatible with React)
- Time range selector (Button group or Tabs)
- Stream card showing thumbnail, title, current status
- Change log timeline overlay

---

#### FR-6: 30-Day Data Retention Policy
**Priority:** P0 (Must Have - Compliance Requirement)

**Description:** Automatically delete data older than 30 days to comply with YouTube API Terms of Service

**Requirements:**
- Daily cron job runs at 00:00 UTC
- Deletes records from:
  - `stream_metrics` where `timestamp < NOW() - INTERVAL '30 days'`
  - `stream_changes` where `timestamp < NOW() - INTERVAL '30 days'`
- Log deletion activity (number of records removed, timestamp)
- Ensure no data is retained beyond 30 days (zero tolerance for compliance)

**Acceptance Criteria:**
- Given data exists from 31 days ago
- When daily pruning job runs
- Then all records older than 30 days are deleted
- And deletion is logged
- And database contains no records >30 days old

**Technical Implementation:**
- Option 1: PostgreSQL scheduled job (pg_cron extension)
- Option 2: Next.js API route triggered by cron service (Vercel Cron, GitHub Actions)
- Option 3: Table partitioning by month with automatic partition dropping

---

### Alert & Notification Features

#### FR-7: Stream Offline Detection
**Priority:** P1 (Should Have)

**Description:** Detect when stream goes offline and send email alert

**Requirements:**
- On each polling cycle, check `is_live` status from YouTube API
- If status changes from `true` to `false`:
  - Mark stream as offline in database
  - Send email notification via Resend to all users monitoring that stream
  - Email includes: stream title, offline timestamp, link to dashboard
- If status changes from `false` to `true`:
  - Mark stream as online
  - Optionally send "stream back online" notification (configurable per user)

**Acceptance Criteria:**
- Given stream is currently live
- When YouTube API reports stream is offline
- Then system updates `is_live = false` in database
- And sends email to all monitoring users within 2 minutes
- And email contains stream title and offline timestamp

**Email Integration:**
- Use Resend API for transactional emails
- Email template includes: stream thumbnail, title, status change, timestamp
- Unsubscribe link in footer (compliance)

---

#### FR-8: Viewer Drop Threshold Alerts
**Priority:** P1 (Should Have)

**Description:** Alert users when concurrent viewers drop by configurable percentage

**Requirements:**
- Allow users to set threshold per stream (default: 20%)
- On each polling cycle:
  - Compare current concurrent viewers with previous value (1 minute ago)
  - Calculate percentage drop: `((prev - current) / prev) * 100`
  - If drop >= threshold:
    - Send email alert via Resend
    - Include: stream title, viewer count (before/after), percentage drop, timestamp
- Rate limiting: Don't send duplicate alerts within 10 minutes for same stream

**Acceptance Criteria:**
- Given stream has 500 viewers at 10:00 AM
- And user has 20% drop threshold configured
- When viewers drop to 350 at 10:01 AM (30% drop)
- Then system calculates 30% drop
- And sends email alert to user
- And does not send another alert until 10:11 AM (10-minute cooldown)

**User Configuration:**
```
user_streams table additions:
- alert_enabled (boolean, default: true)
- alert_threshold_viewer_drop (integer, default: 20) - percentage
- last_alert_sent_at (timestamp) - for rate limiting
```

---

### User Management Features

#### FR-9: User Authentication & Account Management
**Priority:** P0 (Must Have)

**Description:** Secure user registration, login, and account management system using Better Auth

**Requirements:**
- User registration with email and password
- Email verification for new accounts (optional for MVP, configurable in Better Auth)
- Secure login with bcrypt password hashing (cost factor 12+)
- Password reset functionality via email token using Resend
- Session management with secure cookies (httpOnly, sameSite)
- Google OAuth SSO (optional enhancement via Better Auth provider)
- User profile management (update email, change password)
- Account deletion with data cleanup
- Built-in CSRF protection
- Database-backed rate limiting (10 attempts per minute)

**Acceptance Criteria:**
- Given a new user visits the registration page
- When they provide email and password (min 8 characters)
- Then account is created with bcrypt hashed password
- And user can log in with credentials
- And session is maintained across page refreshes for 7 days
- And session auto-refreshes after 1 day of activity
- And logout clears session securely

**Database Schema:**
Better Auth automatically creates these tables:
```sql
-- Better Auth managed tables
users:
- id (TEXT PRIMARY KEY)
- email (TEXT UNIQUE NOT NULL)
- name (TEXT)
- emailVerified (BOOLEAN DEFAULT false)
- image (TEXT)
- createdAt (TIMESTAMP)
- updatedAt (TIMESTAMP)

sessions:
- id (TEXT PRIMARY KEY)
- userId (TEXT REFERENCES users(id))
- expiresAt (TIMESTAMP)
- token (TEXT UNIQUE)
- createdAt (TIMESTAMP)

accounts:
- id (TEXT PRIMARY KEY)
- userId (TEXT REFERENCES users(id))
- accountId (TEXT NOT NULL)
- providerId (TEXT NOT NULL)
- accessToken (TEXT)
- refreshToken (TEXT)
- expiresAt (TIMESTAMP)
- createdAt (TIMESTAMP)

verificationTokens:
- id (TEXT PRIMARY KEY)
- identifier (TEXT NOT NULL)
- token (TEXT UNIQUE NOT NULL)
- expiresAt (TIMESTAMP)
```

**Security Requirements:**
- Passwords must be minimum 8 characters (configurable)
- Bcrypt hashing with cost factor 12+ (Better Auth default)
- Session tokens stored as httpOnly, sameSite cookies
- CSRF protection enabled by default
- Rate limiting on auth routes: 10 requests per minute per IP
- Database-backed session storage for multi-instance support

**Implementation:**
```typescript
// lib/auth.ts
import { betterAuth } from "better-auth"
import { Pool } from "pg"

export const auth = betterAuth({
  appName: "YouTube Live Stream Monitor",
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,

  database: new Pool({
    connectionString: process.env.POSTGRES_URL,
    max: 1, // Serverless optimization
    idleTimeoutMillis: 5000
  }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    async sendResetPassword({ user, url }) {
      await sendEmail({
        to: user.email,
        subject: "Reset your password",
        template: "password-reset",
        data: { url }
      })
    }
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update after 1 day
    freshAge: 60 * 10 // Fresh for 10 minutes
  },

  rateLimit: {
    enabled: true,
    window: 60,
    max: 10,
    storage: "database"
  }
})
```

---

#### FR-10: Workspace Management
**Priority:** P2 (Deferred to Phase 2)

**Description:** Each user has a workspace for organizing streams and team collaboration

**Current State:** Not implemented
**Decision:** Use single user account for MVP, defer workspace/team features to Phase 2

**Future Considerations:**
- Multi-workspace support per user
- Workspace-level settings and billing
- Team member invitations
- Role-based access within workspaces

---

## Technical Architecture

### Database: PostgreSQL with Drizzle ORM

**Rationale:**
- ✅ Excellent support for time-series data with proper indexing
- ✅ Native interval/timestamp functions for data retention queries
- ✅ Table partitioning for efficient 30-day pruning
- ✅ JSONB support for flexible metadata storage
- ✅ Mature ecosystem, easy deployment (Vercel Postgres)
- ✅ Can add TimescaleDB extension later if needed for advanced time-series features

**ORM Choice: Drizzle ORM**
- ✅ 14x better performance than Prisma in serverless environments
- ✅ Type-safe queries with excellent TypeScript inference
- ✅ Smaller bundle size (critical for Next.js edge functions)
- ✅ Better for time-series data operations
- ✅ Flexible raw SQL support when needed

**Partitioning Strategy:**
- Daily partitions for `stream_metrics` table
- 30 partitions total (one per day)
- Automatic partition management with `pg_partman` extension
- Old partitions dropped automatically after 30 days
- Composite indexes on each partition: `(stream_id, timestamp DESC)`

**Alternative Considered:**
- TimescaleDB: Overkill for current scale, adds complexity
- InfluxDB: Specialized time-series DB, but requires separate service
- MongoDB: Less optimal for time-range aggregations
- Prisma ORM: 14x slower in serverless, larger bundle size

### Database Schema (Drizzle ORM)

```typescript
// db/schema.ts
import { pgTable, serial, varchar, text, timestamp, boolean, integer, uniqueIndex, index } from 'drizzle-orm/pg-core'

// Better Auth creates: users, sessions, accounts, verificationTokens

// Streams table (deduplicated by video_id)
export const streams = pgTable('streams', {
  id: serial('id').primaryKey(),
  videoId: varchar('video_id', { length: 50 }).notNull().unique(),
  title: text('title').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  description: text('description'),
  isLive: boolean('is_live').default(false),
  lastCheckedAt: timestamp('last_checked_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  videoIdIdx: uniqueIndex('idx_streams_video_id').on(table.videoId),
  lastCheckedIdx: index('idx_streams_last_checked').on(table.lastCheckedAt)
}))

// User-Stream relationship (many-to-many)
export const userStreams = pgTable('user_streams', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  streamId: integer('stream_id').notNull().references(() => streams.id, { onDelete: 'cascade' }),
  alertEnabled: boolean('alert_enabled').default(true),
  alertThresholdViewerDrop: integer('alert_threshold_viewer_drop').default(20),
  lastAlertSentAt: timestamp('last_alert_sent_at'),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => ({
  userStreamUnique: uniqueIndex('idx_user_stream_unique').on(table.userId, table.streamId),
  userIdx: index('idx_user_streams_user').on(table.userId),
  streamIdx: index('idx_user_streams_stream').on(table.streamId)
}))

// Stream metrics (time-series data - will be partitioned)
export const streamMetrics = pgTable('stream_metrics', {
  id: serial('id').primaryKey(),
  streamId: integer('stream_id').notNull().references(() => streams.id, { onDelete: 'cascade' }),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  concurrentViewers: integer('concurrent_viewers').default(0),
  totalLikes: integer('total_likes').default(0),
  totalViews: integer('total_views').default(0),
  isLive: boolean('is_live').default(false),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => ({
  streamTimeIdx: index('idx_metrics_stream_timestamp').on(table.streamId, table.timestamp.desc()),
  timestampIdx: index('idx_metrics_timestamp').on(table.timestamp)
}))

// Stream changes log
export const streamChanges = pgTable('stream_changes', {
  id: serial('id').primaryKey(),
  streamId: integer('stream_id').notNull().references(() => streams.id, { onDelete: 'cascade' }),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  changeType: varchar('change_type', { length: 20 }).notNull(), // 'title', 'thumbnail', 'description'
  oldValue: text('old_value'),
  newValue: text('new_value'),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => ({
  streamTimeIdx: index('idx_changes_stream_timestamp').on(table.streamId, table.timestamp.desc()),
  timestampIdx: index('idx_changes_timestamp').on(table.timestamp)
}))

// Deletion log (for compliance auditing)
export const dataDeletionLog = pgTable('data_deletion_log', {
  id: serial('id').primaryKey(),
  deletedAt: timestamp('deleted_at').defaultNow(),
  tableName: varchar('table_name', { length: 50 }).notNull(),
  recordsDeleted: integer('records_deleted').notNull(),
  oldestTimestamp: timestamp('oldest_timestamp'),
  newestTimestamp: timestamp('newest_timestamp')
})
```

**Partitioning Setup (Manual SQL after Drizzle migration):**

```sql
-- db/migrations/partition-stream-metrics.sql
-- Convert stream_metrics to partitioned table

ALTER TABLE stream_metrics RENAME TO stream_metrics_old;

CREATE TABLE stream_metrics (
    id BIGSERIAL,
    stream_id INTEGER NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    concurrent_viewers INTEGER DEFAULT 0,
    total_likes INTEGER DEFAULT 0,
    total_views INTEGER DEFAULT 0,
    is_live BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (id, timestamp)
) PARTITION BY RANGE (timestamp);

-- Create initial 30 daily partitions
-- Example for 2025-12-30
CREATE TABLE stream_metrics_2025_12_30
    PARTITION OF stream_metrics
    FOR VALUES FROM ('2025-12-30 00:00:00+00') TO ('2025-12-31 00:00:00+00');

-- Install pg_partman for auto-management
CREATE EXTENSION IF NOT EXISTS pg_partman;

SELECT partman.create_parent(
    'public.stream_metrics',
    'timestamp',
    'native',
    'daily',
    p_start_partition := '2025-12-01'
);

-- Set 30-day retention
UPDATE partman.part_config
SET retention = '30 days',
    retention_keep_table = false
WHERE parent_table = 'public.stream_metrics';

-- Create indexes on each partition
CREATE INDEX CONCURRENTLY idx_metrics_20251230_stream_time
    ON stream_metrics_2025_12_30 (stream_id, timestamp DESC);
```

### Data Pruning Implementation

**Daily Cron Job (Next.js API Route):**

```typescript
// app/api/cron/prune-data/route.ts
export async function GET(request: Request) {
  // Verify cron secret for security
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Delete old metrics
  const metricsResult = await db.query(
    'DELETE FROM stream_metrics WHERE timestamp < $1 RETURNING count(*)',
    [thirtyDaysAgo]
  );

  // Delete old changes
  const changesResult = await db.query(
    'DELETE FROM stream_changes WHERE timestamp < $1 RETURNING count(*)',
    [thirtyDaysAgo]
  );

  // Log deletion for compliance
  await db.query(
    `INSERT INTO data_deletion_log (table_name, records_deleted, oldest_timestamp)
     VALUES ('stream_metrics', $1, $2), ('stream_changes', $3, $4)`,
    [metricsResult.rowCount, thirtyDaysAgo, changesResult.rowCount, thirtyDaysAgo]
  );

  return Response.json({
    success: true,
    metricsDeleted: metricsResult.rowCount,
    changesDeleted: changesResult.rowCount
  });
}
```

**Vercel Cron Configuration (vercel.json):**

```json
{
  "crons": [{
    "path": "/api/cron/prune-data",
    "schedule": "0 0 * * *"
  }]
}
```

---

### YouTube API Integration

**Polling Service (Background Job):**

```typescript
// lib/youtube-poller.ts
import { youtube_v3 } from 'googleapis';

export async function pollYouTubeMetrics() {
  // 1. Get all unique video IDs that need polling
  const streams = await db.query(
    'SELECT id, video_id FROM streams WHERE is_live = true OR last_checked_at < NOW() - INTERVAL \'55 seconds\''
  );

  const videoIds = streams.rows.map(s => s.video_id);

  // 2. Batch YouTube API request (up to 50 IDs per request)
  const youtube = getYouTubeClient();
  const response = await youtube.videos.list({
    part: ['snippet', 'liveStreamingDetails', 'statistics'],
    id: videoIds
  });

  // 3. Process each video
  for (const video of response.data.items || []) {
    const stream = streams.rows.find(s => s.video_id === video.id);

    // Extract metrics
    const metrics = {
      concurrent_viewers: video.liveStreamingDetails?.concurrentViewers || 0,
      total_likes: video.statistics?.likeCount || 0,
      total_views: video.statistics?.viewCount || 0,
      is_live: !!video.liveStreamingDetails?.actualStartTime
    };

    // Insert metrics
    await db.query(
      `INSERT INTO stream_metrics (stream_id, timestamp, concurrent_viewers, total_likes, total_views, is_live)
       VALUES ($1, NOW(), $2, $3, $4, $5)`,
      [stream.id, metrics.concurrent_viewers, metrics.total_likes, metrics.total_views, metrics.is_live]
    );

    // Check for metadata changes
    await checkMetadataChanges(stream.id, video);

    // Update stream last_checked_at
    await db.query('UPDATE streams SET last_checked_at = NOW() WHERE id = $1', [stream.id]);
  }
}

async function checkMetadataChanges(streamId: number, video: youtube_v3.Schema$Video) {
  const current = await db.query('SELECT title, thumbnail_url, description FROM streams WHERE id = $1', [streamId]);

  const changes = [];
  if (current.rows[0].title !== video.snippet?.title) {
    changes.push({ type: 'title', old: current.rows[0].title, new: video.snippet?.title });
  }
  // ... similar checks for thumbnail and description

  // Insert change logs
  for (const change of changes) {
    await db.query(
      'INSERT INTO stream_changes (stream_id, timestamp, change_type, old_value, new_value) VALUES ($1, NOW(), $2, $3, $4)',
      [streamId, change.type, change.old, change.new]
    );
  }

  // Update stream metadata
  if (changes.length > 0) {
    await db.query(
      'UPDATE streams SET title = $1, thumbnail_url = $2, description = $3 WHERE id = $4',
      [video.snippet?.title, video.snippet?.thumbnails?.high?.url, video.snippet?.description, streamId]
    );
  }
}
```

---

## Non-Functional Requirements

### Performance

**NFR-1: Chart Rendering**
- Load 30 days of data and render chart in <2 seconds
- Support up to 43,200 data points per stream (1 per minute × 30 days)

**NFR-2: API Polling**
- Poll all monitored streams within 60-second window
- Handle up to 1,000 unique streams (requires 20 batched API calls at 50 IDs each)

**NFR-3: Database Query Optimization**
- Time-range queries execute in <500ms
- Use indexes on (stream_id, timestamp) for efficient filtering

### Reliability

**NFR-4: Data Accuracy**
- 99.9% polling success rate (tolerate <0.1% missed polls due to YouTube API errors)
- Retry failed API calls with exponential backoff (3 retries max)

**NFR-5: Compliance**
- 100% data deletion compliance (zero records >30 days old)
- Audit log retention for deletion operations (indefinite)

### Scalability

**NFR-6: YouTube API Quota Management**
- Free tier: 10,000 quota units/day
- Videos.list costs 1 unit per request (batch of 50 IDs)
- Maximum streams monitorable with free quota: ~14,000 polls/day = 233 streams polled every minute

**NFR-7: Vertical Scaling Path**
- Use table partitioning for >1M records
- Consider TimescaleDB extension if query performance degrades

### Security

**NFR-8: API Key Management**
- Store YouTube API key in environment variable (never commit to code)
- Rotate API key quarterly
- Monitor quota usage to detect abuse

**NFR-9: User Data Protection**
- User passwords hashed with bcrypt (cost factor 12)
- Email addresses encrypted at rest (future enhancement)

---

## Success Metrics

### Data Quality Metrics

**Metric 1: Polling Reliability**
- **Target**: 99.9% successful polls
- **Measurement**: (Successful polls / Total poll attempts) × 100

**Metric 2: Data Completeness**
- **Target**: <1% missing data points
- **Measurement**: Count of expected metrics (1 per minute) vs actual records

### Compliance Metrics

**Metric 3: Data Retention Compliance**
- **Target**: 100% compliance (zero violations)
- **Measurement**: Daily query for `MAX(timestamp)` in metrics table, ensure <30 days

**Metric 4: Pruning Job Success Rate**
- **Target**: 100% successful daily pruning jobs
- **Measurement**: Check `data_deletion_log` for daily entries

### User Engagement Metrics

**Metric 5: Streams Monitored**
- **Target**: 100 unique streams within first month
- **Measurement**: `COUNT(DISTINCT video_id) FROM streams`

**Metric 6: Alert Effectiveness**
- **Target**: 90% of offline events trigger alerts within 2 minutes
- **Measurement**: Time delta between `is_live = false` and email sent timestamp

---

## Assumptions & Constraints

### Assumptions

1. **YouTube API Stability**: YouTube Data API v3 remains available with current quota limits and endpoint structure
2. **Stream Continuity**: Monitored streams run 24/7 (not scheduled intermittent broadcasts)
3. **Single API Key Sufficiency**: One master YouTube API key provides enough quota for target stream count (<200 streams)
4. **Email Delivery**: Resend service maintains >99% email delivery rate
5. **User Behavior**: Users add streams they intend to monitor long-term (low churn)

### Constraints

**Technical Constraints:**
1. **YouTube API Quota**: 10,000 units/day on free tier (limits to ~233 streams at 1 min polling)
2. **Polling Frequency**: Cannot poll more frequently than every 30 seconds without quota issues
3. **Data Retention**: Hard limit of 30 days per YouTube API Terms of Service
4. **API Response Time**: YouTube API typically responds in 200-500ms, but can spike to 2+ seconds

**Business Constraints:**
1. **Development Resources**: Small team (2 developers)
2. **Timeline**: MVP within 8 weeks
3. **Infrastructure Budget**: Use free tiers where possible (Vercel, Supabase/Railway free tier)

**Regulatory Constraints:**
1. **YouTube ToS Compliance**: Must comply with YouTube API Terms of Service Section 3.3 (30-day limit)
2. **GDPR/CCPA**: User data (emails) must have opt-out mechanisms for alerts
3. **Email Compliance**: CAN-SPAM Act requires unsubscribe links in all alert emails

---

## Out of Scope

### Explicitly Excluded from MVP

1. **Multi-Platform Support**
   - Twitch integration (future Phase 2)
   - Other platforms (Facebook Live, TikTok Live)

2. **Advanced Analytics**
   - Peak viewer time analysis
   - Correlation between title changes and viewer growth
   - Sentiment analysis from YouTube comments
   - Revenue/monetization tracking

3. **Workspace Features**
   - Per-user workspaces (deferred to Phase 2)
   - Team collaboration tools
   - Shared dashboards

4. **Real-Time Streaming**
   - WebSocket-based live updates (using 60-second refresh acceptable for MVP)

5. **Mobile Apps**
   - Native iOS/Android apps (mobile-responsive web is sufficient)

6. **Advanced Alerting**
   - SMS alerts (email only for MVP)
   - Phone call alerts
   - Slack/Discord integration (future)
   - PagerDuty integration

7. **Stream Quality Metrics**
   - Bitrate monitoring
   - Buffering ratio
   - Resolution changes
   - Audio/video quality scores

8. **Automated Actions**
   - Auto-restart streams
   - Auto-update titles/descriptions
   - Integration with OBS/streaming software

---

## Implementation Phases

### Phase 1: Core Monitoring & Authentication (Weeks 1-4)
**Deliverables:**
- ✅ Database schema with PostgreSQL (all tables)
- ✅ User authentication system (registration, login, session management)
- ✅ Protected routes and middleware
- ✅ YouTube API polling service (background job)
- ✅ Stream deduplication logic
- ✅ Metrics collection (viewers, likes, views)
- ✅ 30-day data retention cron job
- ✅ Basic stream management UI (add/remove streams)

### Phase 2: Visualization & Change Tracking (Weeks 5-6)
**Deliverables:**
- ✅ Interactive time-series charts (Recharts or similar)
- ✅ Time range selector (Today, 7d, 14d, 30d)
- ✅ Metadata change detection (title, thumbnail, description)
- ✅ Change log timeline overlay on charts
- ✅ Dashboard UI with stream cards

### Phase 3: Alerting (Weeks 7-8)
**Deliverables:**
- ✅ Resend email integration
- ✅ Offline stream alerts
- ✅ Viewer drop threshold alerts
- ✅ User alert preferences UI
- ✅ Alert rate limiting logic

### Phase 4: Polish & Launch (Week 9)
**Deliverables:**
- ✅ shadcn/ui component refinements
- ✅ Mobile responsiveness testing
- ✅ Performance optimization
- ✅ Documentation
- ✅ Deployment to production

---

## Technical Recommendations

### Infrastructure: Vercel (Consolidated Platform)

**Decision:** Use Vercel as the unified platform for hosting, database, and scheduled jobs to minimize complexity and operational overhead.

**Vercel Services:**
- **Next.js Hosting**: Serverless deployment with edge functions
- **Vercel Postgres**: Managed PostgreSQL database with connection pooling
- **Vercel Cron**: Scheduled jobs for data pruning and YouTube API polling
- **Vercel KV** (optional): Redis-compatible key-value store for rate limiting and caching

**Benefits:**
- ✅ Single platform for all infrastructure needs
- ✅ Seamless integration between services
- ✅ Zero-config deployment from GitHub
- ✅ Automatic HTTPS and CDN
- ✅ Built-in environment variable management
- ✅ Free tier sufficient for MVP, easy upgrade path

**Pricing:**
- Hobby Plan: Free (good for MVP and initial users)
- Pro Plan: $20/month (recommended for production)
- Postgres: $0.30/GB storage, included compute on Pro
- Estimated MVP cost: $0-20/month

---

### Recommended Tech Stack

**Frontend:**
- Next.js 16 (App Router) ✅ Already chosen
- React 19 with Server Components ✅
- shadcn/ui (Radix Maia) ✅
- **Recharts** for charts (chosen over Tremor for flexibility)
- **TanStack Query** for data fetching with 60s auto-refresh

**Backend:**
- Next.js API Routes for REST endpoints
- Vercel Cron for scheduled jobs (data pruning, polling every minute)
- YouTube Data API v3 client library (`@googleapis/youtube`)

**Database:**
- **Vercel Postgres** (PostgreSQL 15 with pgbouncer connection pooling)
- **Drizzle ORM** for type-safe queries (14x faster than Prisma in serverless)
- Daily table partitioning with pg_partman for 30-day retention
- Binary COPY / INSERT...UNNEST for high-performance batch inserts

**Email:**
- **Resend** for transactional email delivery (100 emails/day free tier)
- **React Email** for HTML templating with plain text fallback

**Authentication:**
- **Better Auth** for user authentication (modern, PostgreSQL-native)
- bcrypt for password hashing (cost factor 12+)
- httpOnly, sameSite cookies for sessions
- Built-in CSRF protection and rate limiting

**Hosting & Infrastructure:**
- Vercel for application hosting
- Vercel Postgres for database
- Vercel Cron for background jobs
- Vercel KV for caching (optional)

**Monitoring & Observability:**
- Vercel Analytics for web performance
- Sentry for error tracking
- Custom admin dashboard for YouTube API quota monitoring

---

## Required Accounts & API Keys

### Must Have (P0 - Required for MVP)

#### 1. Vercel Account
- **Purpose**: Hosting, database, cron jobs
- **Setup**: [vercel.com/signup](https://vercel.com/signup)
- **Plan**: Start with Hobby (free), upgrade to Pro for production
- **Actions**:
  - Connect GitHub repository
  - Add Vercel Postgres storage
  - Configure environment variables
  - Set up Vercel Cron in vercel.json

#### 2. YouTube Data API Key
- **Purpose**: Poll stream metrics (viewers, likes, views, metadata)
- **Setup**: [Google Cloud Console](https://console.cloud.google.com/)
- **Cost**: Free tier (10,000 quota units/day, ~347 streams)
- **Steps**:
  1. Create new Google Cloud project
  2. Enable "YouTube Data API v3"
  3. Create API Key under Credentials
  4. Restrict key to YouTube Data API v3 only (security)
  5. Add to Vercel environment variables as `YOUTUBE_API_KEY`

#### 3. Resend API Key
- **Purpose**: Send transactional email alerts
- **Setup**: [resend.com/signup](https://resend.com/signup)
- **Cost**: Free tier (100 emails/day, 3,000/month)
- **Steps**:
  1. Sign up and verify email
  2. Add and verify your domain (or use resend.dev for testing)
  3. Generate API key from dashboard
  4. Add to Vercel as `RESEND_API_KEY`

#### 4. Random Secrets (Generate Locally)
- **Purpose**: Secure authentication and cron endpoints
- **Generate with**: `openssl rand -base64 32`
- **Required secrets**:
  - `NEXTAUTH_SECRET`: JWT signing and session encryption
  - `CRON_SECRET`: Protect cron endpoints from unauthorized access

### Optional (P2 - Future Enhancement)

#### 5. Google OAuth Credentials
- **Purpose**: "Sign in with Google" functionality
- **Setup**: Google Cloud Console (same project as YouTube API)
- **Steps**:
  1. Enable Google+ API
  2. Create OAuth 2.0 Client ID
  3. Add authorized redirect URI: `https://yourdomain.com/api/auth/callback/google`
  4. Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to Vercel

#### 6. Sentry Account (Optional)
- **Purpose**: Error tracking and monitoring
- **Setup**: [sentry.io/signup](https://sentry.io/signup)
- **Cost**: Free tier (5K events/month)

---

## Environment Variables Setup

All environment variables are documented in `.env.example` file. Key variables:

```bash
# Database (auto-configured by Vercel Postgres)
POSTGRES_URL="postgresql://user:password@host:5432/database"
POSTGRES_PRISMA_URL="postgresql://user:password@host:5432/database?pgbouncer=true"
POSTGRES_URL_NO_SSL="postgresql://user:password@host:5432/database"
POSTGRES_URL_NON_POOLING="postgresql://user:password@host:5432/database"

# YouTube API
YOUTUBE_API_KEY="AIzaSy..."

# Email (Resend)
RESEND_API_KEY="re_..."
EMAIL_FROM="alerts@yourdomain.com"
EMAIL_FROM_NAME="Stream Monitor Alerts"

# Better Auth
BETTER_AUTH_SECRET="<generated-with-openssl-rand-base64-32>"
BETTER_AUTH_URL="http://localhost:3000" # Production: https://yourdomain.com
# DATABASE_URL will use POSTGRES_URL by default

# Cron Security
CRON_SECRET="<generated-with-openssl-rand-base64-32>"

# Optional: Google OAuth (Better Auth provider)
# GOOGLE_CLIENT_ID="..."
# GOOGLE_CLIENT_SECRET="..."

# Application
NODE_ENV="development" # production | test
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

**Setup Steps:**
1. Copy `.env.example` to `.env.local` for local development
2. Fill in all required values
3. For Vercel Postgres: Run `vercel env pull .env.local` after adding Postgres storage
4. For production: Set all variables in Vercel Dashboard > Settings > Environment Variables

---

## Vercel Configuration Files

### vercel.json (Cron Jobs)

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

**Cron Jobs:**
- `poll-youtube`: Runs every minute to fetch stream metrics
- `prune-data`: Runs daily at midnight UTC to delete data >30 days old

---

## Appendix

### Database Index Strategy

**Critical Indexes:**
```sql
-- Fast stream lookup by video_id
CREATE INDEX idx_streams_video_id ON streams(video_id);

-- Time-range queries (most common query pattern)
CREATE INDEX idx_metrics_stream_timestamp ON stream_metrics(stream_id, timestamp DESC);

-- Data pruning efficiency
CREATE INDEX idx_metrics_timestamp ON stream_metrics(timestamp);
CREATE INDEX idx_changes_timestamp ON stream_changes(timestamp);

-- User's streams lookup
CREATE INDEX idx_user_streams_user ON user_streams(user_id);
```

### Example Queries

**Get metrics for last 7 days:**
```sql
SELECT timestamp, concurrent_viewers, total_likes, total_views
FROM stream_metrics
WHERE stream_id = $1
  AND timestamp >= NOW() - INTERVAL '7 days'
ORDER BY timestamp DESC;
```

**Get all changes with metrics:**
```sql
SELECT
  m.timestamp,
  m.concurrent_viewers,
  c.change_type,
  c.new_value
FROM stream_metrics m
LEFT JOIN stream_changes c ON c.stream_id = m.stream_id
  AND c.timestamp BETWEEN m.timestamp - INTERVAL '30 seconds' AND m.timestamp + INTERVAL '30 seconds'
WHERE m.stream_id = $1
  AND m.timestamp >= NOW() - INTERVAL '30 days'
ORDER BY m.timestamp DESC;
```

### YouTube API Quota Calculation

**API Costs:**
- `videos.list` (batch of 50 IDs): 1 quota unit
- Daily free quota: 10,000 units

**Calculation for 200 streams:**
- 200 streams / 50 per batch = 4 batched requests
- 4 requests × 1 unit = 4 quota units per poll
- 1,440 minutes/day ÷ 1 min polling = 1,440 polls/day
- 4 units × 1,440 polls = 5,760 quota units/day
- ✅ Within 10,000 unit daily limit

**Max Streams on Free Tier:**
- 10,000 units / 1,440 polls = ~6.94 units per poll
- 6.94 units × 50 IDs/batch = ~347 streams maximum

---

## Glossary

- **Video ID**: Unique YouTube identifier (e.g., "dQw4w9WgXcQ" from youtube.com/watch?v=dQw4w9WgXcQ)
- **Concurrent Viewers**: Number of viewers watching live stream at specific timestamp
- **Polling Interval**: Time between YouTube API requests (60 seconds for this system)
- **Change Log**: Record of metadata updates (title, thumbnail, description)
- **Deduplication**: Preventing multiple database records for same video ID
- **Data Pruning**: Automated deletion of records >30 days old
- **Quota Unit**: YouTube API usage measurement (varies by endpoint)

---

## Revision History

| Version | Date       | Author       | Changes                                      |
|---------|------------|--------------|----------------------------------------------|
| 1.0     | 2025-12-15 | Product Team | Initial PRD based on actual system requirements |
| 2.0     | 2025-12-30 | Product Team | Technical decisions finalized: Better Auth, Drizzle ORM, Recharts. Resolved 47 critical questions from SpecFlow analysis. Added partitioning strategy, downsampling algorithm, and comprehensive implementation guidance. |

---

**Document Status**: ✅ Approved - Ready for Implementation
**Implementation Plan**: See `plans/youtube-live-stream-monitor-mvp.md` for detailed 9-week implementation guide
**Next Steps**:
1. ✅ Comprehensive plan created with resolved architecture questions
2. Begin Phase 0: Environment setup and API key configuration
3. Phase 1: Better Auth integration and Drizzle ORM schema
4. Refer to `todos.md` for detailed task breakdown with dependencies
