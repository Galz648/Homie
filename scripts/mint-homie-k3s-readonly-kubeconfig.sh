#!/usr/bin/env bash
# Mint ~/.kube/homie-k3s-readonly.yaml from SA homie-ops/homie-readonly.
#
# Requires break-glass admin once:
#   KUBECONFIG=~/.kube/homie-k3s-admin.yaml ./scripts/mint-homie-k3s-readonly-kubeconfig.sh
#
# Options:
#   --apply     kubectl apply the RBAC manifests first
#   --install-default
#               also write/replace ~/.kube/homie-k3s.yaml with the readonly config
#               (admin must already live at ~/.kube/homie-k3s-admin.yaml)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MANIFEST="$ROOT/infra/k3s/platform/rbac/homie-readonly.yaml"
OUT_READONLY="${HOMIE_K3S_READONLY_KUBECONFIG:-$HOME/.kube/homie-k3s-readonly.yaml}"
OUT_DEFAULT="$HOME/.kube/homie-k3s.yaml"
ADMIN_KUBECONFIG="${HOMIE_K3S_ADMIN_KUBECONFIG:-$HOME/.kube/homie-k3s-admin.yaml}"

APPLY=0
INSTALL_DEFAULT=0
for arg in "$@"; do
  case "$arg" in
    --apply) APPLY=1 ;;
    --install-default) INSTALL_DEFAULT=1 ;;
    -h|--help)
      sed -n '2,12p' "$0"
      exit 0
      ;;
    *)
      echo "unknown arg: $arg" >&2
      exit 2
      ;;
  esac
done

if [[ -z "${KUBECONFIG:-}" ]]; then
  if [[ -f "$ADMIN_KUBECONFIG" ]]; then
    export KUBECONFIG="$ADMIN_KUBECONFIG"
  elif [[ -f "$OUT_DEFAULT" ]]; then
    export KUBECONFIG="$OUT_DEFAULT"
  else
    echo "ERROR: set KUBECONFIG to break-glass admin kubeconfig" >&2
    exit 1
  fi
fi

echo "using admin KUBECONFIG=$KUBECONFIG"

# Refuse to mint with an already-readonly context (can't create secrets).
if ! kubectl auth can-i create secrets -n homie-ops >/dev/null 2>&1; then
  # namespace may not exist yet — try cluster-admin check
  if ! kubectl auth can-i '*' '*' --all-namespaces >/dev/null 2>&1; then
    echo "ERROR: current kubeconfig cannot create RBAC/secrets — pass admin KUBECONFIG" >&2
    exit 1
  fi
fi

if [[ "$APPLY" -eq 1 ]]; then
  kubectl apply -f "$MANIFEST"
fi

# Wait for token controller to populate the Secret
echo "waiting for SA token Secret…"
for _ in $(seq 1 30); do
  TOKEN=$(kubectl -n homie-ops get secret homie-readonly-token -o jsonpath='{.data.token}' 2>/dev/null || true)
  CA=$(kubectl -n homie-ops get secret homie-readonly-token -o jsonpath='{.data.ca\.crt}' 2>/dev/null || true)
  if [[ -n "${TOKEN:-}" && -n "${CA:-}" ]]; then
    break
  fi
  sleep 1
done
if [[ -z "${TOKEN:-}" || -z "${CA:-}" ]]; then
  echo "ERROR: homie-ops/homie-readonly-token not populated — run with --apply first?" >&2
  exit 1
fi

SERVER=$(kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}')
if [[ -z "$SERVER" ]]; then
  echo "ERROR: could not read cluster server from admin kubeconfig" >&2
  exit 1
fi

mkdir -p "$(dirname "$OUT_READONLY")"
umask 077
cat >"$OUT_READONLY" <<EOF
apiVersion: v1
kind: Config
clusters:
  - name: homie-k3s
    cluster:
      server: ${SERVER}
      certificate-authority-data: ${CA}
contexts:
  - name: homie-k3s-readonly
    context:
      cluster: homie-k3s
      namespace: homie-staging
      user: homie-readonly
current-context: homie-k3s-readonly
users:
  - name: homie-readonly
    user:
      token: $(printf '%s' "$TOKEN" | base64 -d)
EOF
chmod 600 "$OUT_READONLY"
echo "wrote $OUT_READONLY"

# Verify read vs write
export KUBECONFIG="$OUT_READONLY"
if ! kubectl get ns homie-staging >/dev/null; then
  echo "ERROR: readonly kubeconfig cannot get namespaces" >&2
  exit 1
fi
if kubectl auth can-i create deployments -n homie-staging 2>/dev/null | grep -qx yes; then
  echo "ERROR: readonly identity can still create deployments — abort" >&2
  exit 1
fi
echo "ok: can get resources; cannot create deployments"

if [[ "$INSTALL_DEFAULT" -eq 1 ]]; then
  if [[ ! -f "$ADMIN_KUBECONFIG" ]]; then
    echo "ERROR: --install-default requires admin at $ADMIN_KUBECONFIG first" >&2
    exit 1
  fi
  # Refuse to clobber admin if default still looks like the only admin copy
  if [[ "$(realpath "$OUT_DEFAULT" 2>/dev/null || echo "$OUT_DEFAULT")" == "$(realpath "$ADMIN_KUBECONFIG")" ]]; then
    echo "ERROR: default and admin paths resolve to the same file" >&2
    exit 1
  fi
  cp "$OUT_READONLY" "$OUT_DEFAULT"
  chmod 600 "$OUT_DEFAULT"
  echo "installed default $OUT_DEFAULT → readonly (admin: $ADMIN_KUBECONFIG)"
fi
