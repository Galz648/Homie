/**
 * Single-run Playwright scrape policy (one group per Temporal workflow).
 * See docs/workstreams.md W6a.1 — Playwright single-run contract.
 */
export const scrapeRunPolicy = {
  /** Hard cap on posts collected from the feed this run (before dedup). */
  maxPostsPerRun: 40,
  /** Cold start (no scrape_cursors row / null watermark): how many recent posts to backfill. */
  coldStartMaxPosts: 30,
  /** Stop scrolling after this many scroll attempts. */
  maxScrolls: 25,
  /** Wall-clock budget for the Playwright activity. */
  maxDurationMs: 3 * 60_000,
  /** Prefer chronological feed when FB exposes it. */
  preferChronological: true,
} as const;

export type ScrapeRunPolicy = typeof scrapeRunPolicy;
