/** Shared helpers for Bun scrape-e2e AC runners. */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import net from "node:net";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_DATABASE_URL =
  "postgresql://homie:homie@127.0.0.1:54329/homie";
export const DEFAULT_TEMPORAL_ADDRESS = "127.0.0.1:7233";
export const HOMIE_NS = "homie";

export function databaseUrl(): string {
  return process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL;
}

export function temporalAddress(): string {
  return process.env.TEMPORAL_ADDRESS ?? DEFAULT_TEMPORAL_ADDRESS;
}

export function sh(
  cmd: string,
  args: string[],
  opts?: { cwd?: string; env?: NodeJS.ProcessEnv },
): { code: number; stdout: string; stderr: string } {
  const r = spawnSync(cmd, args, {
    cwd: opts?.cwd,
    env: opts?.env ?? process.env,
    encoding: "utf8",
  });
  return {
    code: r.status ?? 1,
    stdout: r.stdout ?? "",
    stderr: r.stderr ?? "",
  };
}

export async function waitTcp(
  host: string,
  port: number,
  timeoutMs = 120_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let last = "";
  while (Date.now() < deadline) {
    try {
      await new Promise<void>((resolveP, reject) => {
        const s = net.connect({ host, port }, () => {
          s.end();
          resolveP();
        });
        s.on("error", reject);
        s.setTimeout(2000, () => {
          s.destroy();
          reject(new Error("timeout"));
        });
      });
      return;
    } catch (e) {
      last = e instanceof Error ? e.message : String(e);
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw new Error(`TCP ${host}:${port} not ready: ${last}`);
}

export function kubectlWaitDeploy(name: string, timeout = "180s"): void {
  const r = sh("kubectl", [
    "-n",
    HOMIE_NS,
    "rollout",
    "status",
    `deploy/${name}`,
    `--timeout=${timeout}`,
  ]);
  if (r.code !== 0) {
    throw new Error(
      `kubectl rollout status ${name} failed:\n${r.stdout}${r.stderr}`,
    );
  }
}

export function findRepoRoot(): string {
  if (process.env.HOMIE_REPO_ROOT) return process.env.HOMIE_REPO_ROOT;
  // This file: scrapers/facebook/scripts/lib/k8sReady.ts → repo root = ../../../../
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    resolve(here, "../../../.."),
    resolve(process.cwd(), "../.."),
    process.cwd(),
  ];
  for (const dir of candidates) {
    if (existsSync(join(dir, "infra/k3s/overlays/local/kustomization.yaml"))) {
      return dir;
    }
  }
  return resolve(here, "../../../..");
}

export function ensureLocalOverlay(): void {
  const r = sh("kubectl", ["apply", "-k", "infra/k3s/overlays/local"], {
    cwd: findRepoRoot(),
  });
  if (r.code !== 0) {
    throw new Error(
      `kubectl apply local overlay failed:\n${r.stdout}${r.stderr}`,
    );
  }
}

export function parseHostPort(addr: string): { host: string; port: number } {
  const [host, portS] = addr.includes("://")
    ? (() => {
        const u = new URL(addr);
        return [u.hostname, u.port || "5432"];
      })()
    : addr.split(":");
  return { host: host || "127.0.0.1", port: Number(portS || "5432") };
}
