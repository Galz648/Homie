import { access } from "node:fs/promises";
import { chromium } from "playwright";

export type AuthStatus =
  | "ok"
  | "missing_state"
  | "login_wall"
  | "checkpoint"
  | "unknown";

export type AuthProbeResult = {
  status: AuthStatus;
  detail: string;
  statePath: string;
};

export async function probeFacebookSession(
  statePath: string,
): Promise<AuthProbeResult> {
  try {
    await access(statePath);
  } catch {
    return {
      status: "missing_state",
      detail: `No storage state at ${statePath}`,
      statePath,
    };
  }

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ storageState: statePath });
    const page = await context.newPage();
    await page.goto("https://www.facebook.com/", {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });

    const url = page.url().toLowerCase();
    // Prefer visible text — raw HTML often contains the string "checkpoint"
    // in JS bundles even on a healthy feed.
    const visible = (await page.locator("body").innerText().catch(() => ""))
      .toLowerCase();

    if (
      url.includes("/checkpoint") ||
      url.includes("checkpoint/") ||
      visible.includes("confirm you're human") ||
      visible.includes("we suspended your account")
    ) {
      return {
        status: "checkpoint",
        detail: `Facebook checkpoint at ${page.url()}`,
        statePath,
      };
    }

    if (
      url.includes("/login") ||
      visible.includes("log in to facebook") ||
      visible.includes("התחבר לפייסבוק")
    ) {
      return {
        status: "login_wall",
        detail: `Login wall at ${page.url()}`,
        statePath,
      };
    }

    if (url.includes("facebook.com") && !url.includes("/login")) {
      return {
        status: "ok",
        detail: `Session looks valid (${page.url()})`,
        statePath,
      };
    }

    return {
      status: "unknown",
      detail: `Ambiguous session state at ${page.url()}`,
      statePath,
    };
  } finally {
    await browser.close();
  }
}
