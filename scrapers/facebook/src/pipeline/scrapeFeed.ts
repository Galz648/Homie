import { chromium, type Page } from "playwright";
import { scrapeRunPolicy } from "../scrapeRunPolicy.js";
import type { ScrapedPost, StopReason } from "./types.js";

export type ScrapeFeedInput = {
  groupId: string;
  groupUrl: string;
  statePath: string;
  lastPostId: string | null;
  coldStart: boolean;
};

export type ScrapeFeedResult = {
  posts: ScrapedPost[];
  stopReason: StopReason;
};

const POST_HREF_RE = /\/groups\/[^/]+\/(?:posts|permalink)\/(\d+)/i;

function postIdFromHref(href: string): string | null {
  const m = href.match(POST_HREF_RE);
  return m?.[1] ?? null;
}

function absUrl(href: string): string {
  if (href.startsWith("http")) return href.split("?")[0]!;
  return `https://www.facebook.com${href.split("?")[0]}`;
}

async function collectVisiblePosts(page: Page, groupId: string): Promise<ScrapedPost[]> {
  const hrefs = await page.$$eval("a[href]", (anchors) =>
    anchors.map((a) => (a as HTMLAnchorElement).getAttribute("href") || "").filter(Boolean),
  );

  const byId = new Map<string, ScrapedPost>();
  for (const href of hrefs) {
    const postId = postIdFromHref(href);
    if (!postId) continue;
    if (byId.has(postId)) continue;
    byId.set(postId, {
      postId,
      url: absUrl(href.includes("groups/") ? href : `/groups/${groupId}/posts/${postId}`),
      text: "",
      imageUrls: [],
    });
  }

  // Best-effort text + images: pull article-ish blocks near permalinks
  const media = await page.evaluate(() => {
    const out: { href: string; text: string; imageUrls: string[] }[] = [];
    for (const a of Array.from(document.querySelectorAll("a[href]"))) {
      const href = a.getAttribute("href") || "";
      if (!/\/(posts|permalink)\//i.test(href)) continue;
      const root = a.closest("[role='article']") || a.closest("div") || a.parentElement;
      const text = (root?.textContent || "").replace(/\s+/g, " ").trim().slice(0, 2000);
      const imageUrls: string[] = [];
      if (root) {
        for (const img of Array.from(root.querySelectorAll("img[src]"))) {
          const src = (img as HTMLImageElement).getAttribute("src") || "";
          if (
            src.startsWith("http") &&
            /scontent|fbcdn|facebook\.com\/.*\.(jpg|jpeg|png|webp)/i.test(src)
          ) {
            // Keep query string — fbcdn signs URLs with oh/oe/_nc_* params.
            imageUrls.push(src);
          }
        }
      }
      if (text || imageUrls.length) out.push({ href, text, imageUrls });
    }
    return out;
  });

  for (const m of media) {
    const postId = postIdFromHref(m.href);
    if (!postId) continue;
    const existing = byId.get(postId);
    if (!existing) continue;
    if (!existing.text && m.text) existing.text = m.text;
    if (m.imageUrls.length) {
      const seen = new Set(existing.imageUrls ?? []);
      for (const u of m.imageUrls) {
        if (seen.has(u)) continue;
        seen.add(u);
        if (!existing.imageUrls) existing.imageUrls = [];
        existing.imageUrls.push(u);
      }
    }
  }

  return [...byId.values()];
}

function looksAuthWall(url: string, bodyText: string): boolean {
  const u = url.toLowerCase();
  const t = bodyText.toLowerCase();
  return (
    u.includes("/login") ||
    u.includes("/checkpoint") ||
    t.includes("log in to facebook") ||
    t.includes("התחבר לפייסבוק")
  );
}

/**
 * Scroll group feed and collect post permalinks until policy stop rules fire.
 */
export async function scrapeGroupFeed(input: ScrapeFeedInput): Promise<ScrapeFeedResult> {
  const policy = scrapeRunPolicy;
  const cap = input.coldStart ? policy.coldStartMaxPosts : policy.maxPostsPerRun;
  const deadline = Date.now() + policy.maxDurationMs;

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      storageState: input.statePath,
    });
    const page = await context.newPage();
    const feedUrl = input.groupUrl.replace(/\/$/, "");
    await page.goto(feedUrl, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    const bodyText = await page
      .locator("body")
      .innerText()
      .catch(() => "");
    if (looksAuthWall(page.url(), bodyText)) {
      return { posts: [], stopReason: "auth" };
    }

    const ordered: ScrapedPost[] = [];
    const seen = new Set<string>();
    let stopReason: StopReason = "scroll_exhausted";
    let stagnantScrolls = 0;

    for (let scroll = 0; scroll < policy.maxScrolls; scroll++) {
      if (Date.now() > deadline) {
        stopReason = "timeout";
        break;
      }

      const batch = await collectVisiblePosts(page, input.groupId);
      let added = 0;
      for (const post of batch) {
        if (seen.has(post.postId)) continue;

        if (!input.coldStart && input.lastPostId && post.postId === input.lastPostId) {
          stopReason = "hit_watermark";
          return { posts: ordered, stopReason };
        }

        seen.add(post.postId);
        ordered.push(post);
        added += 1;

        if (ordered.length >= cap) {
          stopReason = input.coldStart ? "cold_start_cap" : "hit_post_cap";
          return { posts: ordered, stopReason };
        }
      }

      if (added === 0) {
        stagnantScrolls += 1;
        if (stagnantScrolls >= 3) {
          stopReason = ordered.length === 0 ? "empty_suspect" : "scroll_exhausted";
          break;
        }
      } else {
        stagnantScrolls = 0;
      }

      await page.evaluate(() => window.scrollBy(0, window.innerHeight * 0.9));
      await page.waitForTimeout(800);
    }

    if (ordered.length === 0 && stopReason === "scroll_exhausted") {
      stopReason = "empty_suspect";
    }

    return { posts: ordered, stopReason };
  } finally {
    await browser.close();
  }
}
