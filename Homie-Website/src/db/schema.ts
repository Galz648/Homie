import {
  boolean,
  doublePrecision,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const listingStatusEnum = pgEnum("ListingStatus", [
  "draft",
  "active",
  "rented",
  "archived",
]);

export const listingTypeEnum = pgEnum("ListingType", [
  "rent",
  "sublet",
  "roommate",
]);

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

export const apartmentPosts = pgTable(
  "apartment_posts",
  {
    id: uuid().primaryKey().defaultRandom(),
    url: text().notNull().unique(),
    title: text().notNull(),
    description: text().notNull(),
    rent: integer().notNull(),
    currency: text().notNull().default("ILS"),
    address: text().notNull(),
    city: text().notNull(),
    neighborhood: text(),
    latitude: doublePrecision(),
    longitude: doublePrecision(),
    bedrooms: integer().notNull(),
    bathrooms: doublePrecision().notNull(),
    sizeSqm: integer(),
    floor: integer(),
    totalFloors: integer(),
    furnished: boolean().notNull().default(false),
    availableFrom: timestamp({ precision: 3, mode: "date" }),
    listingType: listingTypeEnum().notNull().default("rent"),
    amenities: text().array().notNull(),
    images: text().array().notNull(),
    status: listingStatusEnum().notNull().default("draft"),
    postedById: uuid(),
    createdAt: timestamp({ precision: 3, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp({ precision: 3, mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("apartment_posts_city_idx").on(table.city),
    index("apartment_posts_status_idx").on(table.status),
    index("apartment_posts_postedById_idx").on(table.postedById),
  ],
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
    createdAt: timestamp({ withTimezone: true, precision: 3, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp({ withTimezone: true, precision: 3, mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    unique("scrape_cursors_source_group_id_unique").on(
      table.source,
      table.groupId,
    ),
    index("scrape_cursors_last_status_idx").on(table.lastStatus),
  ],
);

export type ApartmentPost = typeof apartmentPosts.$inferSelect;
export type NewApartmentPost = typeof apartmentPosts.$inferInsert;
export type ScrapeCursor = typeof scrapeCursors.$inferSelect;
export type NewScrapeCursor = typeof scrapeCursors.$inferInsert;
