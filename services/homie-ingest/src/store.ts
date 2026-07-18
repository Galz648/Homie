import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { apartmentListings, rawFacebookPosts } from "./schema.js";
import type { ListingIngestBody, ListingStore, UpsertResult } from "./types.js";

function parseEntryDate(value: string | null | undefined): Date | null {
  if (value == null || value === "") return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`invalid entryDate: ${value}`);
  }
  return d;
}

export type MemoryListingRow = ListingIngestBody & { images: string[] };

/**
 * In-memory store for tests/local dev without a DB.
 * There is no `raw_facebook_posts` table to copy from here, so — unlike
 * `createDrizzleStore` — this store trusts `images` on the request body
 * (defaulting to the previous row's images, then `[]`). This is a test-only
 * convenience; the drizzle store is the real source of truth and always
 * copies images from raw_facebook_posts by postId.
 */
export function createMemoryStore(): ListingStore & {
  rows: Map<string, MemoryListingRow>;
} {
  const rows = new Map<string, MemoryListingRow>();
  return {
    rows,
    async upsert(listing: ListingIngestBody): Promise<UpsertResult> {
      const created = !rows.has(listing.postId);
      const prev = rows.get(listing.postId);
      const images = listing.images ?? prev?.images ?? [];
      rows.set(listing.postId, {
        ...prev,
        ...listing,
        postId: listing.postId,
        currency: listing.currency ?? prev?.currency ?? "ILS",
        images,
      });
      return { postId: listing.postId, created, images };
    },
  };
}

export function createDrizzleStore(databaseUrl: string): ListingStore {
  const client = postgres(databaseUrl, { prepare: false });
  const db = drizzle(client, { schema: { apartmentListings, rawFacebookPosts } });

  return {
    async upsert(listing: ListingIngestBody): Promise<UpsertResult> {
      const existing = await db
        .select({ postId: apartmentListings.postId })
        .from(apartmentListings)
        .where(eq(apartmentListings.postId, listing.postId))
        .limit(1);
      const created = existing.length === 0;
      const entryDate = parseEntryDate(listing.entryDate);

      // Images are never trusted from the request body — always copy from
      // raw_facebook_posts by postId (source of truth from the scraper).
      const rawRows = await db
        .select({ images: rawFacebookPosts.images, url: rawFacebookPosts.url })
        .from(rawFacebookPosts)
        .where(eq(rawFacebookPosts.postId, listing.postId))
        .limit(1);
      const raw = rawRows[0];
      const images = raw?.images ?? [];

      await db
        .insert(apartmentListings)
        .values({
          postId: listing.postId,
          price: listing.price ?? null,
          currency: listing.currency ?? "ILS",
          entryDate,
          contactPhone: listing.contactPhone ?? null,
          address: listing.address ?? null,
          conditionals: listing.conditionals ?? null,
          images,
        })
        .onConflictDoUpdate({
          target: apartmentListings.postId,
          set: {
            price: listing.price ?? null,
            currency: listing.currency ?? "ILS",
            entryDate,
            contactPhone: listing.contactPhone ?? null,
            address: listing.address ?? null,
            conditionals: listing.conditionals ?? null,
            images,
            updatedAt: new Date(),
          },
        });

      return { postId: listing.postId, created, images, postUrl: raw?.url };
    },
  };
}
