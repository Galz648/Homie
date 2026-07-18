import { describe, expect, test } from "vitest";
import {
  objectKeyForImage,
  persistListingImages,
  resolveImageUploadMode,
} from "../src/pipeline/images.js";

describe("images pipeline", () => {
  test("default mode is noop", () => {
    delete process.env.HOMIE_IMAGE_UPLOAD_MODE;
    expect(resolveImageUploadMode()).toBe("noop");
  });

  test("noop returns source URLs unchanged", async () => {
    const urls = ["https://cdn.example/a.jpg", "https://cdn.example/b.jpg"];
    await expect(persistListingImages(urls, { mode: "noop" })).resolves.toEqual(
      urls,
    );
  });

  test("spaces mode uploads via injected upload fn", async () => {
    const pixel = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    const out = await persistListingImages(["https://cdn.example/x.png"], {
      mode: "spaces",
      fetchBytes: async () => ({
        body: pixel,
        contentType: "image/png",
      }),
      upload: async ({ sourceUrl }) =>
        `https://bucket.fra1.cdn.digitaloceanspaces.com/listings/mock-${sourceUrl.slice(-8)}`,
    });
    expect(out).toHaveLength(1);
    expect(out[0]).toMatch(/^https:\/\/bucket\.fra1\.cdn\.digitaloceanspaces\.com\//);
  });

  test("objectKeyForImage embeds hash and ext", () => {
    const body = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
    const key = objectKeyForImage("https://x/y/z.PNG", body);
    expect(key).toMatch(/^listings\/[a-f0-9]{16}-[a-f0-9-]{8}\.png$/);
  });
});
