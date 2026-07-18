# Homie GitOps CD — parallelization loop

Template: `parallelization`  
Target: `looper-homie-gitops-cd/`  
Root branch: `staging`  
Repo: `/Users/galzafar/Documents/GitHub/Homie`  
Worktrees: `/Users/galzafar/Documents/GitHub/homie-worktrees`

Closes build→pin→Sync / trigger-scrape / migrate PreSync / docs gaps with
**disjoint packages + AC commands**. Manual `kubectl set image` is out of scope
(see `.cursor/rules/no-manual-cluster-mutation.mdc`).

## Run

1. Read `RUN_IN_SESSION.md` (after compile) or ask the agent to follow it.
2. Advanced: `./run-loop.py` (needs `loop.resolved.json`).

## Seed goal

See `inputs/goal.md` for package table and acceptance criteria.
