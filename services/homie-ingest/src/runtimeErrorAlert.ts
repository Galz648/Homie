import type { RuntimeErrorAlerter } from "./types.js";
import type { SlackFetch } from "./slack.js";

export type RuntimeErrorAlerterConfig = {
  botToken: string;
  channelId: string;
  env: string;
  fetchImpl?: SlackFetch;
};

/**
 * Lane-aware #homie-runtime-errors channel (same convention as fb-scrape-worker).
 * Staging never falls back to the production channel.
 */
export function resolveRuntimeErrorsChannelId(
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  const lane = (env.HOMIE_LANE ?? env.HOMIE_ENV ?? "local").toLowerCase();
  if (lane === "staging") {
    return env.SLACK_STAGING_RUNTIME_ERRORS_CHANNEL_ID?.trim() || undefined;
  }
  return env.SLACK_RUNTIME_ERRORS_CHANNEL_ID?.trim() || undefined;
}

/** Minimal [Homie][error] post for Loki-adjacent Slack ops alerts. */
export function createRuntimeErrorAlerter(
  config: RuntimeErrorAlerterConfig,
): RuntimeErrorAlerter {
  const fetchImpl = config.fetchImpl ?? fetch;

  return {
    async alert(input): Promise<void> {
      const text = [
        "[Homie][error]",
        `[${input.component}]`,
        input.summary,
      ].join(" ");
      const evidence = (input.evidence ?? []).map((e) => `• ${e}`).join("\n");
      const body = [
        ":rotating_light: *Homie runtime error*",
        `*\`${input.component}\`* · \`${input.code}\` · *${config.env}*`,
        "",
        "*What*",
        input.summary,
        "",
        "*Where*",
        `• service: \`homie-ingest\``,
        `• env: \`${config.env}\``,
        evidence ? `\n*Evidence*\n${evidence}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      const resp = await fetchImpl("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.botToken}`,
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify({
          channel: config.channelId,
          text,
          blocks: [
            {
              type: "section",
              text: { type: "mrkdwn", text: body },
            },
          ],
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
    },
  };
}

export function createNoopRuntimeErrorAlerter(): RuntimeErrorAlerter {
  return {
    async alert(): Promise<void> {
      /* intentional no-op */
    },
  };
}
