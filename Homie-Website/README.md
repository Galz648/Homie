# Homie Website

[![Deployed with Alchemy](https://alchemy.run/alchemy-badge.svg)](https://alchemy.run)

React + Vite frontend with a Cloudflare Worker API, deployed via [Alchemy Vite](https://alchemy.run/guides/cloudflare-vitejs/).

## Setup

```bash
bun install
cp .env.example .env   # set ALCHEMY_PASSWORD
```

## Local development

```bash
bun run dev
```

Alchemy runs Vite with HMR and proxies API routes to the worker.

## Deploy

```bash
bun run login   # one-time Cloudflare auth
bun run deploy
```

## Project structure

```
alchemy.run.ts   # Vite website + worker infrastructure
vite.config.ts   # react() + alchemy() plugins
index.html       # Vite entry
src/
  main.tsx       # React entry
  App.tsx        # UI
  worker.ts      # Cloudflare Worker API (/api/hello)
```
