-- Baseline: apartment_posts table and enums were created via Prisma.
-- This migration adds the url column required by the Drizzle schema.
ALTER TABLE "apartment_posts" ADD COLUMN IF NOT EXISTS "url" text;--> statement-breakpoint
ALTER TABLE "apartment_posts" ALTER COLUMN "url" SET NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "apartment_posts" ADD CONSTRAINT "apartment_posts_url_unique" UNIQUE("url");
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
