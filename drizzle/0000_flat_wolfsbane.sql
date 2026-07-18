-- Greenfield-safe baseline (Prisma-era DBs already have these objects).
DO $$ BEGIN
 CREATE TYPE "public"."ListingStatus" AS ENUM('draft', 'active', 'rented', 'archived');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."ListingType" AS ENUM('rent', 'sublet', 'roommate');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "apartment_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"rent" integer NOT NULL,
	"currency" text DEFAULT 'ILS' NOT NULL,
	"address" text NOT NULL,
	"city" text NOT NULL,
	"neighborhood" text,
	"latitude" double precision,
	"longitude" double precision,
	"bedrooms" integer NOT NULL,
	"bathrooms" double precision NOT NULL,
	"sizeSqm" integer,
	"floor" integer,
	"totalFloors" integer,
	"furnished" boolean DEFAULT false NOT NULL,
	"availableFrom" timestamp (3),
	"listingType" "ListingType" DEFAULT 'rent' NOT NULL,
	"amenities" text[] NOT NULL,
	"images" text[] NOT NULL,
	"status" "ListingStatus" DEFAULT 'draft' NOT NULL,
	"postedById" uuid,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "apartment_posts" ADD COLUMN IF NOT EXISTS "url" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "apartment_posts" ALTER COLUMN "url" SET NOT NULL;
EXCEPTION
 WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "apartment_posts" ADD CONSTRAINT "apartment_posts_url_unique" UNIQUE("url");
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "apartment_posts_city_idx" ON "apartment_posts" USING btree ("city");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "apartment_posts_status_idx" ON "apartment_posts" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "apartment_posts_postedById_idx" ON "apartment_posts" USING btree ("postedById");
