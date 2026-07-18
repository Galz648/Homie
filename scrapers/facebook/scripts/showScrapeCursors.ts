/**
 * Print scrape_cursors with Israel-local readable times.
 *
 *   bun run show:cursors
 */
import { createSql } from "../src/pipeline/cursor.js";
import { formatIsraelTime } from "../src/time.js";

async function main(): Promise<void> {
  const sql = createSql();
  try {
    const rows = await sql<
      {
        groupId: string;
        groupUrl: string;
        lastPostId: string | null;
        lastPostedAt: Date | null;
        lastRunAt: Date | null;
        lastStatus: string;
        lastError: string | null;
        postsSeen: number;
        postsNew: number;
      }[]
    >`
      SELECT
        "groupId",
        "groupUrl",
        "lastPostId",
        "lastPostedAt",
        "lastRunAt",
        "lastStatus"::text AS "lastStatus",
        "lastError",
        "postsSeen",
        "postsNew"
      FROM scrape_cursors
      ORDER BY "lastRunAt" DESC NULLS LAST
    `;

    const out = rows.map((r) => ({
      groupId: r.groupId,
      lastPostId: r.lastPostId,
      lastStatus: r.lastStatus,
      postsSeen: r.postsSeen,
      postsNew: r.postsNew,
      lastRunAt: formatIsraelTime(r.lastRunAt),
      lastPostedAt: formatIsraelTime(r.lastPostedAt),
      lastError: r.lastError,
      groupUrl: r.groupUrl,
    }));

    console.log(JSON.stringify(out, null, 2));
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
