import { beforeAll, afterAll, describe, expect, test, vi } from "vitest";
import postgres from "postgres";

vi.mock("../src/pipeline/scrapeFeed.ts", () => ({
  scrapeGroupFeed: vi.fn(async () => ({
    posts: [
      {
        postId: "111",
        url: "https://www.facebook.com/groups/mock-e2e/posts/111",
        text: "דירה בתל אביב ₪7500",
      },
      {
        postId: "110",
        url: "https://www.facebook.com/groups/mock-e2e/posts/110",
        text: "roommate near Dizengoff",
      },
    ],
    stopReason: "cold_start_cap" as const,
  })),
}));

import { runScrapePipeline } from "../src/pipeline/runScrape.js";
import { loadCursor } from "../src/pipeline/cursor.js";

const DB =
  process.env.DATABASE_URL ??
  "postgresql://homie:homie@127.0.0.1:54329/homie";

describe("runScrapePipeline (mocked Facebook)", () => {
  const sql = postgres(DB, { max: 2 });
  const groupId = "mock-e2e-group";

  beforeAll(async () => {
    await sql`DELETE FROM scrape_cursors WHERE "groupId" = ${groupId}`;
    await sql`DELETE FROM apartment_posts WHERE url LIKE ${"%/groups/mock-e2e/%"}`;
  });

  afterAll(async () => {
    await sql.end({ timeout: 5 });
  });

  test("upserts drafts and advances watermark without live FB", async () => {
    const report = await runScrapePipeline({
      groupId,
      groupUrl: `https://www.facebook.com/groups/${groupId}`,
      statePath: "/tmp/homie-mock-missing-state.json",
      databaseUrl: DB,
    });

    expect(report.status).toBe("ok");
    expect(report.postsSeen).toBe(2);
    expect(report.postsUpserted).toBeGreaterThan(0);
    expect(report.coldStart).toBe(true);
    expect(report.stopReason).toBe("cold_start_cap");

    const cursor = await loadCursor(sql, groupId);
    expect(cursor?.lastPostId).toBe("111");
    expect(cursor?.lastStatus).toBe("ok");

    const posts = await sql`
      SELECT url, status FROM apartment_posts
      WHERE url LIKE ${"%/groups/mock-e2e/%"}
    `;
    expect(posts.length).toBe(2);
    expect(posts.every((p) => p.status === "draft")).toBe(true);
  });
});
