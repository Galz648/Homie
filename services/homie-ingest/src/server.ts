import { createIngestHandler, type IngestAppDeps } from "./createHandler.js";
import { createDrizzleStore, createMemoryStore } from "./store.js";
import {
  createNoopSlackNotifier,
  createSlackNotifier,
  resolveNewPostingsChannelId,
  type SlackFetch,
} from "./slack.js";
import {
  createNoopRuntimeErrorAlerter,
  createRuntimeErrorAlerter,
  resolveRuntimeErrorsChannelId,
} from "./runtimeErrorAlert.js";

export type StartServerOptions = IngestAppDeps & {
  port?: number;
  hostname?: string;
};

export function resolveDepsFromEnv(env: NodeJS.ProcessEnv = process.env): IngestAppDeps {
  const bearerToken = env.HOMIE_INGEST_BEARER_TOKEN ?? "";
  if (!bearerToken) {
    throw new Error("HOMIE_INGEST_BEARER_TOKEN is required");
  }

  const lane = (env.HOMIE_LANE ?? env.HOMIE_ENV ?? "local").toLowerCase();

  const databaseUrl = env.DATABASE_URL;
  const store =
    env.HOMIE_INGEST_STORE === "memory" || !databaseUrl
      ? createMemoryStore()
      : createDrizzleStore(databaseUrl);

  const botToken = env.SLACK_BOT_TOKEN;
  const successChannelId = resolveNewPostingsChannelId(env);
  const slack =
    botToken && successChannelId
      ? createSlackNotifier({ botToken, channelId: successChannelId })
      : createNoopSlackNotifier();

  const runtimeErrorsChannelId = resolveRuntimeErrorsChannelId(env);
  const runtimeErrors =
    botToken && runtimeErrorsChannelId
      ? createRuntimeErrorAlerter({
          botToken,
          channelId: runtimeErrorsChannelId,
          env: lane,
        })
      : createNoopRuntimeErrorAlerter();

  return { bearerToken, store, slack, runtimeErrors, env: lane };
}

export async function startServer(options: StartServerOptions) {
  const port = options.port ?? Number(process.env.PORT ?? 8080);
  const hostname = options.hostname ?? "0.0.0.0";
  const handler = createIngestHandler({
    bearerToken: options.bearerToken,
    store: options.store,
    slack: options.slack,
    runtimeErrors: options.runtimeErrors,
    env: options.env,
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
export {
  createIngestHandler,
  createMemoryStore,
  createSlackNotifier,
  createNoopRuntimeErrorAlerter,
  createRuntimeErrorAlerter,
};
