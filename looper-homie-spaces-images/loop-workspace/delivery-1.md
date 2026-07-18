# delivery-1 — Spaces TF + image upload + docs

## Done

- Three packages planned with concrete `ac_command`s; plan gate programmatic checks passed
- `spaces-tf`, `images-upload`, `spaces-docs` implemented in worktrees, AC green, merged into `feat/homie-spaces-images`, worktrees removed
- Live Spaces smoke deferred until buckets/keys exist (script ready)

## Checks

- plan-packages / disjoint-paths: pass  
- report-schema / worktrees-cleaned: run at delivery gate  
- merges-complete: three merges on feat/homie-spaces-images; package worktrees gone  

Judge: current-session substitute (operator requested run).
