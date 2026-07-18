# Platform — Zot (Phase 2)

In-cluster OCI registry for Homie images (lightweight alternative to Harbor).

| Item | Default |
|------|---------|
| Namespace | `zot` |
| Helm release | `homie-zot` |
| Chart | `project-zot/zot` **0.1.122** (app v2.1.18) |
| Service | ClusterIP **5000** (no public LB) |
| Persistence | PVC 8Gi (local-path / default SC) |

## Install

```bash
cd infra/k3s/platform/zot
chmod +x install.sh wire-k3s-registries.sh
./install.sh --wait --timeout 10m
# or: KUBE_CONTEXT=k3d-homie-local ./install.sh --wait
```

### Droplet / k3s: enable kubelet pulls (required)

containerd defaults to HTTPS and the node cannot resolve `*.svc.cluster.local`. After Helm install on the droplet:

```bash
KUBE_CONTEXT=homie-k3s-droplet ./wire-k3s-registries.sh
# dry-run: KUBE_CONTEXT=homie-k3s-droplet ./wire-k3s-registries.sh --dry-run
```

That writes `/etc/rancher/k3s/registries.yaml` (from `registries.yaml.tpl`) and restarts k3s briefly so pods can pull:

- `zot.local:5000/<repo>:<tag>`
- `homie-zot.zot.svc.cluster.local:5000/<repo>:<tag>`

Re-run the wire script if the Service ClusterIP changes (reinstall).

## Access (port-forward)

```bash
kubectl -n zot port-forward svc/homie-zot 5000:5000
# Registry API: http://127.0.0.1:5000/v2/
# In-cluster: homie-zot.zot.svc.cluster.local:5000
```

Phase 2 proves the registry exists. Retagging Deployments from `clinic-*:local` is optional follow-on / Phase 3 CI.

## Notes

- Auth off for Phase 2 PoC (ClusterIP only). Add htpasswd before any exposure beyond the cluster.
- Do not enable Ingress/LoadBalancer/NodePort on the droplet without auth (Service stays ClusterIP).
- k3d local may not need `wire-k3s-registries.sh` unless you also want kubelet pulls from Zot there.

## App images (clinic-api / clinic-worker)

Source of truth is **Zot** (not GHCR). In-cluster Kaniko WorkflowTemplate `clinic-build-images` builds and pushes:

- `zot.local:5000/homie/clinic-api:staging-<sha>`
- `zot.local:5000/homie/clinic-worker:staging-<sha>`

Then pins `deploy/k3s/overlays/staging/kustomization.yaml` and Argo CD goes OutOfSync until Sync.

Requires kubelet wire (`./wire-k3s-registries.sh`) and Secret `argo/github-ci-write`.
