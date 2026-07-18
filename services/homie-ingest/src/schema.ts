import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/** Mirrors Homie-Website apartment_listings (ingest service owns its copy). */
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
    conditionals: text(),
    /** Copied from raw_facebook_posts.images by postId on upsert — never client-supplied. */
    images: text().array().notNull().default([]),
    createdAt: timestamp({ withTimezone: true, precision: 3, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true, precision: 3, mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("apartment_listings_post_id_idx").on(table.postId)],
);

/**
 * Minimal mirror of Homie-Website raw_facebook_posts.
 * Ingest only ever SELECTs `images`/`url` by `postId` — it never writes this table
 * (the scraper owns inserts), so columns beyond what we read are intentionally omitted.
 */
export const rawFacebookPosts = pgTable("raw_facebook_posts", {
  postId: text().notNull().unique(),
  url: text().notNull(),
  images: text().array().notNull(),
});
