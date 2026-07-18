import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import {
  cookieHeaderFromStorageState,
  FB_IMAGE_REFERER,
  FB_IMAGE_USER_AGENT,
  fetchImageBytes,
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
        `https://bucket.fra1.cdn.digitaloceanspaces.com/posts/mock-${sourceUrl.slice(-8)}`,
    });
    expect(out).toHaveLength(1);
    expect(out[0]).toMatch(
      /^https:\/\/bucket\.fra1\.cdn\.digitaloceanspaces\.com\//,
    );
  });

  test("objectKeyForImage embeds hash and ext", () => {
    const body = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
    const key = objectKeyForImage("https://x/y/z.PNG", body);
    expect(key).toMatch(/^posts\/[a-f0-9]{16}-[a-f0-9-]{8}\.png$/);
  });

  test("cookieHeaderFromStorageState keeps FB cookies, drops others", () => {
    const header = cookieHeaderFromStorageState({
      cookies: [
        { name: "c_user", value: "123", domain: ".facebook.com" },
        { name: "xs", value: "abc", domain: ".facebook.com" },
        { name: "cdn", value: "tok", domain: ".fbcdn.net" },
        { name: "other", value: "nope", domain: ".google.com" },
        { name: "noDomain", value: "ok" },
      ],
    });
    expect(header).toContain("c_user=123");
    expect(header).toContain("xs=abc");
    expect(header).toContain("cdn=tok");
    expect(header).toContain("noDomain=ok");
    expect(header).not.toContain("other=nope");
  });

  test("fetchImageBytes sends Cookie, Referer, and User-Agent", async () => {
    const dir = await mkdtemp(join(tmpdir(), "homie-img-"));
    const statePath = join(dir, "facebook_state.json");
    await writeFile(
      statePath,
      JSON.stringify({
        cookies: [
          { name: "c_user", value: "99", domain: ".facebook.com" },
          { name: "xs", value: "tok", domain: ".facebook.com" },
        ],
        origins: [],
      }),
    );

    let seenHeaders: HeadersInit | undefined;
    const pixel = new Uint8Array([0xff, 0xd8, 0xff]);
    await fetchImageBytes("https://scontent.xx.fbcdn.net/v/t39/x.jpg", {
      statePath,
      fetchImpl: async (_url, init) => {
        seenHeaders = init?.headers;
        return new Response(pixel, {
          status: 200,
          headers: { "content-type": "image/jpeg" },
        });
      },
    });

    const h = new Headers(seenHeaders);
    expect(h.get("User-Agent")).toBe(FB_IMAGE_USER_AGENT);
    expect(h.get("Referer")).toBe(FB_IMAGE_REFERER);
    expect(h.get("Cookie")).toContain("c_user=99");
    expect(h.get("Cookie")).toContain("xs=tok");
  });

  test("persistListingImages forwards statePath into fetchBytes", async () => {
    let seenState: string | undefined;
    const pixel = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    await persistListingImages(["https://cdn.example/x.png"], {
      mode: "spaces",
      statePath: "/var/homie/facebook_state.json",
      fetchBytes: async (_url, opts) => {
        seenState = opts?.statePath;
        return { body: pixel, contentType: "image/png" };
      },
      upload: async () => "https://bucket.example/posts/a.png",
    });
    expect(seenState).toBe("/var/homie/facebook_state.json");
  });
});
