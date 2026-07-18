# Homie workstreams SPEC

Organizing map for what comes after local platform infra.  
Companion: [`infra/SPEC.md`](../infra/SPEC.md) (platform ownership + local proof).

**Branch:** `infra`  
**DO project:** `Homie` (`3ff485b0-8b3e-4f09-8798-079d56ecc498`, Development)

Status legend: `done` · `next` · `later` · `blocked`

---

## Stream overview

| ID | Stream | Intent | Status |
|----|--------|--------|--------|
| W0 | Platform infra (local) | k3d + monitoring + Argo CD + Argo Workflows + CI stubs | **done** |
| W1 | Slack | Workspace/channels, invite, webhooks → CI / errors / logs | next |
| W2 | DigitalOcean remote k3s | Droplet in Homie project, k3s, kubectl context | next |
| W3 | Application architecture | Python ↔ TypeScript ↔ Postgres contracts | later |
| W4 | Application setup on k3s | Workloads, env, migrate/seed (when runtime exists) | later |
| W5 | Pre-commit / drift | Hooks for lint, typecheck, infra/config drift | later |
| W6 | Make the product work | Scraper + API + UI end-to-end behavior | later |
| W7 | E2E tests | Automated proof of W6 (+ CI wiring) | later |

Suggested order: **W0 → W1 ∥ W2 → W3 → W4/W5 → W6 → W7**  
(W1 and W2 can run in parallel; W3 before coding W6.)

---

## W0 — Platform infra (local) — done

- [x] `infra/` tree, Homie-named packs, overlays, TF stub  
- [x] Cloudflare / Alchemy deploy retired on `infra`  
- [x] `k3d-homie-local` + three `install.sh`  
- [x] CI plumbing stubs (`ci-lane`, `homie-ci-smoke`, `argo-ci.yml`)  
- [x] Looper `looper-homie-infra/`  
- [ ] Operator signoff / commit (optional)

---

## W1 — Slack

**Goal:** Homie has a Slack home for ops signals (not product chat spam).

| Task | Notes | Status |
|------|-------|--------|
| W1.1 Choose workspace | Real Slack workspace **or** CLI sandbox (`slack sandbox create`). CLI cannot create a normal workspace. | next |
| W1.2 Invite collaborator | Add your friend as member | next |
| W1.3 Channels | Create at least: `#homie-ci`, `#homie-runtime-errors`, `#homie-app-logs` (align with clinic `#…-alerts-*` pattern) | next |
| W1.4 Incoming webhook / bot | Bot token or webhooks; store out-of-band (`~/.config/homie/slack.env`), never commit | next |
| W1.5 Wire Grafana | `infra/k3s/monitoring` Slack contact points → `#homie-runtime-errors` (and/or infra channel) | later |
| W1.6 Wire Argo CD | OutOfSync / SyncFailed → `#homie-ci` (see `argocd/README-slack.md`) | later |
| W1.7 Wire Argo Workflows / GHA | CI fail/success → `#homie-ci` | later |
| W1.8 App logs path | Alloy/Loki already collect container logs; decide Slack vs Grafana-only for `#homie-app-logs` | later |

**Done when:** friend can see channels; one test message hits each channel from a documented secret path.

---

## W2 — DigitalOcean remote k3s

**Goal:** Managed single-node k3s under DO project **Homie**, reachable with kubectl.

| Task | Notes | Status |
|------|-------|--------|
| W2.1 DO project | Created via `doctl` — Homie / Development | **done** |
| W2.2 Fill TF secrets | `infra/terraform/stacks/k3s` — Spaces backend, Tailscale auth key, tfvars (gitignored) | next |
| W2.3 `terraform plan/apply` | Droplet + firewall + volumes; **explicit approval** | next |
| W2.4 Assign resources to project | `doctl projects resources assign 3ff485b0-… --resource=do:droplet:…` | next |
| W2.5 Install / verify k3s | cloud-init in TF should install k3s; confirm node Ready | next |
| W2.6 kubectl context | Fetch kubeconfig (Tailscale host preferred); e.g. `~/.kube/homie-k3s.yaml`; document in `infra/README.md` | next |
| W2.7 Install platform packs on droplet | Same `install.sh` as local (maybe lite monitoring if RAM tight) | later |
| W2.8 Point Argo / CI at remote | `HOMIE_K3S_KUBECONFIG` for GHA; Argo Applications `targetRevision` | later |

**Done when:** `kubectl --context … get nodes` shows Ready remote node; platform packs optional but documented.

---

## W3 — Application interaction model

**Goal:** Decide how Python, TypeScript, and the database talk — before building scrapers/UI flows.

| Task | Notes | Status |
|------|-------|--------|
| W3.1 Data ownership | Postgres (`apartment_posts` via Drizzle) is source of truth for listings | next |
| W3.2 Python role | Fetcher/scraper (Facebook **not built yet**) writes listings → DB (direct or via API) | next |
| W3.3 TypeScript role | API + Website read DB; Cloudflare Worker path retired — pick Node/Bun in-cluster or host | next |
| W3.4 Write path | Prefer: Python → service role / internal API → DB; avoid dual schemas | next |
| W3.5 Contract doc | Short ADR: tables, who writes, who reads, auth for inserts | next |

**Done when:** one-page ADR exists; no ambiguous dual-write story.

---

## W4 — Application setup (runtime)

Depends on W3.

| Task | Notes | Status |
|------|-------|--------|
| W4.1 API runtime | Container or documented host process; env `DATABASE_URL` | later |
| W4.2 DB in/alongside cluster | In-cluster Postgres **or** Supabase remote; migrate + seed | later |
| W4.3 Kustomize base | `infra/k3s/base/` Deployments/Services when ready | later |
| W4.4 Local overlay | `overlays/local` wires images + secrets examples | later |

---

## W5 — Pre-commit / drift

| Task | Notes | Status |
|------|-------|--------|
| W5.1 Choose hook runner | e.g. pre-commit / lefthook / husky + bun | later |
| W5.2 Fast checks | format, typecheck on staged TS | later |
| W5.3 Drift checks | `infra/` Homie-named invariants (reuse `looper-homie-infra/scripts/check-*.py`); generated env/config sync if added | later |
| W5.4 Skip rules | docs-only / markdown-only paths don’t run heavy gates | later |

**Done when:** a bad rename (`clinic-*` residue) or broken SPEC heading fails locally before push.

---

## W6 — Make the code work

Depends on W3–W4.

| Task | Notes | Status |
|------|-------|--------|
| W6.1 Facebook (or other) fetcher | New Python — does not exist today | later |
| W6.2 Persist listings | Insert/upsert into `apartment_posts` | later |
| W6.3 API list/read | TypeScript serves active listings | later |
| W6.4 UI | Homie-Website shows listings from API | later |

---

## W7 — E2E tests

Depends on W6.

| Task | Notes | Status |
|------|-------|--------|
| W7.1 Local e2e | Seed → fetch or fixture → API → assert UI/API | later |
| W7.2 On-cluster CI | Argo WorkflowTemplate beyond smoke; GHA `argo-ci.yml` submits | later |
| W7.3 Slack on fail | Failures → `#homie-ci` (W1) | later |

---

## Explicit non-goals (until a stream owns them)

- Restoring Alchemy/Cloudflare deploy as the primary path  
- Sharing clinic’s Slack workspace / DO droplet as Homie’s home  
- Committing Slack tokens, kubeconfigs, or `secrets.auto.tfvars`

---

## How to use this doc

1. Pick one stream (usually W1 or W2 next).  
2. Tick tasks in-place or spawn a looper for that stream.  
3. When a stream completes, note date under its **Done when** and link any ADR/PR.
