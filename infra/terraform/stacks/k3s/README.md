# terraform/stacks/k3s

DigitalOcean **single-node k3s** droplet + firewall + optional data volumes
+ **Spaces buckets** for scraped listing photos (staging + production).

Workload apply is **not** here — use `infra/k3s/` Helm packs + overlays.

**Do not apply without explicit operator approval.**

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

## Listing images (Spaces)

| Lane | Default bucket name |
|------|---------------------|
| staging | `<droplet_name>-images-staging` |
| production | `<droplet_name>-images-production` |

Toggle with `spaces_images_enabled` / name overrides in `terraform.tfvars`.

After apply, wire the **app** (scraper) per lane — never commit keys:

| Env | Example |
|-----|---------|
| `HOMIE_IMAGE_UPLOAD_MODE` | `spaces` |
| `HOMIE_IMAGES_BUCKET` | output `spaces_images.staging.name` |
| `HOMIE_IMAGES_BASE_URL` | `https://<bucket>.<region>.cdn.digitaloceanspaces.com` |
| `HOMIE_SPACES_ENDPOINT` | `https://fra1.digitaloceanspaces.com` |
| `HOMIE_SPACES_REGION` | `fra1` |
| `HOMIE_SPACES_KEY` / `HOMIE_SPACES_SECRET` | Spaces access key (out of band) |

Local scrape e2e keeps `HOMIE_IMAGE_UPLOAD_MODE=noop` (no Spaces required).

Block volumes (`homie_data_volumes`) are for lane disk on the droplet — **not** photo blobs.
