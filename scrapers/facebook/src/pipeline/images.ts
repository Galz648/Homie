/** Local images mode: Spaces upload off/noop for scrape-e2e. */

export type ImageUploadMode = "noop" | "spaces";

export function resolveImageUploadMode(): ImageUploadMode {
  const mode = (process.env.HOMIE_IMAGE_UPLOAD_MODE ?? "noop").toLowerCase();
  return mode === "spaces" ? "spaces" : "noop";
}

/**
 * Map scraped image URLs to persisted values.
 * noop: keep remote FB CDN URLs as-is (or empty) — no Spaces upload.
 */
export async function persistListingImages(
  sourceUrls: string[],
): Promise<string[]> {
  if (resolveImageUploadMode() === "noop") {
    return sourceUrls;
  }
  // Spaces path lands in a later workstream; fail closed for now.
  throw new Error("HOMIE_IMAGE_UPLOAD_MODE=spaces is not implemented yet");
}
