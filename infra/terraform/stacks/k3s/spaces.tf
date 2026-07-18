# DigitalOcean Spaces buckets for scraped listing photos (staging + production).
# These are object-storage buckets — not the droplet block volumes in volumes.tf.
#
# App env (per lane, out of band — never commit keys):
#   HOMIE_IMAGE_UPLOAD_MODE=spaces
#   HOMIE_IMAGES_BUCKET=<bucket name from output>
#   HOMIE_IMAGES_BASE_URL=https://<bucket>.<region>.cdn.digitaloceanspaces.com
#   HOMIE_SPACES_ENDPOINT=https://<region>.digitaloceanspaces.com
#   HOMIE_SPACES_REGION=<region>
#   HOMIE_SPACES_KEY / HOMIE_SPACES_SECRET

locals {
  spaces_images_region = coalesce(var.spaces_images_region, var.region)
  spaces_images = var.spaces_images_enabled ? {
    staging = {
      name   = coalesce(var.spaces_images_bucket_staging, "${var.droplet_name}-images-staging")
      region = local.spaces_images_region
    }
    production = {
      name   = coalesce(var.spaces_images_bucket_production, "${var.droplet_name}-images-production")
      region = local.spaces_images_region
    }
  } : {}
}

resource "digitalocean_spaces_bucket" "images" {
  for_each = local.spaces_images

  name   = each.value.name
  region = each.value.region
  acl    = "private"
}
