/**
 * Temporal Schedule specs for Facebook scrape workflows.
 * Awake hours Israel: 09:00–21:00 (no runs 22:00–08:59).
 * During that window, fire about every 4 hours.
 */
import type { ScheduleSpec } from "@temporalio/client";

export const SCRAPE_SCHEDULE_TIMEZONE =
  process.env.HOMIE_SCRAPE_TZ ?? "Asia/Jerusalem";

/** Awake-window fire times (local clock), ~every 4h. */
export const SCRAPE_AWAKE_HOURS = [9, 13, 17, 21] as const;

/** At :00 on each awake hour (Asia/Jerusalem by default). */
export function scrapeScheduleSpec(
  timezone: string = SCRAPE_SCHEDULE_TIMEZONE,
): ScheduleSpec {
  return {
    timezone,
    calendars: [
      {
        comment:
          "Every ~4h during 09:00–21:00 Asia/Jerusalem (09/13/17/21; skip sleep 22:00–08:59)",
        hour: [...SCRAPE_AWAKE_HOURS],
        minute: 0,
      },
    ],
  };
}

export function scrapeScheduleId(groupId: string): string {
  return `fb-scrape-${groupId}`;
}
