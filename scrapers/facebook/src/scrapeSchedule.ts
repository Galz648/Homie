/**
 * Temporal Schedule specs for Facebook scrape workflows.
 * Awake hours Israel: 09:00–21:00 inclusive (no runs 22:00–08:59).
 */
import type { ScheduleSpec } from "@temporalio/client";

export const SCRAPE_SCHEDULE_TIMEZONE =
  process.env.HOMIE_SCRAPE_TZ ?? "Asia/Jerusalem";

/** Hourly at :00 during awake window (Israel). */
export function scrapeScheduleSpec(
  timezone: string = SCRAPE_SCHEDULE_TIMEZONE,
): ScheduleSpec {
  return {
    timezone,
    calendars: [
      {
        comment: "Hourly 09:00–21:00 Asia/Jerusalem (skip sleep 22:00–09:00)",
        hour: [{ start: 9, end: 21 }],
        minute: 0,
      },
    ],
  };
}

export function scrapeScheduleId(groupId: string): string {
  return `fb-scrape-${groupId}`;
}
