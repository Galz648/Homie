# Homie Website

React + Vite frontend. Cloudflare / Alchemy deploy path has been **removed** on
the `infra` branch — platform work lives under repo-root `infra/` (local k3s).

## Setup

```bash
bun install
```

## Local development (UI only)

```bash
bun run dev
```

API / Worker on Cloudflare is retired here. Future API runtime will be defined
under the Homie k3s pack when product code is wired back in.
