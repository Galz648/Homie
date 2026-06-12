-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('draft', 'active', 'rented', 'archived');

-- CreateEnum
CREATE TYPE "ListingType" AS ENUM ('rent', 'sublet', 'roommate');

-- CreateTable
CREATE TABLE "apartment_posts" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "rent" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ILS',
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "neighborhood" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "bedrooms" INTEGER NOT NULL,
    "bathrooms" DOUBLE PRECISION NOT NULL,
    "sizeSqm" INTEGER,
    "floor" INTEGER,
    "totalFloors" INTEGER,
    "furnished" BOOLEAN NOT NULL DEFAULT false,
    "availableFrom" TIMESTAMP(3),
    "listingType" "ListingType" NOT NULL DEFAULT 'rent',
    "amenities" TEXT[],
    "images" TEXT[],
    "status" "ListingStatus" NOT NULL DEFAULT 'draft',
    "postedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "apartment_posts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "apartment_posts_city_idx" ON "apartment_posts"("city");

-- CreateIndex
CREATE INDEX "apartment_posts_status_idx" ON "apartment_posts"("status");

-- CreateIndex
CREATE INDEX "apartment_posts_postedById_idx" ON "apartment_posts"("postedById");
