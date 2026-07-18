import { resolveDepsFromEnv, startServer } from "./server.js";

async function main() {
  const deps = resolveDepsFromEnv();
  const server = await startServer({
    ...deps,
    port: Number(process.env.PORT ?? 8080),
  });
  console.log(`[homie-ingest] listening on ${server.url}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
