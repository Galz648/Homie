output "droplet_id" {
  description = "DigitalOcean droplet ID."
  value       = digitalocean_droplet.k3s.id
}

output "droplet_ipv4" {
  description = "Public IPv4 of the k3s node (not used for admin access when Tailscale is enabled)."
  value       = digitalocean_droplet.k3s.ipv4_address
}

output "access_mode" {
  description = "How to reach the node for SSH / kubectl."
  value       = local.use_tailscale ? "tailscale" : (length(local.public_admin_cidrs) > 0 ? "admin_cidrs" : "none")
}

output "ssh_command" {
  description = "SSH into the droplet (Tailscale MagicDNS hostname when enabled)."
  value = local.use_tailscale ? (
    "ssh root@${var.droplet_name}"
    ) : (
    length(local.public_admin_cidrs) > 0 ? "ssh root@${digitalocean_droplet.k3s.ipv4_address}" : "Set tailscale_auth_key or admin_cidrs"
  )
}

output "fetch_kubeconfig_command" {
  description = "Copy k3s kubeconfig and point the API server at the Tailscale hostname (or public IP)."
  value       = <<-EOT
    mkdir -p ~/.kube
    HOST=${local.use_tailscale ? var.droplet_name : digitalocean_droplet.k3s.ipv4_address}
    scp root@$${HOST}:/etc/rancher/k3s/k3s.yaml ~/.kube/homie-k3s.yaml
    sed -i.bak "s/127.0.0.1/$${HOST}/" ~/.kube/homie-k3s.yaml
    export KUBECONFIG=~/.kube/homie-k3s.yaml
    kubectl get nodes
  EOT
}

output "region" {
  value = var.region
}

output "size" {
  value = var.size
}

output "homie_data_volumes" {
  description = "Block volumes for Homie data (staging + production)."
  value = {
    for k, v in digitalocean_volume.homie_data : k => {
      id         = v.id
      name       = v.name
      size_gb    = v.size
      mount_path = local.data_volumes[k].mount_path
    }
  }
}

output "spaces_images" {
  description = "Spaces buckets for scraped listing photos (wire HOMIE_IMAGES_BUCKET per lane)."
  value = {
    for k, v in digitalocean_spaces_bucket.images : k => {
      name          = v.name
      region        = v.region
      bucket_domain = v.bucket_domain_name
      endpoint      = "https://${v.region}.digitaloceanspaces.com"
      # App: HOMIE_IMAGES_BUCKET=<name> HOMIE_IMAGES_BASE_URL=https://<name>.<region>.cdn.digitaloceanspaces.com
    }
  }
}
