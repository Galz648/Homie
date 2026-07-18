/**
 * Headed login → save Playwright storageState for Homie FB scrape.
 *
 *   bun run renew
 *
 * Uses your Facebook account (members of configured groups). State is written to
 * ~/.config/homie/facebook_state.json (or HOMIE_FACEBOOK_STATE_PATH).
 *
 * After login is detected (left /login), state is saved automatically.
 * Press Enter early to save immediately once you are logged in.
 */
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { chromium } from "playwright";
import { loadSettings } from "./config.js";

const LOGIN_HINTS = ["/login", "login.php"];

function looksLoggedOut(url: string): boolean {
  const u = url.toLowerCase();
  return LOGIN_HINTS.some((h) => u.includes(h));
}

async function main(): Promise<void> {
  const settings = loadSettings();
  const path = settings.facebookStatePath;
  await mkdir(dirname(path), { recursive: true });

  const timeoutMs = Number(process.env.HOMIE_RENEW_TIMEOUT_MS ?? 10 * 60_000);

  console.log("Opening headed browser — log in with your Facebook account.");
  console.log(`State will be saved to: ${path}`);
  console.log(
    "When the feed loads (URL leaves /login), state saves automatically.",
  );
  console.log("Or press Enter here once you are fully logged in.\n");

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("https://www.facebook.com/login", {
    waitUntil: "domcontentloaded",
  });

  let done = false;
  const rl = createInterface({ input, output });
  const enterPromise = rl.question("").then(() => {
    done = true;
  });

  const deadline = Date.now() + timeoutMs;
  while (!done && Date.now() < deadline) {
    const url = page.url();
    if (!looksLoggedOut(url) && url.includes("facebook.com")) {
      // brief settle for cookies
      await page.waitForTimeout(1500);
      if (!looksLoggedOut(page.url())) {
        done = true;
        break;
      }
    }
    await Promise.race([
      enterPromise,
      new Promise((r) => setTimeout(r, 1000)),
    ]);
  }
  rl.close();

  if (!done) {
    await browser.close();
    throw new Error(
      `Timed out after ${timeoutMs}ms waiting for Facebook login`,
    );
  }

  await context.storageState({ path });
  await browser.close();

  console.log(`\nSaved storageState → ${path}`);
  console.log(
    "Next: signal parked workflows with cookies_renewed, or re-run auth probe.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
