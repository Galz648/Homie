#!/usr/bin/env bash
# Wire k3s /etc/rancher/k3s/registries.yaml so kubelet can pull from Zot over HTTP.
#
# Why: containerd defaults to HTTPS and the node cannot resolve *.svc.cluster.local.
# This maps zot.local:5000 (and the Service DNS name) to http://<ClusterIP>:5000.
#
# Usage:
#   KUBE_CONTEXT=homie-k3s-droplet ./wire-k3s-registries.sh
#   ./wire-k3s-registries.sh --dry-run
#   ./wire-k3s-registries.sh --no-restart   # write file only (still needs k3s restart later)
#
# Requires: kubectl access; writes the node file via a short-lived privileged pod
# (no SSH). Restarts k3s by default — brief API blip.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NS="${NS:-zot}"
RELEASE="${RELEASE:-homie-zot}"
KUBE_CONTEXT="${KUBE_CONTEXT:-}"
DRY_RUN=0
RESTART=1
FIX_POD="zot-wire-registries"
FIX_NS="kube-system"

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --no-restart) RESTART=0 ;;
    -h|--help)
      sed -n '2,16p' "$0"
      exit 0
      ;;
    *)
      echo "unknown arg: $arg" >&2
      exit 2
      ;;
  esac
done

KCTX=()
if [[ -n "${KUBE_CONTEXT}" ]]; then
  KCTX=(--context "${KUBE_CONTEXT}")
fi

need() { command -v "$1" >/dev/null 2>&1 || { echo "error: need $1" >&2; exit 1; }; }
need kubectl

CIP="$(kubectl "${KCTX[@]}" -n "${NS}" get svc "${RELEASE}" -o jsonpath='{.spec.clusterIP}')"
PORT="$(kubectl "${KCTX[@]}" -n "${NS}" get svc "${RELEASE}" -o jsonpath='{.spec.ports[0].port}')"
[[ -n "${CIP}" && -n "${PORT}" ]] || { echo "error: could not read ${NS}/${RELEASE} ClusterIP:port" >&2; exit 1; }

ENDPOINT="http://${CIP}:${PORT}"
HOSTPORT="${CIP}:${PORT}"
echo "==> Zot endpoint: ${ENDPOINT}"

BODY="$(sed -e "s|{{ZOT_ENDPOINT}}|${ENDPOINT}|g" -e "s|{{ZOT_HOSTPORT}}|${HOSTPORT}|g" "${ROOT}/registries.yaml.tpl")"

if [[ "${DRY_RUN}" -eq 1 ]]; then
  printf '%s\n' "${BODY}"
  exit 0
fi

cleanup() {
  kubectl "${KCTX[@]}" -n "${FIX_NS}" delete pod "${FIX_POD}" --ignore-not-found --wait=false >/dev/null 2>&1 || true
}
trap cleanup EXIT

kubectl "${KCTX[@]}" -n "${FIX_NS}" delete pod "${FIX_POD}" --ignore-not-found --wait=false >/dev/null 2>&1 || true
cat <<EOF | kubectl "${KCTX[@]}" apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: ${FIX_POD}
  namespace: ${FIX_NS}
spec:
  hostNetwork: true
  hostPID: true
  restartPolicy: Never
  containers:
    - name: fix
      image: busybox:1.36
      command: ["sleep", "300"]
      securityContext:
        privileged: true
      volumeMounts:
        - name: host
          mountPath: /host
  volumes:
    - name: host
      hostPath:
        path: /
EOF

kubectl "${KCTX[@]}" -n "${FIX_NS}" wait --for=condition=Ready "pod/${FIX_POD}" --timeout=90s

# Write via stdin to avoid shell-escaping YAML
printf '%s\n' "${BODY}" | kubectl "${KCTX[@]}" -n "${FIX_NS}" exec -i "${FIX_POD}" -- \
  sh -c 'cat > /host/etc/rancher/k3s/registries.yaml && echo wrote && cat /host/etc/rancher/k3s/registries.yaml'

if [[ "${RESTART}" -eq 1 ]]; then
  echo "==> restarting k3s (brief API blip)"
  kubectl "${KCTX[@]}" -n "${FIX_NS}" exec "${FIX_POD}" -- chroot /host systemctl restart k3s
  echo "==> waiting for API"
  for _ in $(seq 1 60); do
    if kubectl "${KCTX[@]}" get --raw=/readyz >/dev/null 2>&1; then
      echo "==> API ready"
      break
    fi
    sleep 5
  done
fi

echo "==> done"
echo "    pull example:  zot.local:5000/homie/smoke:p2"
echo "    or:            homie-zot.zot.svc.cluster.local:5000/homie/smoke:p2"
