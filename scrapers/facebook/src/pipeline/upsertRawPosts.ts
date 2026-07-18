import type { Sql } from "./cursor.js";
import { persistListingImages } from "./images.js";
import type { ScrapedPost } from "./types.js";

function titleFromText(text: string, postId: string): string {
  const line = text.split(/[.!\n]/).map((s) => s.trim()).find(Boolean);
  if (line && line.length >= 8) return line.slice(0, 120);
  return `Facebook post ${postId}`;
}

/**
 * Upsert scraped posts into raw_facebook_posts (dedupe by Facebook postId).
 */
export async function upsertScrapedPosts(
  sql: Sql,
  groupId: string,
  posts: ScrapedPost[],
): Promise<{ upserted: number; newest: ScrapedPost | null }> {
  let upserted = 0;

  for (const post of posts) {
    const images = await persistListingImages(post.imageUrls ?? []);
    const title = titleFromText(post.text || "", post.postId);
    const description =
      post.text?.trim() ||
      `(imported from Facebook group post ${post.postId})`;

    const rows = await sql`
      INSERT INTO raw_facebook_posts (
        "postId", "groupId", url, title, description, images, "postedAt"
      ) VALUES (
        ${post.postId},
        ${groupId},
        ${post.url},
        ${title},
        ${description},
        ${sql.array(images)},
        ${post.postedAt ?? null}
      )
      ON CONFLICT ("postId") DO UPDATE SET
        "groupId" = EXCLUDED."groupId",
        url = EXCLUDED.url,
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        images = EXCLUDED.images,
        "postedAt" = COALESCE(EXCLUDED."postedAt", raw_facebook_posts."postedAt"),
        "updatedAt" = now()
      RETURNING id
    `;
    if (rows.length > 0) {
      upserted += 1;
    }
  }

  return { upserted, newest: posts[0] ?? null };
}
