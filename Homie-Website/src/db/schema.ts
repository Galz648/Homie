import {
  boolean,
  doublePrecision,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
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

export type ApartmentPost = typeof apartmentPosts.$inferSelect;
export type NewApartmentPost = typeof apartmentPosts.$inferInsert;
