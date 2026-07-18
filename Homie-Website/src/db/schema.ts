import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

/** Last scrape run outcome for a source/group cursor (W6a). */
export const scrapeCursorStatusEnum = pgEnum("ScrapeCursorStatus", [
  "never",
  "ok",
  "auth",
  "empty_suspect",
  "parse",
  "throttle",
  "crash",
]);

/**
 * Raw Facebook group posts (pre-LLM extraction).
 * Dedup / upsert key: Facebook `postId` (globally unique in practice).
 */
export const rawFacebookPosts = pgTable(
  "raw_facebook_posts",
  {
    id: uuid().primaryKey().defaultRandom(),
    postId: text().notNull().unique(),
    groupId: text().notNull(),
    url: text().notNull(),
    title: text().notNull(),
    description: text().notNull(),
    images: text().array().notNull(),
    postedAt: timestamp({ withTimezone: true, precision: 3, mode: "date" }),
    createdAt: timestamp({ precision: 3, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp({ precision: 3, mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("raw_facebook_posts_group_id_idx").on(table.groupId)],
);

/**
 * Per-group scrape watermark (W6a).
 * Advance lastPostId / lastPostedAt only after a successful upsert batch.
 */
export const scrapeCursors = pgTable(
  "scrape_cursors",
  {
    id: uuid().primaryKey().defaultRandom(),
    source: text().notNull().default("facebook_group"),
    groupId: text().notNull(),
    groupUrl: text().notNull(),
    lastPostId: text(),
    lastPostedAt: timestamp({ withTimezone: true, precision: 3, mode: "date" }),
    lastRunAt: timestamp({ withTimezone: true, precision: 3, mode: "date" }),
    lastStatus: scrapeCursorStatusEnum().notNull().default("never"),
    lastError: text(),
    postsSeen: integer().notNull().default(0),
    postsNew: integer().notNull().default(0),
    createdAt: timestamp({ withTimezone: true, precision: 3, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true, precision: 3, mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    unique("scrape_cursors_source_group_id_unique").on(table.source, table.groupId),
    index("scrape_cursors_last_status_idx").on(table.lastStatus),
  ],
);

/**
 * Cleaned / LLM-extracted apartment listings (post-Agent ingest).
 * Upsert key: Facebook `postId` (same identity as raw_facebook_posts).
 * Soft fields may be null when extraction misses them — treat as anomaly at the API boundary.
 */
export const apartmentListings = pgTable(
  "apartment_listings",
  {
    id: uuid().primaryKey().defaultRandom(),
    postId: text().notNull().unique(),
    price: integer(),
    currency: text().notNull().default("ILS"),
    entryDate: timestamp({ withTimezone: true, precision: 3, mode: "date" }),
    contactPhone: text(),
    address: text(),
    /** Freeform caveats / conditionals from the source post. */
    conditionals: text(),
    /** Copied from raw_facebook_posts.images by postId on ingest upsert. */
    images: text().array().notNull().default([]),
    createdAt: timestamp({ withTimezone: true, precision: 3, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true, precision: 3, mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("apartment_listings_post_id_idx").on(table.postId)],
);

export type RawFacebookPost = typeof rawFacebookPosts.$inferSelect;
export type NewRawFacebookPost = typeof rawFacebookPosts.$inferInsert;
export type ScrapeCursor = typeof scrapeCursors.$inferSelect;
export type NewScrapeCursor = typeof scrapeCursors.$inferInsert;
export type ApartmentListing = typeof apartmentListings.$inferSelect;
export type NewApartmentListing = typeof apartmentListings.$inferInsert;
