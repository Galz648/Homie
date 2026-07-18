# looper-homie-droplet

DigitalOcean **k3s droplet** loop for Homie: TF apply → full monitoring → Argo → staging CI poller with facebook-mock (clinic pull model).

## Locked choices

- Size: `s-4vcpu-8gb`
- Monitoring: **full**
- CI: **1m poll** of GitHub `staging` → `homie-ci-staging` (Facebook mocked)
- No GHA→kubeconfig primary CI

## Run (this session)

Follow [`RUN_IN_SESSION.md`](./RUN_IN_SESSION.md).

## Checks

```bash
python3 looper-homie-droplet/scripts/check-plan-packages.py
python3 looper-homie-droplet/scripts/check-droplet-in-project.py
python3 looper-homie-droplet/scripts/check-k3s-ready.py
python3 looper-homie-droplet/scripts/check-platform-up.py
python3 looper-homie-droplet/scripts/check-staging-ci-tree.py
python3 looper-homie-droplet/scripts/check-staging-ci-smoke.py
python3 looper-homie-droplet/scripts/check-no-gha-kubeconfig-ci.py
```

Optional: `HOMIE_KUBE_CONTEXT=homie-k3s-droplet` (default).
