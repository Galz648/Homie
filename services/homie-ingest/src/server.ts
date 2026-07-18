import { createIngestHandler, type IngestAppDeps } from "./createHandler.js";
import { createDrizzleStore, createMemoryStore } from "./store.js";
import {
  createNoopSlackNotifier,
  createSlackNotifier,
  type SlackFetch,
} from "./slack.js";

export type StartServerOptions = IngestAppDeps & {
  port?: number;
  hostname?: string;
};

export function resolveDepsFromEnv(env: NodeJS.ProcessEnv = process.env): IngestAppDeps {
  const bearerToken = env.HOMIE_INGEST_BEARER_TOKEN ?? "";
  if (!bearerToken) {
    throw new Error("HOMIE_INGEST_BEARER_TOKEN is required");
  }

  const databaseUrl = env.DATABASE_URL;
  const store =
    env.HOMIE_INGEST_STORE === "memory" || !databaseUrl
      ? createMemoryStore()
      : createDrizzleStore(databaseUrl);

  const botToken = env.SLACK_BOT_TOKEN;
  const channelId = env.HOMIE_INGEST_SLACK_CHANNEL_ID;
  const slack =
    botToken && channelId
      ? createSlackNotifier({ botToken, channelId })
      : createNoopSlackNotifier();

  return { bearerToken, store, slack };
}

export async function startServer(options: StartServerOptions) {
  const port = options.port ?? Number(process.env.PORT ?? 8080);
  const hostname = options.hostname ?? "0.0.0.0";
  const handler = createIngestHandler({
    bearerToken: options.bearerToken,
    store: options.store,
    slack: options.slack,
  });

  const server = Bun.serve({
    port,
    hostname,
    fetch: handler,
  });

  return {
    port: server.port,
    hostname,
    url: `http://${hostname === "0.0.0.0" ? "127.0.0.1" : hostname}:${server.port}`,
    stop: () => server.stop(true),
  };
}

export type { SlackFetch };
export { createIngestHandler, createMemoryStore, createSlackNotifier };
