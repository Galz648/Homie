ALTER TABLE "apartment_listings" ADD COLUMN IF NOT EXISTS "images" text[] DEFAULT '{}' NOT NULL;
