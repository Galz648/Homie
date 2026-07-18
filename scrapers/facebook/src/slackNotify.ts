import type { AuthProbeResult, AuthStatus } from "./authProbe.js";
import type { RunReport } from "./pipeline/types.js";
import { formatIsraelTime } from "./time.js";

/** Stable error codes for #homie-runtime-errors (searchable / filterable). */
export type RuntimeErrorCode =
  | "session_expired"
  | "zero_results"
  | "below_baseline"
  | "throttle"
  | "dependency_failed"
  | "unhandled";

export type RuntimeErrorMessageInput = {
  /** Dotted component, e.g. facebook.auth */
  component: string;
  code: RuntimeErrorCode;
  /** One-line human summary */
  summary: string;
  service: string;
  /** local | staging | prod */
  env: string;
  occurredAt?: Date;
  /** Soft correlation */
  workflowId?: string;
  runId?: string;
  activity?: string;
  /** Soft entity */
  groupId?: string;
  groupUrl?: string;
  /** Evidence lines (no secrets / PII dumps) */
  evidence?: string[];
  /** Numbered next steps when a human must act */
  nextSteps?: string[];
};

export type RuntimeErrorMessage = {
  /** Short notification / search line */
  text: string;
  /** Full channel body (mrkdwn) */
  body: string;
  blocks: SlackBlock[];
};

type SlackBlock = {
  type: string;
  text?: { type: string; text: string };
};

export function formatRuntimeErrorMessage(
  input: RuntimeErrorMessageInput,
): RuntimeErrorMessage {
  const occurred = formatIsraelTime(input.occurredAt ?? new Date());
  const text = [
    "[Homie][error]",
    `[${input.component}]`,
    input.summary,
    input.groupId ? `group=${input.groupId}` : null,
    input.workflowId ? `wf=${input.workflowId}` : null,
  ]
    .filter(Boolean)
    .join(" ");

  const where: string[] = [
    `• service: \`${input.service}\``,
    `• env: \`${input.env}\``,
  ];
  if (input.groupId) {
    where.push(`• group: \`${input.groupId}\``);
  }
  if (input.groupUrl) {
    where.push(`• group_url: ${input.groupUrl}`);
  }
  if (input.workflowId) {
    where.push(`• workflow: \`${input.workflowId}\``);
  }
  if (input.runId) {
    where.push(`• run: \`${input.runId}\``);
  }
  if (input.activity) {
    where.push(`• activity: \`${input.activity}\` @ \`${occurred}\``);
  } else {
    where.push(`• at: \`${occurred}\``);
  }

  const lines = [
    ":rotating_light: *Homie runtime error*",
    `*\`${input.component}\`* · \`${input.code}\` · *${input.env}*`,
    "",
    "*What*",
    input.summary,
    "",
    "*Where*",
    ...where,
  ];

  if (input.evidence?.length) {
    lines.push("", "*Evidence*", ...input.evidence.map((e) => `• ${e}`));
  }

  if (input.nextSteps?.length) {
    lines.push(
      "",
      "*Next*",
      ...input.nextSteps.map((s, i) => `${i + 1}. ${s}`),
    );
  }

  const body = lines.join("\n");
  const blocks: SlackBlock[] = [
    {
      type: "section",
      text: { type: "mrkdwn", text: body },
    },
  ];

  return { text, body, blocks };
}

function authStatusToCode(status: AuthStatus): RuntimeErrorCode {
  switch (status) {
    case "missing_state":
    case "login_wall":
      return "session_expired";
    case "checkpoint":
      return "throttle";
    default:
      return "unhandled";
  }
}

function authSummary(status: AuthStatus): string {
  switch (status) {
    case "missing_state":
      return "Facebook storage state missing — cannot scrape.";
    case "login_wall":
      return "Facebook session invalid / login wall (auth probe failed).";
    case "checkpoint":
      return "Facebook checkpoint / challenge blocking the session.";
    default:
      return "Facebook auth probe returned an ambiguous failure.";
  }
}

/** Auth-probe → shared runtime-error template. */
export function formatAuthFailureMessage(args: {
  groupId: string;
  groupUrl: string;
  result: AuthProbeResult;
  workflowId?: string;
  env?: string;
}): RuntimeErrorMessage {
  const code = authStatusToCode(args.result.status);
  return formatRuntimeErrorMessage({
    component: "facebook.auth",
    code,
    summary: authSummary(args.result.status),
    service: "facebook-scraper",
    env:
      args.env ?? process.env.HOMIE_ENV ?? process.env.HOMIE_LANE ?? "local",
    workflowId: args.workflowId,
    groupId: args.groupId,
    groupUrl: args.groupUrl,
    activity: "probeFacebookAuth",
    evidence: [
      `status: \`${args.result.status}\``,
      `detail: ${args.result.detail}`,
      `state: \`${args.result.statePath}\``,
    ],
    nextSteps: [
      "`cd scrapers/facebook && bun run import-chrome-session` (or `bun run renew`)",
      args.workflowId
        ? `\`bun run signal-cookies-renewed -- --workflow-id ${args.workflowId}\``
        : "`bun run signal-cookies-renewed -- --all-running`",
    ],
  });
}

export async function postRuntimeError(args: {
  botToken: string;
  channelId: string;
  /** Prefer passing a formatted RuntimeErrorMessage */
  message: RuntimeErrorMessage | string;
}): Promise<void> {
  const formatted =
    typeof args.message === "string"
      ? {
          text: args.message,
          body: args.message,
          blocks: [
            {
              type: "section",
              text: { type: "mrkdwn", text: args.message },
            },
          ] satisfies SlackBlock[],
        }
      : args.message;

  const resp = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.botToken}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      channel: args.channelId,
      text: formatted.text,
      blocks: formatted.blocks,
      mrkdwn: true,
    }),
  });

  if (!resp.ok) {
    throw new Error(`Slack HTTP ${resp.status}`);
  }

  const data = (await resp.json()) as { ok?: boolean; error?: string };
  if (!data.ok) {
    throw new Error(`Slack chat.postMessage failed: ${data.error}`);
  }
}

export function shouldAlertAuth(status: AuthStatus): boolean {
  return status !== "ok";
}

function scrapeStatusToCode(
  status: RunReport["status"],
  error?: string,
): RuntimeErrorCode {
  switch (status) {
    case "empty_suspect":
      return "zero_results";
    case "throttle":
      return "throttle";
    case "auth":
      return "session_expired";
    case "crash": {
      const msg = (error ?? "").toLowerCase();
      if (
        msg.includes("does not exist") ||
        msg.includes("econnrefused") ||
        msg.includes("connection") ||
        msg.includes("timeout") ||
        msg.includes("relation ")
      ) {
        return "dependency_failed";
      }
      return "unhandled";
    }
    case "parse":
      return "unhandled";
    default:
      return "unhandled";
  }
}

function scrapeSummary(status: RunReport["status"], error?: string): string {
  switch (status) {
    case "crash":
      return error?.includes("does not exist")
        ? "Scrape crashed — DB schema missing (run drizzle migrate)."
        : "Scrape crashed with an unhandled error.";
    case "empty_suspect":
      return "Scrape finished with zero parseable posts (empty_suspect).";
    case "throttle":
      return "Scrape hit throttle / rate limit.";
    case "auth":
      return "Scrape aborted — session not usable.";
    case "parse":
      return "Scrape failed while parsing the feed.";
    default:
      return "Scrape reported a non-ok status.";
  }
}

/** True for statuses that should page `#homie-runtime-errors`. */
export function shouldAlertScrape(status: RunReport["status"]): boolean {
  return (
    status === "crash" ||
    status === "empty_suspect" ||
    status === "throttle" ||
    status === "parse" ||
    status === "auth"
  );
}

/** RunReport failure → shared runtime-error template. */
export function formatScrapeFailureMessage(args: {
  report: RunReport;
  groupUrl: string;
  workflowId?: string;
  env?: string;
}): RuntimeErrorMessage {
  const { report } = args;
  const code = scrapeStatusToCode(report.status, report.error);
  return formatRuntimeErrorMessage({
    component: "facebook.scrape",
    code,
    summary: scrapeSummary(report.status, report.error),
    service: "facebook-scraper",
    env:
      args.env ?? process.env.HOMIE_ENV ?? process.env.HOMIE_LANE ?? "local",
    workflowId: args.workflowId,
    groupId: report.groupId,
    groupUrl: args.groupUrl,
    activity: "scrapeFacebookGroupFeed",
    evidence: [
      `status: \`${report.status}\``,
      `stop: \`${report.stopReason}\``,
      `seen=${report.postsSeen} new=${report.postsNew}`,
      ...(report.error ? [`error: ${report.error.slice(0, 280)}`] : []),
    ],
    nextSteps:
      code === "dependency_failed"
        ? [
            "Confirm lane Postgres is up (`scrape-postgres`).",
            "Apply schema: Argo PreSync Job `scrape-db-migrate`, or `bun scripts/local-db/migrate.ts` with lane `DATABASE_URL`.",
            "Re-trigger the scrape workflow after migrate succeeds.",
          ]
        : report.status === "auth" || code === "session_expired"
          ? [
              "`cd scrapers/facebook && bun run import-chrome-session` (or `bun run renew`)",
              args.workflowId
                ? `\`bun run signal-cookies-renewed -- --workflow-id ${args.workflowId}\``
                : "`bun run signal-cookies-renewed -- --all-running`",
            ]
          : report.status === "empty_suspect"
            ? [
                "Check facebook-mock / live feed for the group.",
                "Inspect worker logs for parse/selector regressions.",
              ]
            : [
                "Inspect Temporal activity logs for `scrapeFacebookGroupFeed`.",
                "Re-run after fixing the underlying fault.",
              ],
  });
}

export type NewPostingMessageInput = {
  postId: string;
  text: string;
  url: string;
  groupId: string;
  groupUrl?: string;
  env?: string;
};

export type NewPostingMessage = {
  text: string;
  body: string;
  blocks: SlackBlock[];
};

/** One Slack message per newly upserted Facebook listing. */
export function formatNewPostingMessage(
  input: NewPostingMessageInput,
): NewPostingMessage {
  const env =
    input.env ?? process.env.HOMIE_ENV ?? process.env.HOMIE_LANE ?? "local";
  const preview = input.text.replace(/\s+/g, " ").trim().slice(0, 280);
  const text = [
    "[Homie][posting]",
    `env=${env}`,
    `group=${input.groupId}`,
    `postId=${input.postId}`,
  ].join(" ");

  const lines = [
    ":house: *New Facebook listing*",
    `• env: \`${env}\``,
    `• group: \`${input.groupId}\``,
    `• postId: \`${input.postId}\``,
    input.url ? `• url: ${input.url}` : null,
    preview ? `• preview: ${preview}` : null,
  ].filter(Boolean) as string[];

  const body = lines.join("\n");
  return {
    text,
    body,
    blocks: [
      {
        type: "section",
        text: { type: "mrkdwn", text: body },
      },
    ],
  };
}

export async function postNewPosting(args: {
  botToken: string;
  channelId: string;
  message: NewPostingMessage | string;
}): Promise<void> {
  const formatted =
    typeof args.message === "string"
      ? {
          text: args.message,
          body: args.message,
          blocks: [
            {
              type: "section",
              text: { type: "mrkdwn", text: args.message },
            },
          ] satisfies SlackBlock[],
        }
      : args.message;

  const resp = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.botToken}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      channel: args.channelId,
      text: formatted.text,
      blocks: formatted.blocks,
      mrkdwn: true,
    }),
  });

  if (!resp.ok) {
    throw new Error(`Slack HTTP ${resp.status}`);
  }

  const data = (await resp.json()) as { ok?: boolean; error?: string };
  if (!data.ok) {
    throw new Error(`Slack chat.postMessage failed: ${data.error}`);
  }
}
