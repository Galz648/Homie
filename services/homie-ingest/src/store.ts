import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { apartmentListings } from "./schema.js";
import type { ListingIngestBody, ListingStore, UpsertResult } from "./types.js";

function parseEntryDate(value: string | null | undefined): Date | null {
  if (value == null || value === "") return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`invalid entryDate: ${value}`);
  }
  return d;
}

export function createMemoryStore(): ListingStore & {
  rows: Map<string, ListingIngestBody>;
} {
  const rows = new Map<string, ListingIngestBody>();
  return {
    rows,
    async upsert(listing: ListingIngestBody): Promise<UpsertResult> {
      const created = !rows.has(listing.postId);
      const prev = rows.get(listing.postId);
      rows.set(listing.postId, {
        ...prev,
        ...listing,
        postId: listing.postId,
        currency: listing.currency ?? prev?.currency ?? "ILS",
      });
      return { postId: listing.postId, created };
    },
  };
}

export function createDrizzleStore(databaseUrl: string): ListingStore {
  const client = postgres(databaseUrl, { prepare: false });
  const db = drizzle(client, { schema: { apartmentListings } });

  return {
    async upsert(listing: ListingIngestBody): Promise<UpsertResult> {
      const existing = await db
        .select({ postId: apartmentListings.postId })
        .from(apartmentListings)
        .where(eq(apartmentListings.postId, listing.postId))
        .limit(1);
      const created = existing.length === 0;
      const entryDate = parseEntryDate(listing.entryDate);

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
            updatedAt: new Date(),
          },
        });

      return { postId: listing.postId, created };
    },
  };
}
