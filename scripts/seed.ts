import "dotenv/config";
import { createDb, rawFacebookPosts } from "../Homie-Website/src/db/index.ts";

// Use direct connection for writes (pooler skips column defaults)
const db = createDb(process.env.DIRECT_URL ?? process.env.DATABASE_URL!);

const now = new Date();

const [post] = await db
  .insert(rawFacebookPosts)
  .values({
    id: crypto.randomUUID(),
    postId: "100000000000001",
    groupId: "35819517694",
    url: "https://www.facebook.com/groups/35819517694/posts/100000000000001",
    title: "2BR in Florentin",
    description:
      "Bright 2-bedroom apartment near Rothschild. Recently renovated, lots of natural light. ₪6500",
    images: [],
    postedAt: now,
    createdAt: now,
    updatedAt: now,
  })
  .returning();

console.log("Seeded raw post:", post?.id, post?.title);

process.exit(0);
