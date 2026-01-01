-- Migration: Add composite indexes for common query patterns

-- 1. Optimize filtering active user streams (deleted_at IS NULL is common filter)
CREATE INDEX IF NOT EXISTS user_streams_user_id_deleted_at_idx
    ON user_streams(user_id, deleted_at)
    WHERE deleted_at IS NULL;

COMMENT ON INDEX user_streams_user_id_deleted_at_idx IS
'Partial index for active user streams - optimizes filtering by user + active status';

-- 2. Optimize querying unsent alerts by time
CREATE INDEX IF NOT EXISTS stream_changes_alerts_sent_detected_at_idx
    ON stream_changes(alerts_sent, detected_at)
    WHERE alerts_sent = false;

COMMENT ON INDEX stream_changes_alerts_sent_detected_at_idx IS
'Partial index for unsent alerts ordered by time - optimizes alert queue queries';

-- 3. Optimize finding active live streams
CREATE INDEX IF NOT EXISTS streams_is_live_deleted_at_idx
    ON streams(is_live, deleted_at)
    WHERE is_live = true AND deleted_at IS NULL;

COMMENT ON INDEX streams_is_live_deleted_at_idx IS
'Partial index for active live streams - optimizes homepage/dashboard queries';

-- 4. Optimize scheduled streams query
CREATE INDEX IF NOT EXISTS streams_scheduled_start_deleted_at_idx
    ON streams(scheduled_start_time, deleted_at)
    WHERE scheduled_start_time IS NOT NULL AND deleted_at IS NULL;

COMMENT ON INDEX streams_scheduled_start_deleted_at_idx IS
'Partial index for upcoming scheduled streams - optimizes "upcoming" page queries';

-- 5. Add covering index for user stream listing (avoids table lookups)
CREATE INDEX IF NOT EXISTS user_streams_covering_idx
    ON user_streams(user_id, stream_id, alert_on_live, alert_on_scheduled, alert_on_ended)
    WHERE deleted_at IS NULL;

COMMENT ON INDEX user_streams_covering_idx IS
'Covering index for user stream list - includes all commonly selected columns';
