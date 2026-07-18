import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

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
    createdAt: timestamp({ withTimezone: true, precision: 3, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp({ withTimezone: true, precision: 3, mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("apartment_listings_post_id_idx").on(table.postId)],
);
