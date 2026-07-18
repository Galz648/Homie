# homie-temporal-worker-k3s

Add Facebook Temporal worker (+ Temporal server) to Homie k3s GitOps YAML for staging; image/CI pin contract documented; no worktrees.

## Goal

Achieve the goal in loop-workspace/inputs/goal.md for the repository at /Users/galzafar/Documents/GitHub/Homie: declare Temporal server and the Facebook Temporal worker in infra/k3s YAML, wire staging overlay, add secrets examples and Dockerfile/image stub, and write CHANGE-MAP.md for build/pin follow-ups. Implement in the current workspace on branch infra (no git worktrees).

## Definition of Done

Staging kustomize build includes scrape-temporal and fb-scrape-worker; secrets.example present; Dockerfile stub present; CHANGE-MAP.md has no TBDs on image/pin/secrets/CI; programmatic checks pass; state chapter_done.

## Verification

- `plan-packages` (programmatic)
- `staging-kustomize` (programmatic)
- `change-map` (programmatic)
- `plan-approved` (human)
- `delivery-ok` (human)

## Council

- No council members configured.

## Gates

- Plan gate: revise_until_clean
- Delivery gate: revise_until_clean

## Loop Control

- Max iterations: 10
- Budget: `{"tokens": 500000, "usd": 1.0, "wall_clock_min": 45}`
- No-progress: `{"action": "stop", "max_stalled_iterations": 2, "signals": ["same blocking issue repeats", "delivery artifact has no material change"]}`

## Execution Boundary

- Mode: `in_session`
- Isolation: `current_workspace`
- Side effects: `{"duplicate_action_check": true, "notes": "May write infra/k3s YAML and looper workspace docs. Do not push, apply to droplet, or create secrets unless operator asks.\n", "requires_approval": true}`

## Observability

- State file: `loop-workspace/state.json`
- Run log: `loop-workspace/run-log.md`
- Checkpoint granularity: `gate`

## Flow Preview

```text
+--------------------------------+
| 1. Goal + context              |
| read sources                   |
+--------------------------------+
               |
               v
+--------------------------------+
| 2. Draft plan.md               |
| state -> loop-workspace/state~ |
+--------------------------------+
               |
               v
+--------------------------------+
| 3. Plan gate                   |
| verdict: human                 |
+--------------------------------+
               | needs work -> revise <= 3 -> step 2
               | pass
               v
+--------------------------------+
| 4. Write delivery-N.md         |
| log -> loop-workspace/run-log~ |
+--------------------------------+
               |
               v
+--------------------------------+
| 5. Delivery gate               |
| verdict: human                 |
+--------------------------------+
               | needs work -> revise <= 3 -> step 4
               | pass
               v
+--------------------------------+
| 6. Final output                |
| all gates clean                |
+--------------------------------+

Stops: pass gates | max 10 iterations | no progress x2 | budget 45m, $1.0, 500000 tokens
```
