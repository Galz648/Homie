import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import postgres from "postgres";
import { runScrapePipeline } from "../src/pipeline/runScrape.js";
import {
  ensureCursor,
  loadCursor,
  markRunOutcome,
} from "../src/pipeline/cursor.js";
import { scrapeRunPolicy } from "../src/scrapeRunPolicy.js";
import { TEST_DATABASE_URL, makePosts } from "./helpers/mockFixtures.js";

const GROUP_PREFIX = "cursor-edge";

describe("cursor edge cases", () => {
  const sql = postgres(TEST_DATABASE_URL, { max: 2 });

  beforeAll(async () => {
    await sql`DELETE FROM scrape_cursors WHERE "groupId" LIKE ${`${GROUP_PREFIX}-%`}`;
    await sql`DELETE FROM raw_facebook_posts WHERE "groupId" LIKE ${`${GROUP_PREFIX}-%`}`;
  });

  afterAll(async () => {
    await sql.end({ timeout: 5 });
  });

  beforeEach(async () => {
    await sql`DELETE FROM scrape_cursors WHERE "groupId" LIKE ${`${GROUP_PREFIX}-%`}`;
    await sql`DELETE FROM raw_facebook_posts WHERE "groupId" LIKE ${`${GROUP_PREFIX}-%`}`;
  });

  test("empty feed → empty_suspect, watermark frozen", async () => {
    const groupId = `${GROUP_PREFIX}-empty`;
    const report = await runScrapePipeline({
      groupId,
      groupUrl: `https://www.facebook.com/groups/${groupId}`,
      statePath: "/tmp/unused.json",
      databaseUrl: TEST_DATABASE_URL,
      scrapeFn: async () => ({ posts: [], stopReason: "empty_suspect" }),
    });

    expect(report.status).toBe("empty_suspect");
    expect(report.stopReason).toBe("empty_suspect");
    expect(report.postsUpserted).toBe(0);

    const cursor = await loadCursor(sql, groupId);
    expect(cursor?.lastPostId).toBeNull();
    expect(cursor?.lastStatus).toBe("empty_suspect");
  });

  test("cold-start cap → upsert ≤30, watermark = newest", async () => {
    const groupId = `${GROUP_PREFIX}-cold`;
    const n = scrapeRunPolicy.coldStartMaxPosts;
    const posts = makePosts(n, groupId);

    const report = await runScrapePipeline({
      groupId,
      groupUrl: `https://www.facebook.com/groups/${groupId}`,
      statePath: "/tmp/unused.json",
      databaseUrl: TEST_DATABASE_URL,
      scrapeFn: async (input) => {
        expect(input.coldStart).toBe(true);
        return { posts, stopReason: "cold_start_cap" };
      },
    });

    expect(report.status).toBe("ok");
    expect(report.coldStart).toBe(true);
    expect(report.stopReason).toBe("cold_start_cap");
    expect(report.postsSeen).toBe(n);
    expect(report.postsUpserted).toBe(n);

    const cursor = await loadCursor(sql, groupId);
    expect(cursor?.lastPostId).toBe(posts[0]!.postId);
    expect(cursor?.lastStatus).toBe("ok");

    const rows = await sql`
      SELECT count(*)::int AS c FROM raw_facebook_posts
      WHERE "groupId" = ${groupId}
    `;
    expect(rows[0]!.c).toBe(n);
  });

  test("hit watermark with no newer posts → ok, watermark unchanged", async () => {
    const groupId = `${GROUP_PREFIX}-wm`;
    const groupUrl = `https://www.facebook.com/groups/${groupId}`;
    await ensureCursor(sql, groupId, groupUrl);
    await markRunOutcome(sql, {
      groupId,
      groupUrl,
      status: "ok",
      postsSeen: 1,
      postsNew: 1,
      lastPostId: "9001",
      lastPostedAt: new Date("2026-07-01T00:00:00Z"),
      advanceWatermark: true,
    });
    const before = await loadCursor(sql, groupId);
    expect(before?.lastPostId).toBe("9001");

    const report = await runScrapePipeline({
      groupId,
      groupUrl,
      statePath: "/tmp/unused.json",
      databaseUrl: TEST_DATABASE_URL,
      scrapeFn: async (input) => {
        expect(input.coldStart).toBe(false);
        expect(input.lastPostId).toBe("9001");
        return { posts: [], stopReason: "hit_watermark" };
      },
    });

    expect(report.status).toBe("ok");
    expect(report.stopReason).toBe("hit_watermark");
    expect(report.postsUpserted).toBe(0);
    expect(report.coldStart).toBe(false);

    const after = await loadCursor(sql, groupId);
    expect(after?.lastPostId).toBe("9001");
    expect(after?.lastStatus).toBe("ok");
  });
});
