/**
 * Facebook groups Homie scrapes (members-only — session account must be a member).
 *
 * One Temporal workflow run per group. Fill in real ids/urls before scheduling.
 */
export type FacebookGroup = {
  /** Stable Homie / Temporal id (usually the numeric FB group id). */
  id: string;
  /** Full group URL, or omit and it will be derived from `id`. */
  url?: string;
  /** Optional label for logs / Slack. */
  name?: string;
  /** Set false to skip without deleting the entry. */
  enabled?: boolean;
};

export const facebookGroups: FacebookGroup[] = [
  {
    id: "35819517694",
    url: "https://www.facebook.com/groups/35819517694",
    enabled: true,
  },
];

export function groupUrl(group: FacebookGroup): string {
  if (group.url?.trim()) {
    return group.url.trim().replace(/\/$/, "");
  }
  return `https://www.facebook.com/groups/${group.id}`;
}

export function enabledGroups(): Array<FacebookGroup & { url: string }> {
  return facebookGroups
    .filter((g) => g.enabled !== false)
    .map((g) => ({ ...g, url: groupUrl(g) }));
}
