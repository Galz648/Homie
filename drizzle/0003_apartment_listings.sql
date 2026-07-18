CREATE TABLE IF NOT EXISTS "apartment_listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"postId" text NOT NULL,
	"price" integer,
	"currency" text DEFAULT 'ILS' NOT NULL,
	"entryDate" timestamp (3) with time zone,
	"contactPhone" text,
	"address" text,
	"conditionals" text,
	"createdAt" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "apartment_listings_postId_unique" UNIQUE("postId")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "apartment_listings_post_id_idx" ON "apartment_listings" USING btree ("postId");
