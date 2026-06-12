import "dotenv/config";
import { createDb, apartmentPosts } from "../Homie-Website/src/db/index.ts";

// Use direct connection for writes (pooler skips column defaults)
const db = createDb(process.env.DIRECT_URL ?? process.env.DATABASE_URL!);

const now = new Date();

const [listing] = await db
  .insert(apartmentPosts)
  .values({
    id: crypto.randomUUID(),
    url: "2br-florentin-tel-aviv",
    title: "2BR in Florentin",
    description:
      "Bright 2-bedroom apartment near Rothschild. Recently renovated, lots of natural light.",
    rent: 6500,
    address: "12 Florentin St",
    city: "Tel Aviv",
    neighborhood: "Florentin",
    bedrooms: 2,
    bathrooms: 1,
    sizeSqm: 72,
    floor: 3,
    totalFloors: 5,
    furnished: true,
    listingType: "rent",
    amenities: ["elevator", "balcony", "ac"],
    images: [],
    status: "active",
    createdAt: now,
    updatedAt: now,
  })
  .returning();

console.log("Seeded listing:", listing?.id, listing?.title);

process.exit(0);
