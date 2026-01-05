CREATE TABLE "data_deletion_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"table_name" varchar(100) NOT NULL,
	"deletion_type" varchar(50) NOT NULL,
	"records_deleted" integer NOT NULL,
	"oldest_record_date" timestamp with time zone,
	"deleted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_by" varchar(100) DEFAULT 'SYSTEM' NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "stream_changes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stream_id" uuid NOT NULL,
	"change_type" varchar(50) NOT NULL,
	"old_value" jsonb,
	"new_value" jsonb,
	"detected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"alerts_sent" boolean DEFAULT false NOT NULL,
	"alerts_sent_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "stream_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stream_id" uuid NOT NULL,
	"viewer_count" integer,
	"like_count" integer,
	"chat_message_rate" integer,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "streams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"youtube_video_id" varchar(20) NOT NULL,
	"channel_id" varchar(30) NOT NULL,
	"channel_title" varchar(255) NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"thumbnail_url" text,
	"is_live" boolean DEFAULT false NOT NULL,
	"scheduled_start_time" timestamp with time zone,
	"actual_start_time" timestamp with time zone,
	"actual_end_time" timestamp with time zone,
	"current_viewer_count" integer,
	"peak_viewer_count" integer,
	"like_count" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_fetched_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "streams_youtube_video_id_unique" UNIQUE("youtube_video_id")
);
--> statement-breakpoint
CREATE TABLE "user_streams" (
	"user_id" text NOT NULL,
	"stream_id" uuid NOT NULL,
	"alert_on_live" boolean DEFAULT true NOT NULL,
	"alert_on_scheduled" boolean DEFAULT false NOT NULL,
	"alert_on_ended" boolean DEFAULT false NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_viewed_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "user_streams_user_id_stream_id_pk" PRIMARY KEY("user_id","stream_id")
);
--> statement-breakpoint
ALTER TABLE "stream_changes" ADD CONSTRAINT "stream_changes_stream_id_streams_id_fk" FOREIGN KEY ("stream_id") REFERENCES "public"."streams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stream_metrics" ADD CONSTRAINT "stream_metrics_stream_id_streams_id_fk" FOREIGN KEY ("stream_id") REFERENCES "public"."streams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_streams" ADD CONSTRAINT "user_streams_stream_id_streams_id_fk" FOREIGN KEY ("stream_id") REFERENCES "public"."streams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "data_deletion_log_table_name_deleted_at_idx" ON "data_deletion_log" USING btree ("table_name","deleted_at");--> statement-breakpoint
CREATE INDEX "stream_changes_stream_id_detected_at_idx" ON "stream_changes" USING btree ("stream_id","detected_at");--> statement-breakpoint
CREATE INDEX "stream_changes_change_type_idx" ON "stream_changes" USING btree ("change_type");--> statement-breakpoint
CREATE INDEX "stream_changes_alerts_sent_idx" ON "stream_changes" USING btree ("alerts_sent");--> statement-breakpoint
CREATE INDEX "stream_metrics_stream_id_recorded_at_idx" ON "stream_metrics" USING btree ("stream_id","recorded_at");--> statement-breakpoint
CREATE INDEX "stream_metrics_recorded_at_idx" ON "stream_metrics" USING btree ("recorded_at");--> statement-breakpoint
CREATE INDEX "streams_channel_id_idx" ON "streams" USING btree ("channel_id");--> statement-breakpoint
CREATE INDEX "streams_is_live_idx" ON "streams" USING btree ("is_live");--> statement-breakpoint
CREATE INDEX "streams_scheduled_start_time_idx" ON "streams" USING btree ("scheduled_start_time");--> statement-breakpoint
CREATE INDEX "user_streams_user_id_idx" ON "user_streams" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_streams_stream_id_idx" ON "user_streams" USING btree ("stream_id");