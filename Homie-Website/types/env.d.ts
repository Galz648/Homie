// Legacy Cloudflare Worker env types removed with Alchemy.
// Keep a minimal Env stub so leftover worker.ts still typechecks.

export type HomieEnv = {
  DATABASE_URL: string;
};

declare global {
  type Env = HomieEnv;
}
