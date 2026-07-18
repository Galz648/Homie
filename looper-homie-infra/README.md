# looper-homie-infra

Local **k3s platform** loop for Homie (Docker Desktop / k3d).

## Scope

- Homie-named packs under `infra/`: monitoring, Argo CD, Argo Workflows
- Spec + operator README + overlay/TF stubs
- **Ignores** existing application code (`Homie-Website`, Alchemy, drizzle, etc.)

## Run (this session)

Follow [`RUN_IN_SESSION.md`](./RUN_IN_SESSION.md).

## Checks

```bash
python3 looper-homie-infra/scripts/check-plan-packages.py
python3 looper-homie-infra/scripts/check-spec-sections.py
python3 looper-homie-infra/scripts/check-tree-present.py
python3 looper-homie-infra/scripts/check-homie-named.py
python3 looper-homie-infra/scripts/check-install-scripts.py
python3 looper-homie-infra/scripts/check-k3s-ready.py
python3 looper-homie-infra/scripts/check-platform-up.py
```

## Layout

```text
looper-homie-infra/
  loop.yaml
  LOOP.md
  RUN_IN_SESSION.md
  loop.resolved.json
  run-loop.py
  scripts/
  loop-workspace/   # plan.md, deliveries, state, run-log
```

Delivery artifacts land in repo root `infra/` (sibling of this directory).
