# looper-homie-droplet (parallelization)

Root worktree / branch for Homie DO droplet work.

| | |
|--|--|
| Root branch | `feat/homie-do-droplet` |
| Root worktree | `/Users/galzafar/Documents/GitHub/homie-worktrees/homie-do-droplet` |
| Package worktrees | `/Users/galzafar/Documents/GitHub/homie-worktrees/<package-id>` |
| Pattern | Looper **parallelization** template |

## Run

Follow [`RUN_IN_SESSION.md`](./RUN_IN_SESSION.md).

## Checks

```bash
cd looper-homie-droplet
python3 scripts/check-plan-packages.py loop-workspace/plan.md
python3 scripts/check-disjoint-paths.py loop-workspace/plan.md
```
