/**
 * AC: session renew + signal scripts exist; dry-run; auth probe if state present.
 *
 *   bun run check:session-ops
 */
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { probeFacebookSession } from "../src/authProbe.js";
import { loadSettings } from "../src/config.js";
import { sh, temporalAddress } from "./lib/k8sReady.js";

const FB = join(dirname(fileURLToPath(import.meta.url)), "..");

async function main(): Promise<void> {
  const required = [
    join(FB, "src/renewSession.ts"),
    join(FB, "scripts/signal-cookies-renewed.ts"),
    join(FB, "scripts/checkSessionOps.ts"),
    join(FB, "docs/session-renew.md"),
  ];
  for (const p of required) {
    if (!existsSync(p)) throw new Error(`missing ${p}`);
  }

  const doc = readFileSync(join(FB, "docs/session-renew.md"), "utf8");
  for (const needle of [
    "bun run renew",
    "signal-cookies-renewed",
    "facebook_state.json",
    "cookies_renewed",
  ]) {
    if (!doc.includes(needle)) {
      throw new Error(`docs/session-renew.md missing ${needle}`);
    }
  }

  const pkg = readFileSync(join(FB, "package.json"), "utf8");
  for (const script of ["renew", "signal-cookies-renewed"]) {
    if (!pkg.includes(script)) {
      throw new Error(`package.json missing script ${script}`);
    }
  }

  const help = sh("bun", ["run", "signal-cookies-renewed", "--", "--help"], {
    cwd: FB,
  });
  if (help.code !== 0) {
    throw new Error(help.stdout + help.stderr);
  }
  if (!(help.stdout + help.stderr).includes("workflow-id")) {
    throw new Error("signal-cookies-renewed --help missing --workflow-id");
  }

  const dry = sh(
    "bun",
    [
      "run",
      "signal-cookies-renewed",
      "--",
      "--dry-run",
      "--workflow-id",
      "fb-group-session-ops-ac-dry",
    ],
    {
      cwd: FB,
      env: { ...process.env, TEMPORAL_ADDRESS: temporalAddress() },
    },
  );
  if (dry.code !== 0) {
    console.warn(
      "warn: temporal dry-run failed (server may be down):\n" +
        dry.stdout +
        dry.stderr,
    );
  } else if (!dry.stdout.includes("dry-run")) {
    throw new Error("unexpected dry-run output:\n" + dry.stdout);
  }

  const settings = loadSettings();
  if (existsSync(settings.facebookStatePath)) {
    const r = await probeFacebookSession(settings.facebookStatePath);
    if (r.status !== "ok") {
      console.error(JSON.stringify(r));
      process.exit(1);
    }
    console.log(
      `ok: session-ops scripts+docs; auth probe ok (${settings.facebookStatePath})`,
    );
  } else {
    console.log(
      `ok: session-ops scripts+docs (no state at ${settings.facebookStatePath} — run import-chrome-session or renew)`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
