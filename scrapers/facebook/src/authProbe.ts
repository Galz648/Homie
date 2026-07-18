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

/**
 * Classify a loaded Facebook page from URL + visible text (no raw HTML).
 * Used by the live probe and by mock e2e fixtures.
 */
export function classifyAuthPage(
  pageUrl: string,
  visibleText: string,
): Exclude<AuthStatus, "missing_state"> {
  const url = pageUrl.toLowerCase();
  const visible = visibleText.toLowerCase();

  if (
    url.includes("/checkpoint") ||
    url.includes("checkpoint/") ||
    visible.includes("confirm you're human") ||
    visible.includes("we suspended your account")
  ) {
    return "checkpoint";
  }

  if (
    url.includes("/login") ||
    visible.includes("log in to facebook") ||
    visible.includes("התחבר לפייסבוק")
  ) {
    return "login_wall";
  }

  if (url.includes("facebook.com") && !url.includes("/login")) {
    return "ok";
  }

  return "unknown";
}

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

    const url = page.url();
    const visible = (await page.locator("body").innerText().catch(() => ""));
    const status = classifyAuthPage(url, visible);

    if (status === "checkpoint") {
      return {
        status,
        detail: `Facebook checkpoint at ${url}`,
        statePath,
      };
    }
    if (status === "login_wall") {
      return {
        status,
        detail: `Login wall at ${url}`,
        statePath,
      };
    }
    if (status === "ok") {
      return {
        status,
        detail: `Session looks valid (${url})`,
        statePath,
      };
    }
    return {
      status: "unknown",
      detail: `Ambiguous session state at ${url}`,
      statePath,
    };
  } finally {
    await browser.close();
  }
}
