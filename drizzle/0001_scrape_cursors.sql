DO $$ BEGIN
 CREATE TYPE "public"."ScrapeCursorStatus" AS ENUM('never', 'ok', 'auth', 'empty_suspect', 'parse', 'throttle', 'crash');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "scrape_cursors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" text DEFAULT 'facebook_group' NOT NULL,
	"groupId" text NOT NULL,
	"groupUrl" text NOT NULL,
	"lastPostId" text,
	"lastPostedAt" timestamp (3) with time zone,
	"lastRunAt" timestamp (3) with time zone,
	"lastStatus" "ScrapeCursorStatus" DEFAULT 'never' NOT NULL,
	"lastError" text,
	"postsSeen" integer DEFAULT 0 NOT NULL,
	"postsNew" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scrape_cursors_source_group_id_unique" UNIQUE("source","groupId")
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scrape_cursors_last_status_idx" ON "scrape_cursors" USING btree ("lastStatus");
