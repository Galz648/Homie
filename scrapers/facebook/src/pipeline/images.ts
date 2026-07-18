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
 */
import { createHash, randomUUID } from "node:crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

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

async function fetchImageBytes(
  url: string,
): Promise<{ body: Uint8Array; contentType: string }> {
  const resp = await fetch(url, { redirect: "follow" });
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
 * `upsertScrapedPosts`).
 */
export async function persistListingImages(
  sourceUrls: string[],
  deps: {
    mode?: ImageUploadMode;
    upload?: UploadImageFn;
    fetchBytes?: typeof fetchImageBytes;
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
  const out: string[] = [];
  for (const url of sourceUrls) {
    if (!url?.trim()) continue;
    const { body, contentType } = await fetchBytes(url);
    out.push(await upload({ sourceUrl: url, body, contentType }));
  }
  return out;
}
