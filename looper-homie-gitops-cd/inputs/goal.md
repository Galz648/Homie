# Goal — Homie GitOps CD loop (close drift / no manual mutations)

## Outcome

Make Homie’s **staging/production deploy path pure GitOps**: desired state only
in git, Argo CD Sync applies it, and the incomplete **build → pin → Sync →
verify** and **trigger scrape** gaps are closed with verifiable acceptance
criteria — without `kubectl set image`, overlay bypass, or one-off migrate
Jobs as the lasting fix.

Repository: `/Users/galzafar/Documents/GitHub/Homie`  
Root branch: `staging` (packages fork/merge here; production pin/docs may note
`main` for later)

## Context (must read)

- `.cursor/rules/no-manual-cluster-mutation.mdc`
- `.cursor/rules/gitops-source-of-truth.mdc`
- `.cursor/rules/iac-env-config.mdc`
- `infra/k3s/platform/argo-workflows/README.md`
- `infra/k3s/platform/ci-lane/README.md`
- `infra/k3s/base/scrape-db-migrate/`
- Session proposal: assert-pin script, in-cluster pin after Kaniko, trigger-scrape
  WorkflowTemplate, migrate PreSync polish, docs that still say “pin deferred”

## In scope (packages)

| id | Intent | Acceptance criteria (ac_command must prove) |
|----|--------|-----------------------------------------------|
| `assert-pin` | Script that fails unless git overlay `newTag` == live Deployment image for a lane | Script exists; `--help` or dry-run against kustomize+fake; unit-style self-check exits 0 |
| `trigger-scrape` | Committed Argo WorkflowTemplate/example to start `scrapeFacebookGroup` via Temporal CLI **without** pulling `temporalio/admin-tools` ad hoc | Template + example YAML in repo; `kubectl kustomize`/schema smoke or `rg` contract check exits 0 |
| `docs-cd-loop` | Update SPEC / ci-lane / argo-workflows READMEs: build→pin→Sync is live; no manual image | Grep checks: no “pin deferred” as current truth; documents assert-pin + trigger-scrape |
| `migrate-presync` | PreSync ConfigMap+Job ordering durable; hook-delete / OutOfSync notes | `kubectl kustomize overlays/staging` shows both PreSync; lane/branch guards present; check script exits 0 |
| `pin-from-build` | Extend `homie-build-images` with pin-commit step scaffold + secrets.example for deploy key (no real key in git) | WorkflowTemplate YAML has pin step stubs; example secret doc; compile/validate YAML; AC script exits 0 |
| `platform-wf-app` | Optional Argo CD Application manifest for WorkflowTemplates path (manual apply → GitOps) | Application YAML under `infra/k3s/argocd/applications/`; kustomize/list check exits 0 |

## Anti-goals

- `kubectl set image`, `kubectl apply -k` staging/prod overlays, one-off migrate Job apply as the solution
- Force-push `staging`
- Committing secrets, kubeconfigs, or filled `secrets.auto.tfvars`
- Overlapping `write_paths` in the same `parallel_group`
- Declaring pin-from-build “done” because a human ran `set image`
- macOS: creating worktrees while Cursor `git check-ignore` watchers hold the lock without killing them first (see Homie `macos-git-slowness.mdc`). Prefer kill watchers; if worktree add still hangs, stop and revise isolation with human — do not fight the lock for hours

## Done when

- `plan.md` has ≥2 packages with full fields + disjoint same-group paths
- Each package AC exits 0 in its worktree; branch merged to `staging`; worktree removed
- `PARALLEL-REPORT.md` has per-package AC evidence + merge SHA + worktree removal
- No TBD leftovers; rules against manual mutation remain in force

## Suggested parallel groups (host may refine at plan gate)

- **Group A (parallel):** `assert-pin`, `trigger-scrape`, `docs-cd-loop`
- **Group B (after A or deps):** `migrate-presync` (deps: none or docs), `pin-from-build` (deps: assert-pin), `platform-wf-app` (deps: trigger-scrape optional)
