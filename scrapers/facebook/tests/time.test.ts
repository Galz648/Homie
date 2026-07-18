import { describe, expect, test } from "vitest";
import { formatIsraelTime } from "../src/time.js";

describe("formatIsraelTime", () => {
  test("formats UTC instant in Asia/Jerusalem", () => {
    // 13:04 UTC in July → 16:04 IDT (UTC+3)
    const s = formatIsraelTime(new Date("2026-07-18T13:04:00.000Z"));
    expect(s).toMatch(/^2026-07-18 16:04:00 IDT$/);
  });

  test("handles null", () => {
    expect(formatIsraelTime(null)).toBe("—");
  });
});
