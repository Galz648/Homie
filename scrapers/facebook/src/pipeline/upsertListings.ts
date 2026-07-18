import type { Sql } from "./cursor.js";
import { persistListingImages } from "./images.js";
import type { ScrapedPost } from "./types.js";

function titleFromText(text: string, postId: string): string {
  const line = text.split(/[.!\n]/).map((s) => s.trim()).find(Boolean);
  if (line && line.length >= 8) return line.slice(0, 120);
  return `Facebook post ${postId}`;
}

function guessRent(text: string): number {
  const m = text.match(/(?:₪|ILS|NIS|ש"?ח)\s*([\d,]+)|([\d,]+)\s*(?:₪|ILS|NIS|ש"?ח)/i);
  if (!m) return 0;
  const raw = (m[1] || m[2] || "").replace(/,/g, "");
  const n = Number(raw);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

/**
 * Upsert scraped posts into apartment_posts (dedupe by url).
 * FB posts are often unstructured — store as draft with best-effort fields.
 */
export async function upsertScrapedPosts(
  sql: Sql,
  posts: ScrapedPost[],
): Promise<{ upserted: number; newest: ScrapedPost | null }> {
    let upserted = 0;

  for (const post of posts) {
    const images = await persistListingImages([]);
    const title = titleFromText(post.text || "", post.postId);
    const description =
      post.text?.trim() ||
      `(imported from Facebook group post ${post.postId})`;
    const rent = guessRent(post.text || "");

    const rows = await sql`
      INSERT INTO apartment_posts (
        url, title, description, rent, currency, address, city,
        bedrooms, bathrooms, amenities, images, status
      ) VALUES (
        ${post.url},
        ${title},
        ${description},
        ${rent},
        'ILS',
        'unknown',
        'Tel Aviv',
        0,
        1,
        ${sql.array([] as string[])},
        ${sql.array(images)},
        'draft'
      )
      ON CONFLICT (url) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        rent = EXCLUDED.rent,
        "updatedAt" = now()
      RETURNING id
    `;
    if (rows.length > 0) {
      upserted += 1;
    }
  }

  return { upserted, newest: posts[0] ?? null };
}
