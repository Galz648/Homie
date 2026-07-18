/**
 * Raw Facebook post image persistence: noop (local) or DigitalOcean Spaces upload.
 *
 * Env (spaces mode) — loaded by Temporal worker via `~/.config/homie/spaces.env`
 * or lane Secret `homie-spaces-images`:
 *   HOMIE_IMAGE_UPLOAD_MODE=spaces
 *   HOMIE_IMAGES_BUCKET
 *   HOMIE_IMAGES_BASE_URL   (CDN or bucket public base, no trailing slash)
 *   HOMIE_SPACES_ENDPOINT   e.g. https://fra1.digitaloceanspaces.com
 *   HOMIE_SPACES_REGION     e.g. fra1
 *   HOMIE_SPACES_KEY / HOMIE_SPACES_SECRET
 *
 * Spaces downloads use authenticated HTTP: Playwright storageState cookies
 * + browser-like Referer/User-Agent (bare fetch gets fbcdn 403).
 */
import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

/** Chromium-ish UA — fbcdn often 403s Node's default undici UA. */
export const FB_IMAGE_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export const FB_IMAGE_REFERER = "https://www.facebook.com/";

type StorageStateCookie = {
  name?: unknown;
  value?: unknown;
  domain?: unknown;
};

type StorageStateFile = {
  cookies?: StorageStateCookie[];
};

/**
 * Build a Cookie header from Playwright storageState JSON.
 * Includes facebook.com / fbcdn / facebook.net cookies (session + CDN).
 */
export function cookieHeaderFromStorageState(raw: unknown): string {
  if (!raw || typeof raw !== "object") return "";
  const cookies = (raw as StorageStateFile).cookies;
  if (!Array.isArray(cookies)) return "";

  const parts: string[] = [];
  for (const c of cookies) {
    if (typeof c?.name !== "string" || typeof c?.value !== "string") continue;
    if (!c.name.trim()) continue;
    const domain = typeof c.domain === "string" ? c.domain.toLowerCase() : "";
    // Session cookies are usually .facebook.com; some CDN tokens use .fbcdn.net.
    // Always include when domain is missing (Chrome import may omit it).
    const okDomain =
      !domain ||
      domain.endsWith("facebook.com") ||
      domain.endsWith("fbcdn.net") ||
      domain.endsWith("facebook.net");
    if (!okDomain) continue;
    parts.push(`${c.name}=${c.value}`);
  }
  return parts.join("; ");
}

/** Read Playwright storageState path → Cookie header. Throws if unreadable. */
export async function loadCookieHeaderFromStatePath(
  statePath: string,
): Promise<string> {
  try {
    const text = await readFile(statePath, "utf8");
    return cookieHeaderFromStorageState(JSON.parse(text) as unknown);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `failed to load Facebook session cookies from ${statePath}: ${msg}`,
    );
  }
}

export function facebookImageRequestHeaders(cookieHeader?: string): HeadersInit {
  const headers: Record<string, string> = {
    "User-Agent": FB_IMAGE_USER_AGENT,
    Referer: FB_IMAGE_REFERER,
    Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
  };
  if (cookieHeader?.trim()) {
    headers.Cookie = cookieHeader.trim();
  }
  return headers;
}

export type ImageUploadMode = "noop" | "spaces";

export function resolveImageUploadMode(): ImageUploadMode {
  const mode = (process.env.HOMIE_IMAGE_UPLOAD_MODE ?? "noop").toLowerCase();
  return mode === "spaces" ? "spaces" : "noop";
}

export type SpacesImageConfig = {
  bucket: string;
  baseUrl: string;
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
};

export function loadSpacesImageConfig(
  env: NodeJS.ProcessEnv = process.env,
): SpacesImageConfig {
  const bucket = env.HOMIE_IMAGES_BUCKET?.trim();
  const baseUrl = env.HOMIE_IMAGES_BASE_URL?.trim().replace(/\/$/, "");
  const endpoint = env.HOMIE_SPACES_ENDPOINT?.trim();
  const region = env.HOMIE_SPACES_REGION?.trim();
  const accessKeyId = env.HOMIE_SPACES_KEY?.trim();
  const secretAccessKey = env.HOMIE_SPACES_SECRET?.trim();
  const missing = [
    !bucket && "HOMIE_IMAGES_BUCKET",
    !baseUrl && "HOMIE_IMAGES_BASE_URL",
    !endpoint && "HOMIE_SPACES_ENDPOINT",
    !region && "HOMIE_SPACES_REGION",
    !accessKeyId && "HOMIE_SPACES_KEY",
    !secretAccessKey && "HOMIE_SPACES_SECRET",
  ].filter(Boolean);
  if (missing.length) {
    throw new Error(`Spaces image config missing: ${missing.join(", ")}`);
  }
  return {
    bucket: bucket!,
    baseUrl: baseUrl!,
    endpoint: endpoint!,
    region: region!,
    accessKeyId: accessKeyId!,
    secretAccessKey: secretAccessKey!,
  };
}

export function createSpacesS3Client(cfg: SpacesImageConfig): S3Client {
  return new S3Client({
    region: cfg.region,
    endpoint: cfg.endpoint,
    forcePathStyle: false,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
  });
}

export function objectKeyForImage(sourceUrl: string, body: Uint8Array): string {
  const hash = createHash("sha256").update(body).digest("hex").slice(0, 16);
  const ext = guessExt(sourceUrl, body);
  return `posts/${hash}-${randomUUID().slice(0, 8)}.${ext}`;
}

function guessExt(sourceUrl: string, body: Uint8Array): string {
  const path = sourceUrl.split("?")[0]?.toLowerCase() ?? "";
  if (path.endsWith(".png") || (body[0] === 0x89 && body[1] === 0x50)) return "png";
  if (path.endsWith(".webp")) return "webp";
  if (path.endsWith(".gif")) return "gif";
  return "jpg";
}

export type UploadImageFn = (args: {
  sourceUrl: string;
  body: Uint8Array;
  contentType: string;
}) => Promise<string>;

export async function uploadImageToSpaces(
  cfg: SpacesImageConfig,
  client: S3Client,
  args: { sourceUrl: string; body: Uint8Array; contentType: string },
): Promise<string> {
  const key = objectKeyForImage(args.sourceUrl, args.body);
  await client.send(
    new PutObjectCommand({
      Bucket: cfg.bucket,
      Key: key,
      Body: args.body,
      ContentType: args.contentType,
      ACL: "public-read",
    }),
  );
  return `${cfg.baseUrl}/${key}`;
}

export type FetchImageBytesOpts = {
  /** Playwright storageState path — cookies attached to CDN requests. */
  statePath?: string;
  /** Pre-built Cookie header (tests / callers that already loaded state). */
  cookieHeader?: string;
  fetchImpl?: typeof fetch;
};

export async function fetchImageBytes(
  url: string,
  opts: FetchImageBytesOpts = {},
): Promise<{ body: Uint8Array; contentType: string }> {
  let cookieHeader = opts.cookieHeader;
  if (cookieHeader === undefined && opts.statePath) {
    cookieHeader = await loadCookieHeaderFromStatePath(opts.statePath);
  }
  const fetchImpl = opts.fetchImpl ?? fetch;
  const resp = await fetchImpl(url, {
    redirect: "follow",
    headers: facebookImageRequestHeaders(cookieHeader),
  });
  if (!resp.ok) {
    throw new Error(`image fetch HTTP ${resp.status} for ${url}`);
  }
  const buf = new Uint8Array(await resp.arrayBuffer());
  const contentType =
    resp.headers.get("content-type")?.split(";")[0]?.trim() || "image/jpeg";
  return { body: buf, contentType };
}

/**
 * Map scraped image URLs to persisted values for `raw_facebook_posts.images`.
 * noop: keep remote FB CDN URLs as-is (or empty) — local e2e default.
 * spaces: download each URL and PutObject to Spaces; return public CDN URLs.
 *
 * Called from the Temporal scrape activity path (`scrapeFacebookGroupFeed` →
 * `upsertScrapedPosts`). Pass `statePath` so Spaces mode can authenticate CDN.
 */
export async function persistListingImages(
  sourceUrls: string[],
  deps: {
    mode?: ImageUploadMode;
    upload?: UploadImageFn;
    fetchBytes?: (
      url: string,
      opts?: FetchImageBytesOpts,
    ) => Promise<{ body: Uint8Array; contentType: string }>;
    /** Playwright storageState — required for authenticated Spaces downloads. */
    statePath?: string;
  } = {},
): Promise<string[]> {
  const mode = deps.mode ?? resolveImageUploadMode();
  if (mode === "noop") {
    return sourceUrls;
  }

  const upload =
    deps.upload ??
    (() => {
      const cfg = loadSpacesImageConfig();
      const client = createSpacesS3Client(cfg);
      return (args: {
        sourceUrl: string;
        body: Uint8Array;
        contentType: string;
      }) => uploadImageToSpaces(cfg, client, args);
    })();

  const fetchBytes = deps.fetchBytes ?? fetchImageBytes;
  // Load cookies once per post batch (not per URL).
  let cookieHeader: string | undefined;
  if (deps.statePath && !deps.fetchBytes) {
    cookieHeader = await loadCookieHeaderFromStatePath(deps.statePath);
  }
  const out: string[] = [];
  for (const url of sourceUrls) {
    if (!url?.trim()) continue;
    const { body, contentType } = await fetchBytes(url, {
      statePath: deps.statePath,
      cookieHeader,
    });
    out.push(await upload({ sourceUrl: url, body, contentType }));
  }
  return out;
}
