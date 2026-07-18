import { createSql, ensureCursor, markRunOutcome } from "./cursor.js";
import {
  scrapeGroupFeed,
  type ScrapeFeedInput,
  type ScrapeFeedResult,
} from "./scrapeFeed.js";
import type { RunReport } from "./types.js";
import { upsertScrapedPosts } from "./upsertListings.js";
import { formatIsraelTime } from "../time.js";

export type RunScrapeInput = {
  groupId: string;
  groupUrl: string;
  statePath: string;
  databaseUrl?: string;
  /** Test seam: inject feed scrape (no live Facebook). */
  scrapeFn?: (input: ScrapeFeedInput) => Promise<ScrapeFeedResult>;
};

function withReportTime<T extends Omit<RunReport, "finishedAtIsrael">>(
  report: T,
): T & { finishedAtIsrael: string } {
  return { ...report, finishedAtIsrael: formatIsraelTime(new Date()) };
}

/**
 * Cursor → Playwright scrape → upsert → watermark (W6a contract).
 */
export async function runScrapePipeline(
  input: RunScrapeInput,
): Promise<RunReport> {
  const sql = createSql(input.databaseUrl);
  const scrape = input.scrapeFn ?? scrapeGroupFeed;
  try {
    const cursor = await ensureCursor(sql, input.groupId, input.groupUrl);
    const coldStart = !cursor.lastPostId;
    const feed = await scrape({
      groupId: input.groupId,
      groupUrl: input.groupUrl,
      statePath: input.statePath,
      lastPostId: cursor.lastPostId,
      coldStart,
    });

    if (feed.stopReason === "auth") {
      await markRunOutcome(sql, {
        groupId: input.groupId,
        groupUrl: input.groupUrl,
        status: "auth",
        error: "auth wall mid-scrape",
        postsSeen: 0,
        postsNew: 0,
        advanceWatermark: false,
      });
      return withReportTime({
        groupId: input.groupId,
        status: "auth",
        stopReason: "auth",
        postsSeen: 0,
        postsNew: 0,
        postsUpserted: 0,
        coldStart,
      });
    }

    // Incremental: hit existing watermark with no newer posts.
    if (feed.stopReason === "hit_watermark" && feed.posts.length === 0) {
      await markRunOutcome(sql, {
        groupId: input.groupId,
        groupUrl: input.groupUrl,
        status: "ok",
        postsSeen: 0,
        postsNew: 0,
        advanceWatermark: false,
      });
      return withReportTime({
        groupId: input.groupId,
        status: "ok",
        stopReason: "hit_watermark",
        postsSeen: 0,
        postsNew: 0,
        postsUpserted: 0,
        coldStart,
      });
    }

    if (feed.posts.length === 0 || feed.stopReason === "empty_suspect") {
      await markRunOutcome(sql, {
        groupId: input.groupId,
        groupUrl: input.groupUrl,
        status: "empty_suspect",
        error: "no parseable posts",
        postsSeen: 0,
        postsNew: 0,
        advanceWatermark: false,
      });
      return withReportTime({
        groupId: input.groupId,
        status: "empty_suspect",
        stopReason: "empty_suspect",
        postsSeen: 0,
        postsNew: 0,
        postsUpserted: 0,
        coldStart,
      });
    }

    // Feed order is top-of-feed first (newest-ish). Watermark = first collected.
    const { upserted, newest } = await upsertScrapedPosts(sql, feed.posts);
    const advance = upserted > 0 && newest != null;
    const possibleGap =
      !coldStart && feed.stopReason === "hit_post_cap";

    await markRunOutcome(sql, {
      groupId: input.groupId,
      groupUrl: input.groupUrl,
      status: "ok",
      postsSeen: feed.posts.length,
      postsNew: upserted,
      lastPostId: newest?.postId ?? null,
      lastPostedAt: newest?.postedAt ?? new Date(),
      advanceWatermark: advance,
    });

    return withReportTime({
      groupId: input.groupId,
      status: "ok",
      stopReason: feed.stopReason,
      postsSeen: feed.posts.length,
      postsNew: upserted,
      postsUpserted: upserted,
      possibleGap: Boolean(possibleGap),
      coldStart,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    try {
      await markRunOutcome(sql, {
        groupId: input.groupId,
        groupUrl: input.groupUrl,
        status: "crash",
        error: message,
        postsSeen: 0,
        postsNew: 0,
        advanceWatermark: false,
      });
    } catch {
      // ignore secondary DB errors
    }
    return withReportTime({
      groupId: input.groupId,
      status: "crash",
      stopReason: "ok",
      postsSeen: 0,
      postsNew: 0,
      postsUpserted: 0,
      error: message,
      coldStart: false,
    });
  } finally {
    await sql.end({ timeout: 5 });
  }
}
