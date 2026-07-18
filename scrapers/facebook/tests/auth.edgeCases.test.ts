import { describe, expect, test } from "vitest";
import { classifyAuthPage, probeFacebookSession } from "../src/authProbe.js";

describe("auth edge cases", () => {
  test("missing storage state → missing_state", async () => {
    const r = await probeFacebookSession(
      "/tmp/homie-definitely-missing-facebook-state.json",
    );
    expect(r.status).toBe("missing_state");
    expect(r.detail).toMatch(/No storage state/);
  });

  test("login wall from URL or visible copy", () => {
    expect(
      classifyAuthPage("https://www.facebook.com/login", "Log in to Facebook"),
    ).toBe("login_wall");
    expect(
      classifyAuthPage("https://www.facebook.com/", "התחבר לפייסבוק"),
    ).toBe("login_wall");
  });

  test("checkpoint from URL or human-challenge copy", () => {
    expect(
      classifyAuthPage("https://www.facebook.com/checkpoint/123", "ok feed"),
    ).toBe("checkpoint");
    expect(
      classifyAuthPage(
        "https://www.facebook.com/",
        "Confirm you're human to continue",
      ),
    ).toBe("checkpoint");
  });
});
