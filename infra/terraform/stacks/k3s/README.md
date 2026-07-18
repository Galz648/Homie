# terraform/stacks/k3s

DigitalOcean **single-node k3s** droplet + firewall + optional data volumes.

Workload apply is **not** here — use `infra/k3s/` Helm packs + overlays.

**Do not apply in the local-platform loop** without explicit operator approval.

## State

Remote S3-compatible backend on DigitalOcean Spaces — see `backend.hcl.example`.

```bash
cp backend.hcl.example backend.hcl
cp terraform.tfvars.example terraform.tfvars
cp secrets.auto.tfvars.example secrets.auto.tfvars
terraform init -backend-config=backend.hcl
terraform plan
```

Never commit `*.tfstate`, `secrets.auto.tfvars`, or `backend.hcl`.
