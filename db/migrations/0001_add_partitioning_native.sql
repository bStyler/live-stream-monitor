-- Migration: Add native PostgreSQL partitioning to stream_metrics table

-- Step 1: Rename existing table as backup
ALTER TABLE stream_metrics RENAME TO stream_metrics_old;

-- Step 2: Create new partitioned table
CREATE TABLE stream_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    stream_id uuid NOT NULL,
    viewer_count integer,
    like_count integer,
    chat_message_rate integer,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL,
    PRIMARY KEY (id, recorded_at),
    CONSTRAINT stream_metrics_stream_id_streams_id_fk
        FOREIGN KEY (stream_id) REFERENCES streams(id) ON DELETE CASCADE
) PARTITION BY RANGE (recorded_at);

-- Step 3: Drop old indexes (they don't automatically get renamed when table is renamed)
DROP INDEX IF EXISTS stream_metrics_stream_id_recorded_at_idx;
DROP INDEX IF EXISTS stream_metrics_recorded_at_idx;

-- Step 4: Create new indexes on partitioned table
CREATE INDEX stream_metrics_stream_id_recorded_at_idx
    ON stream_metrics USING btree (stream_id, recorded_at);

CREATE INDEX stream_metrics_recorded_at_idx
    ON stream_metrics USING btree (recorded_at);

-- Step 5: Create default partition for data outside range
CREATE TABLE stream_metrics_default PARTITION OF stream_metrics DEFAULT;

-- Step 6: Helper function to create partitions
CREATE OR REPLACE FUNCTION create_stream_metrics_partition(partition_date DATE)
RETURNS TEXT AS $$
DECLARE
    partition_name TEXT;
    start_date TEXT;
    end_date TEXT;
BEGIN
    partition_name := 'stream_metrics_' || TO_CHAR(partition_date, 'YYYY_MM_DD');
    start_date := partition_date::TEXT;
    end_date := (partition_date + INTERVAL '1 day')::DATE::TEXT;

    IF EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = partition_name AND n.nspname = 'public'
    ) THEN
        RETURN 'Partition ' || partition_name || ' already exists';
    END IF;

    EXECUTE format(
        'CREATE TABLE %I PARTITION OF stream_metrics FOR VALUES FROM (%L) TO (%L)',
        partition_name, start_date, end_date
    );

    RETURN 'Created partition ' || partition_name;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Helper function to drop old partitions
CREATE OR REPLACE FUNCTION drop_old_stream_metrics_partitions(retention_days INTEGER DEFAULT 30)
RETURNS TABLE(dropped_partition TEXT) AS $$
DECLARE
    partition_record RECORD;
    cutoff_date DATE;
    partition_date DATE;
BEGIN
    cutoff_date := CURRENT_DATE - retention_days;

    FOR partition_record IN
        SELECT c.relname as partition_name
        FROM pg_inherits
        JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
        JOIN pg_class c ON pg_inherits.inhrelid = c.oid
        JOIN pg_namespace nmsp_parent ON nmsp_parent.oid = parent.relnamespace
        WHERE parent.relname = 'stream_metrics'
            AND nmsp_parent.nspname = 'public'
            AND c.relname != 'stream_metrics_default'
            AND c.relname ~ '^stream_metrics_\d{4}_\d{2}_\d{2}$'
    LOOP
        BEGIN
            partition_date := TO_DATE(
                SUBSTRING(partition_record.partition_name FROM 'stream_metrics_(.*)'),
                'YYYY_MM_DD'
            );

            IF partition_date < cutoff_date THEN
                EXECUTE format('DROP TABLE IF EXISTS %I', partition_record.partition_name);
                dropped_partition := partition_record.partition_name;
                RETURN NEXT;
            END IF;
        EXCEPTION
            WHEN OTHERS THEN
                CONTINUE;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create partitions for -1 day through +7 days
DO $$
DECLARE
    i INTEGER;
BEGIN
    FOR i IN -1..7 LOOP
        PERFORM create_stream_metrics_partition(CURRENT_DATE + i);
    END LOOP;
END $$;

-- Step 8: Copy data from old table (if any)
INSERT INTO stream_metrics (id, stream_id, viewer_count, like_count, chat_message_rate, recorded_at)
SELECT id, stream_id, viewer_count, like_count, chat_message_rate, recorded_at
FROM stream_metrics_old;

-- Step 9: Drop old table
DROP TABLE stream_metrics_old CASCADE;

-- Step 10: Create monitoring view
CREATE OR REPLACE VIEW partition_info AS
SELECT
    c.relname as partition_name,
    pg_size_pretty(pg_total_relation_size('public.' || c.relname)) AS size,
    (
        SELECT count(*)
        FROM pg_inherits i2
        JOIN pg_class c2 ON i2.inhrelid = c2.oid
        WHERE i2.inhparent = c.oid
    ) as row_count
FROM pg_inherits
JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
JOIN pg_class c ON pg_inherits.inhrelid = c.oid
JOIN pg_namespace nmsp_parent ON nmsp_parent.oid = parent.relnamespace
WHERE parent.relname = 'stream_metrics'
    AND nmsp_parent.nspname = 'public'
ORDER BY c.relname;
