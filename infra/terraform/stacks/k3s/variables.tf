variable "droplet_name" {
  description = "Name of the DigitalOcean droplet running k3s."
  type        = string
  default     = "homie-k3s"
}

variable "region" {
  description = "DigitalOcean region slug (e.g. fra1, nyc3, sfo3)."
  type        = string
  default     = "fra1"
}

variable "size" {
  description = "Droplet size slug. s-2vcpu-4gb is a practical single-node k3s floor."
  type        = string
  default     = "s-4vcpu-8gb"
}

variable "image" {
  description = "Droplet image slug."
  type        = string
  default     = "ubuntu-24-04-x64"
}

variable "ssh_public_key_path" {
  description = "Path to the SSH public key uploaded to DigitalOcean and installed on the droplet."
  type        = string
  default     = "~/.ssh/id_ed25519.pub"
}

variable "k3s_version" {
  description = "Optional k3s version pin (empty = latest stable from get.k3s.io)."
  type        = string
  default     = ""
}

variable "tags" {
  description = "Tags applied to the droplet."
  type        = list(string)
  default     = ["k3s", "homie"]
}

variable "data_volume_size_gb" {
  description = "Size (GiB) for the Homie data volume."
  type        = number
  default     = 1
}

variable "tailscale_auth_key" {
  description = <<-EOT
    Tailscale auth key (reusable, tagged) from https://login.tailscale.com/admin/settings/keys.
    Stored only in gitignored secrets.auto.tfvars. When set, the droplet joins your
    tailnet at boot and admin access is via Tailscale — no home-IP allowlist needed.
  EOT
  type        = string
  sensitive   = true
  default     = ""
}

variable "admin_cidrs" {
  description = <<-EOT
    Optional break-glass CIDRs for public SSH/6443. Leave empty when using Tailscale
    so 22/6443 are not exposed on the public internet. Set a /32 only if you need
    emergency access without Tailscale.
  EOT
  type        = list(string)
  default     = ["77.137.77.43/32"]
}


variable "tailscale_enabled" {
  description = "True when the droplet is already on Tailscale (live install or auth key)."
  type        = bool
  default     = false
}

variable "spaces_images_enabled" {
  description = "Create DigitalOcean Spaces buckets for scraped listing photos (staging + production)."
  type        = bool
  default     = true
}

variable "spaces_images_region" {
  description = "Spaces region for listing-image buckets (usually same as droplet region). Empty = var.region."
  type        = string
  default     = null
}

variable "spaces_images_bucket_staging" {
  description = "Optional override for staging images bucket name (default: <droplet_name>-images-staging)."
  type        = string
  default     = null
}

variable "spaces_images_bucket_production" {
  description = "Optional override for production images bucket name (default: <droplet_name>-images-production)."
  type        = string
  default     = null
}
