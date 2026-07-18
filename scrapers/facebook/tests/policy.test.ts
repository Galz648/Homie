import { describe, expect, test } from "vitest";
import { scrapeRunPolicy } from "../src/scrapeRunPolicy.js";
import { resolveImageUploadMode } from "../src/pipeline/images.js";

describe("scrape policy + images noop", () => {
  test("policy caps match W6a defaults", () => {
    expect(scrapeRunPolicy.maxPostsPerRun).toBe(40);
    expect(scrapeRunPolicy.coldStartMaxPosts).toBe(30);
    expect(scrapeRunPolicy.maxScrolls).toBe(25);
  });

  test("local image mode defaults to noop", () => {
    delete process.env.HOMIE_IMAGE_UPLOAD_MODE;
    expect(resolveImageUploadMode()).toBe("noop");
  });
});
