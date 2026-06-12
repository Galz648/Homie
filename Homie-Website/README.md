# Homie Website

[![Deployed with Alchemy](https://alchemy.run/alchemy-badge.svg)](https://alchemy.run)

A simple BunSPA site with a Cloudflare Worker API, built with [Alchemy BunSPA](https://alchemy.run/providers/cloudflare/bun-spa/).

## Setup

```bash
bun install
```

Create `.env` with an Alchemy password:

```bash
cp .env.example .env
```

## Development

```bash
bun run dev
```

Open the URL printed in the terminal. The page shows **Hello, Homie!** and fetches a message from `/api/hello`.

## Deploy

```bash
bun run deploy
```

## Project structure

```
alchemy.run.ts   # BunSPA infrastructure
bunfig.toml      # Exposes BUN_PUBLIC_* env vars to the frontend
src/
  index.html     # Frontend entry
  main.ts        # Calls the worker API via getBackendUrl()
  worker.ts      # Cloudflare Worker backend
```
