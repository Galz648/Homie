# k3s containerd registry mirror for in-cluster Zot (HTTP).
# Written to /etc/rancher/k3s/registries.yaml by wire-k3s-registries.sh.
# Placeholder {{ZOT_ENDPOINT}} = http://<homie-zot ClusterIP>:5000

mirrors:
  "zot.local:5000":
    endpoint:
      - "{{ZOT_ENDPOINT}}"
  "homie-zot.zot.svc.cluster.local:5000":
    endpoint:
      - "{{ZOT_ENDPOINT}}"
  "{{ZOT_HOSTPORT}}":
    endpoint:
      - "{{ZOT_ENDPOINT}}"
configs:
  "zot.local:5000":
    tls:
      insecure_skip_verify: true
  "homie-zot.zot.svc.cluster.local:5000":
    tls:
      insecure_skip_verify: true
  "{{ZOT_HOSTPORT}}":
    tls:
      insecure_skip_verify: true
