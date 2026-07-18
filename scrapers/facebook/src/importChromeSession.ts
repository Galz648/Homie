/**
 * Import Facebook cookies from the local Google Chrome profile into
 * Playwright storageState (~/.config/homie/facebook_state.json).
 *
 * Decrypts via chrome-cookies-secure + macOS Keychain (keytar). Does not
 * launch Chrome or require quitting your browser.
 *
 *   bun run import-chrome-session
 *
 * Env:
 *   HOMIE_CHROME_PROFILE   — e.g. "Profile 1" (default: Local State last_used)
 *   HOMIE_FACEBOOK_STATE_PATH — output path
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { loadSettings } from "./config.js";

const require = createRequire(import.meta.url);
const chromeCookies = require("chrome-cookies-secure") as {
  getCookiesPromised: (
    uri: string,
    format: string,
    profile?: string,
  ) => Promise<PuppeteerCookie[]>;
};

type LocalState = {
  profile?: {
    last_used?: string;
  };
};

type PuppeteerCookie = {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: number;
  Secure?: boolean;
  HttpOnly?: boolean;
  secure?: boolean;
  httpOnly?: boolean;
};

type PlaywrightCookie = {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "Strict" | "Lax" | "None";
};

/** Chrome stores expires as µs since 1601-01-01; Playwright wants Unix seconds. */
function chromiumExpiresToUnix(expires: number | undefined): number {
  if (expires == null || expires <= 0) return -1;
  // Already Unix seconds (Playwright-safe range through ~year 2286)
  if (expires < 1e11) return Math.floor(expires);
  const CHROME_EPOCH_OFFSET_US = 11_644_473_600_000_000;
  const unix = Math.floor((expires - CHROME_EPOCH_OFFSET_US) / 1_000_000);
  return unix > 0 ? unix : -1;
}

async function resolveProfileName(): Promise<string> {
  const override = process.env.HOMIE_CHROME_PROFILE?.trim();
  if (override) return override;

  const localStatePath = join(
    homedir(),
    "Library/Application Support/Google/Chrome/Local State",
  );
  const raw = await readFile(localStatePath, "utf8");
  const state = JSON.parse(raw) as LocalState;
  return state.profile?.last_used || "Default";
}

function toPlaywrightCookie(c: PuppeteerCookie): PlaywrightCookie {
  return {
    name: c.name,
    value: c.value,
    domain: c.domain,
    path: c.path || "/",
    expires: chromiumExpiresToUnix(c.expires),
    httpOnly: Boolean(c.HttpOnly ?? c.httpOnly),
    secure: Boolean(c.Secure ?? c.secure),
    sameSite: "Lax",
  };
}

async function main(): Promise<void> {
  const settings = loadSettings();
  const outPath = settings.facebookStatePath;
  await mkdir(dirname(outPath), { recursive: true });

  const profile = await resolveProfileName();
  const cookiesDb = join(
    homedir(),
    "Library/Application Support/Google/Chrome",
    profile,
    "Cookies",
  );
  if (!existsSync(cookiesDb) && !existsSync(join(dirname(cookiesDb), "Network/Cookies"))) {
    throw new Error(`Chrome cookies DB not found for profile "${profile}"`);
  }

  console.log(`Reading Facebook cookies from Chrome profile: ${profile}`);

  // May prompt once for Keychain access ("Chrome Safe Storage").
  const raw = await chromeCookies.getCookiesPromised(
    "https://www.facebook.com/",
    "puppeteer",
    profile,
  );

  const cookies = raw.map(toPlaywrightCookie);
  const sessionish = cookies.filter((c) =>
    ["c_user", "xs", "datr", "sb"].includes(c.name),
  );

  if (sessionish.length === 0) {
    throw new Error(
      `No Facebook session cookies (c_user/xs/…) in profile "${profile}". ` +
        "Log into facebook.com in that Chrome profile, then re-run.",
    );
  }

  console.log(
    `Got ${cookies.length} cookies (session keys: ${sessionish.map((c) => c.name).join(", ")})`,
  );

  await writeFile(
    outPath,
    JSON.stringify({ cookies, origins: [] }, null, 2),
    "utf8",
  );
  console.log(`Saved storageState → ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
