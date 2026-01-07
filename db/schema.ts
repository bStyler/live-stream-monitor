import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  index,
  uniqueIndex,
  primaryKey,
  jsonb,
} from 'drizzle-orm/pg-core';

/**
 * Better Auth Tables
 */

/**
 * user - Better Auth user table
 */
export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),

  // Admin system fields
  role: text('role', { enum: ['user', 'admin'] }).notNull().default('user'),
  streamQuota: integer('stream_quota').notNull().default(5),
  isActive: boolean('is_active').notNull().default(true),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
});

/**
 * session - Better Auth session table
 */
export const session = pgTable('session', {
  id: text('id').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expiresAt', { withTimezone: true }).notNull(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * account - Better Auth account table (for email/password and OAuth)
 */
export const account = pgTable('account', {
  id: text('id').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt', { withTimezone: true }),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt', { withTimezone: true }),
  password: text('password'),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * verification - Better Auth verification table
 */
export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt', { withTimezone: true }).notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * YouTube Stream Monitoring Tables
 */

/**
 * streams - Master table of YouTube live streams being monitored
 */
export const streams = pgTable(
  'streams',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    youtubeVideoId: varchar('youtube_video_id', { length: 20 }).notNull().unique(),
    channelId: varchar('channel_id', { length: 30 }).notNull(),
    channelTitle: varchar('channel_title', { length: 255 }).notNull(),
    title: text('title').notNull(),
    description: text('description'),
    thumbnailUrl: text('thumbnail_url'),

    // Stream status
    isLive: boolean('is_live').notNull().default(false),
    scheduledStartTime: timestamp('scheduled_start_time', { withTimezone: true }),
    actualStartTime: timestamp('actual_start_time', { withTimezone: true }),
    actualEndTime: timestamp('actual_end_time', { withTimezone: true }),

    // Metrics (latest snapshot)
    currentViewerCount: integer('current_viewer_count'),
    peakViewerCount: integer('peak_viewer_count'),
    likeCount: integer('like_count'),

    // Metadata
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    lastFetchedAt: timestamp('last_fetched_at', { withTimezone: true }),

    // Soft delete
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    channelIdIdx: index('streams_channel_id_idx').on(table.channelId),
    isLiveIdx: index('streams_is_live_idx').on(table.isLive),
    scheduledStartTimeIdx: index('streams_scheduled_start_time_idx').on(table.scheduledStartTime),
  })
);

/**
 * userStreams - Many-to-many relationship between users and streams they're monitoring
 */
export const userStreams = pgTable(
  'user_streams',
  {
    userId: text('user_id').notNull(), // Better Auth user ID
    streamId: uuid('stream_id')
      .notNull()
      .references(() => streams.id, { onDelete: 'cascade' }),

    // Alert preferences
    alertOnLive: boolean('alert_on_live').notNull().default(true),
    alertOnScheduled: boolean('alert_on_scheduled').notNull().default(false),
    alertOnEnded: boolean('alert_on_ended').notNull().default(false),

    // Metadata
    addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
    lastViewedAt: timestamp('last_viewed_at', { withTimezone: true }),

    // Soft delete
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.streamId] }),
    userIdIdx: index('user_streams_user_id_idx').on(table.userId),
    streamIdIdx: index('user_streams_stream_id_idx').on(table.streamId),
  })
);

/**
 * streamMetrics - Time-series data for stream metrics (60-second polling)
 * Partitioned by day with 30-day retention (handled by pg_partman)
 */
export const streamMetrics = pgTable(
  'stream_metrics',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    streamId: uuid('stream_id')
      .notNull()
      .references(() => streams.id, { onDelete: 'cascade' }),

    // Metrics snapshot
    viewerCount: integer('viewer_count'), // Concurrent viewers (live)
    likeCount: integer('like_count'),
    viewCount: integer('view_count'), // Total video views (all-time)
    chatMessageRate: integer('chat_message_rate'), // Messages per minute (future)

    // Timestamp
    recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    streamIdRecordedAtIdx: index('stream_metrics_stream_id_recorded_at_idx').on(
      table.streamId,
      table.recordedAt
    ),
    recordedAtIdx: index('stream_metrics_recorded_at_idx').on(table.recordedAt),
  })
);

/**
 * streamChanges - Event log for stream status changes
 * Used for alerting and audit trail
 */
export const streamChanges = pgTable(
  'stream_changes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    streamId: uuid('stream_id')
      .notNull()
      .references(() => streams.id, { onDelete: 'cascade' }),

    // Change details
    changeType: varchar('change_type', { length: 50 }).notNull(), // 'WENT_LIVE', 'ENDED', 'SCHEDULED', 'TITLE_CHANGED', etc.
    oldValue: jsonb('old_value'), // Previous state as JSON
    newValue: jsonb('new_value'), // New state as JSON

    // Metadata
    detectedAt: timestamp('detected_at', { withTimezone: true }).notNull().defaultNow(),

    // Alert tracking
    alertsSent: boolean('alerts_sent').notNull().default(false),
    alertsSentAt: timestamp('alerts_sent_at', { withTimezone: true }),
  },
  (table) => ({
    streamIdDetectedAtIdx: index('stream_changes_stream_id_detected_at_idx').on(
      table.streamId,
      table.detectedAt
    ),
    changeTypeIdx: index('stream_changes_change_type_idx').on(table.changeType),
    alertsSentIdx: index('stream_changes_alerts_sent_idx').on(table.alertsSent),
  })
);

/**
 * dataDeletionLog - Audit trail for data deletion operations
 * Tracks compliance with 30-day retention policy
 */
export const dataDeletionLog = pgTable(
  'data_deletion_log',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    // Deletion details
    tableName: varchar('table_name', { length: 100 }).notNull(),
    deletionType: varchar('deletion_type', { length: 50 }).notNull(), // 'PARTITION_DROP', 'SOFT_DELETE', 'HARD_DELETE'
    recordsDeleted: integer('records_deleted').notNull(),
    oldestRecordDate: timestamp('oldest_record_date', { withTimezone: true }),

    // Metadata
    deletedAt: timestamp('deleted_at', { withTimezone: true }).notNull().defaultNow(),
    deletedBy: varchar('deleted_by', { length: 100 }).notNull().default('SYSTEM'), // 'SYSTEM' or user ID
    notes: text('notes'),
  },
  (table) => ({
    tableNameDeletedAtIdx: index('data_deletion_log_table_name_deleted_at_idx').on(
      table.tableName,
      table.deletedAt
    ),
  })
);

/**
 * Admin System Tables
 */

/**
 * invitations - User invitation system for admins
 */
export const invitations = pgTable(
  'invitations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: text('email').notNull(),
    token: text('token').notNull().unique(),
    streamQuota: integer('stream_quota').notNull().default(5),
    invitedBy: text('invited_by')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    status: text('status', { enum: ['pending', 'accepted', 'expired'] })
      .notNull()
      .default('pending'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  },
  (table) => ({
    tokenIdx: uniqueIndex('invitations_token_idx').on(table.token),
    emailIdx: index('invitations_email_idx').on(table.email),
    statusIdx: index('invitations_status_idx').on(table.status),
  })
);

/**
 * impersonationLogs - Audit trail for admin impersonation
 */
export const impersonationLogs = pgTable(
  'impersonation_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    adminId: text('admin_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    targetUserId: text('target_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
  },
  (table) => ({
    adminIdIdx: index('impersonation_logs_admin_id_idx').on(table.adminId),
    targetUserIdIdx: index('impersonation_logs_target_user_id_idx').on(table.targetUserId),
    startedAtIdx: index('impersonation_logs_started_at_idx').on(table.startedAt),
  })
);
