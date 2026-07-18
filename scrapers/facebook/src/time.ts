/** Homie report timezone: Asia/Jerusalem (readable local clock). */

export const HOMIE_TZ = "Asia/Jerusalem";

/**
 * Format an instant for humans in Israel time.
 * Example: `2026-07-18 16:05:57 IDT`
 */
export function formatIsraelTime(input?: Date | string | number | null): string {
  if (input == null || input === "") return "—";
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "—";

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: HOMIE_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZoneName: "longOffset",
  }).formatToParts(d);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";

  // Israel: UTC+2 = IST (standard), UTC+3 = IDT (daylight)
  const offset = get("timeZoneName"); // e.g. GMT+03:00
  const tzLabel = /(?:GMT|UTC)\+0?3/.test(offset)
    ? "IDT"
    : /(?:GMT|UTC)\+0?2/.test(offset)
      ? "IST"
      : offset || "Asia/Jerusalem";

  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}:${get("second")} ${tzLabel}`;
}

/** Alias for report surfaces (Slack, logs, CLI). */
export const formatReportTime = formatIsraelTime;
