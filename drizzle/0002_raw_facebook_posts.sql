CREATE TABLE IF NOT EXISTS "raw_facebook_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"postId" text NOT NULL,
	"groupId" text NOT NULL,
	"url" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"images" text[] NOT NULL,
	"postedAt" timestamp (3) with time zone,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL,
	CONSTRAINT "raw_facebook_posts_postId_unique" UNIQUE("postId")
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "raw_facebook_posts_group_id_idx" ON "raw_facebook_posts" USING btree ("groupId");--> statement-breakpoint
-- Best-effort copy from legacy apartment_posts when a FB post id is parseable from url.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'apartment_posts'
  ) THEN
    INSERT INTO "raw_facebook_posts" (
      "id", "postId", "groupId", "url", "title", "description", "images",
      "postedAt", "createdAt", "updatedAt"
    )
    SELECT
      ap."id",
      (regexp_match(ap."url", '/(?:posts|permalink)/(\d+)'))[1],
      COALESCE(
        (regexp_match(ap."url", '/groups/([^/]+)'))[1],
        'unknown'
      ),
      ap."url",
      ap."title",
      ap."description",
      ap."images",
      NULL,
      ap."createdAt",
      ap."updatedAt"
    FROM "apartment_posts" ap
    WHERE (regexp_match(ap."url", '/(?:posts|permalink)/(\d+)'))[1] IS NOT NULL
    ON CONFLICT ("postId") DO NOTHING;

    DROP TABLE "apartment_posts";
  END IF;
END $$;--> statement-breakpoint
DROP TYPE IF EXISTS "public"."ListingStatus";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."ListingType";
