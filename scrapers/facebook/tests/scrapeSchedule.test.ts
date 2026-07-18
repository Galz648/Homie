import { describe, expect, test } from "vitest";
import {
  scrapeScheduleId,
  scrapeScheduleSpec,
} from "../src/scrapeSchedule.js";
import { enabledGroups, facebookGroups } from "../src/groups.js";

describe("scrape schedules", () => {
  test("awake hours are 09–21 Israel (no overnight)", () => {
    const spec = scrapeScheduleSpec("Asia/Jerusalem");
    expect(spec.timezone).toBe("Asia/Jerusalem");
    expect(spec.calendars).toEqual([
      expect.objectContaining({
        hour: [{ start: 9, end: 21 }],
        minute: 0,
      }),
    ]);
  });

  test("schedule id is stable per group", () => {
    expect(scrapeScheduleId("telavivroommates")).toBe(
      "fb-scrape-telavivroommates",
    );
  });

  test("telavivroommates is enabled", () => {
    expect(facebookGroups.some((g) => g.id === "telavivroommates")).toBe(true);
    const enabled = enabledGroups();
    expect(enabled.map((g) => g.id)).toContain("telavivroommates");
    expect(
      enabled.find((g) => g.id === "telavivroommates")?.url,
    ).toBe("https://www.facebook.com/groups/telavivroommates");
  });
});
