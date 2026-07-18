# Optional block volumes for lane-isolated data (staging + production).
# Mount paths are generic — product-specific session stores come later.

locals {
  data_volumes = {
    staging = {
      name        = "${var.droplet_name}-data-staging"
      mount_path  = "/mnt/homie-data/staging"
      description = "Homie staging data volume"
    }
    production = {
      name        = "${var.droplet_name}-data-production"
      mount_path  = "/mnt/homie-data/production"
      description = "Homie production data volume"
    }
  }
}

resource "digitalocean_volume" "homie_data" {
  for_each = local.data_volumes

  region                  = var.region
  name                    = each.value.name
  size                    = var.data_volume_size_gb
  initial_filesystem_type = "ext4"
  description             = each.value.description
}
