/**
 * Local e2e: live Facebook CDN image download (auth + signed URL).
 *
 * Proves the download half of Spaces image persistence without uploading:
 *   1. Playwright + storageState → open a group feed
 *   2. Grab first scontent/fbcdn img src (keep query string)
 *   3. Authenticated fetchImageBytes must return image bytes
 *
 * Prerequisites:
 *   ~/.config/homie/facebook_state.json  (import-chrome-session or renew)
 *   bunx playwright install chromium
 *
 * Usage:
 *   cd scrapers/facebook
 *   bun run check:image-fetch-online
 *   HOMIE_ONLINE_GROUP_ID=telavivroommates bun run check:image-fetch-online
 *
 * Spaces PutObject is separate: `bun run smoke:spaces-upload`
 */
import { existsSync } from "node:fs";
import { chromium } from "playwright";
import { classifyAuthPage } from "../src/authProbe.js";
import { loadSettings } from "../src/config.js";
import { enabledGroups, groupUrl } from "../src/groups.js";
import { fetchImageBytes } from "../src/pipeline/images.js";

function redactUrl(url: string): string {
  try {
    const u = new URL(url);
    // Keep host + path; show whether query (signed) params exist without dumping them.
    const q = u.search ? `?…(${u.searchParams.size} params)` : " (no query)";
    return `${u.origin}${u.pathname}${q}`;
  } catch {
    return url.slice(0, 80);
  }
}

async function findCdnImageUrl(
  groupFeedUrl: string,
  statePath: string,
): Promise<{ pageUrl: string; imageUrl: string }> {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ storageState: statePath });
    const page = await context.newPage();
    await page.goto(groupFeedUrl, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    // Feed media often hydrates after first paint.
    await new Promise((r) => setTimeout(r, 3_000));

    const pageUrl = page.url();
    const visible = await page.locator("body").innerText().catch(() => "");
    const auth = classifyAuthPage(pageUrl, visible);
    if (auth !== "ok") {
      throw new Error(
        `session not usable for feed scrape: auth=${auth} url=${pageUrl}`,
      );
    }

    const imageUrl = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll("img[src]"));
      for (const img of imgs) {
        const src = (img as HTMLImageElement).getAttribute("src") || "";
        if (!src.startsWith("http")) continue;
        if (!/scontent|fbcdn/i.test(src)) continue;
        // Prefer signed URLs (query string) — same contract as scrapeFeed.
        if (src.includes("?")) return src;
      }
      // Fallback: any fbcdn src (may 403 without signature).
      for (const img of imgs) {
        const src = (img as HTMLImageElement).getAttribute("src") || "";
        if (src.startsWith("http") && /scontent|fbcdn/i.test(src)) {
          return src;
        }
      }
      return "";
    });

    if (!imageUrl) {
      throw new Error(
        `no scontent/fbcdn img found on ${pageUrl} — scroll/feed may be empty`,
      );
    }
    return { pageUrl, imageUrl };
  } finally {
    await browser.close();
  }
}

async function main(): Promise<void> {
  const settings = loadSettings();
  const statePath = settings.facebookStatePath;

  if (!existsSync(statePath)) {
    throw new Error(
      `missing Facebook state at ${statePath} — run import-chrome-session or renew`,
    );
  }

  const groups = enabledGroups();
  const wantId = process.env.HOMIE_ONLINE_GROUP_ID?.trim();
  const group = wantId ? groups.find((g) => g.id === wantId) : groups[0];
  if (!group) {
    throw new Error(
      wantId
        ? `HOMIE_ONLINE_GROUP_ID=${wantId} not in enabled groups`
        : "no enabled groups in src/groups.ts",
    );
  }
  const feedUrl = groupUrl(group);

  console.log("== Homie image-fetch online e2e (download only) ==");
  console.log(`group: ${group.id} (${group.name ?? feedUrl})`);
  console.log(`state: ${statePath}`);
  console.log(`feed:  ${feedUrl}`);

  const { pageUrl, imageUrl } = await findCdnImageUrl(feedUrl, statePath);
  console.log(`page:  ${pageUrl}`);
  console.log(`cdn:   ${redactUrl(imageUrl)}`);
  if (!imageUrl.includes("?")) {
    console.warn(
      "warn: CDN URL has no query string — signed params missing; fetch may 403",
    );
  }

  const { body, contentType } = await fetchImageBytes(imageUrl, { statePath });
  console.log(
    `authenticated fetch:  ok bytes=${body.length} contentType=${contentType}`,
  );

  if (body.length < 100) {
    throw new Error(
      `authenticated fetch returned suspiciously small body (${body.length})`,
    );
  }

  console.log("");
  console.log("ok: image download e2e passed");
}

main().catch((err) => {
  console.error("FAIL:", err instanceof Error ? err.message : err);
  process.exit(1);
});
