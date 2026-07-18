locals {
  ssh_public_key = trimspace(file(pathexpand(var.ssh_public_key_path)))
  k3s_install_env = join(" ", compact([
    var.k3s_version != "" ? "INSTALL_K3S_VERSION=${var.k3s_version}" : "",
  ]))
  # Firewall / access mode: live Tailscale OR auth-key bootstrap.
  use_tailscale = var.tailscale_auth_key != "" || var.tailscale_enabled
  # Only bake Tailscale into cloud-init when an auth key is present — flipping
  # tailscale_enabled alone must not force droplet recreation.
  install_tailscale_userdata = var.tailscale_auth_key != ""
  public_admin_cidrs         = var.admin_cidrs
}

resource "digitalocean_ssh_key" "k3s" {
  name       = "${var.droplet_name}-key"
  public_key = local.ssh_public_key

  # Same pubkey may already exist on the DO account under another name
  # (e.g. clinic-k3s-key). Import that key; do not rename it out from under clinic.
  lifecycle {
    ignore_changes = [name]
  }
}

resource "digitalocean_droplet" "k3s" {
  name     = var.droplet_name
  region   = var.region
  size     = var.size
  image    = var.image
  ssh_keys = [digitalocean_ssh_key.k3s.id]
  tags     = var.tags
  # Attach Homie data volume at create so cloud-init can mount it.
  volume_ids = [for v in digitalocean_volume.homie_data : v.id]

  # Avoid recreate storms from cloud-init drift after the first boot.
  lifecycle {
    ignore_changes = [user_data]
  }

  # Single-node k3s via official install script (cloud-init user-data).
  # Joins Tailscale when tailscale_auth_key is set (preferred admin path).
  user_data = <<-EOT
    #!/bin/bash
    set -euo pipefail
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -y
    apt-get install -y curl ca-certificates

    mount_do_volume() {
      local vol_name="$1"
      local mount_path="$2"
      local device="/dev/disk/by-id/scsi-0DO_Volume_$${vol_name}"
      mkdir -p "$${mount_path}"
      for _ in $(seq 1 60); do
        if [ -e "$${device}" ]; then
          break
        fi
        sleep 2
      done
      if [ ! -e "$${device}" ]; then
        echo "WARN: volume device $${device} not found; skipping mount" >&2
        return 0
      fi
      if ! mountpoint -q "$${mount_path}"; then
        mount -o defaults,nofail "$${device}" "$${mount_path}"
      fi
      if ! grep -q " $${mount_path} " /etc/fstab; then
        echo "$${device} $${mount_path} ext4 defaults,nofail 0 0" >> /etc/fstab
      fi
    }

    mkdir -p /mnt/homie-data
%{for _k, vol in local.data_volumes~}
    mount_do_volume "${vol.name}" "${vol.mount_path}"
%{endfor~}

    %{if local.install_tailscale_userdata~}
    curl -fsSL https://tailscale.com/install.sh | sh
    # --ssh enables Tailscale SSH; advertise tags if your ACL requires them.
    tailscale up --auth-key='${var.tailscale_auth_key}' --hostname='${var.droplet_name}' --ssh
    %{endif~}

    ${local.k3s_install_env} curl -sfL https://get.k3s.io | sh -s - \
      --write-kubeconfig-mode 644 \
      --disable traefik
    until /usr/local/bin/kubectl get nodes >/dev/null 2>&1; do sleep 2; done
    /usr/local/bin/kubectl wait --for=condition=Ready node --all --timeout=180s
  EOT
}

resource "digitalocean_firewall" "k3s" {
  name = "${var.droplet_name}-fw"

  droplet_ids = [digitalocean_droplet.k3s.id]

  # Prefer Tailscale: no public 22/6443. Optional admin_cidrs = break-glass only.
  dynamic "inbound_rule" {
    for_each = length(local.public_admin_cidrs) > 0 ? [1] : []
    content {
      protocol         = "tcp"
      port_range       = "22"
      source_addresses = local.public_admin_cidrs
    }
  }

  dynamic "inbound_rule" {
    for_each = length(local.public_admin_cidrs) > 0 ? [1] : []
    content {
      protocol         = "tcp"
      port_range       = "6443"
      source_addresses = local.public_admin_cidrs
    }
  }

  dynamic "inbound_rule" {
    for_each = length(local.public_admin_cidrs) > 0 ? [1] : []
    content {
      protocol         = "icmp"
      source_addresses = local.public_admin_cidrs
    }
  }

  # Helps Tailscale peer-to-peer (DERP still works if this is blocked).
  dynamic "inbound_rule" {
    for_each = local.use_tailscale ? [1] : []
    content {
      protocol         = "udp"
      port_range       = "41641"
      source_addresses = ["0.0.0.0/0", "::/0"]
    }
  }

  outbound_rule {
    protocol              = "tcp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }

  outbound_rule {
    protocol              = "udp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }

  outbound_rule {
    protocol              = "icmp"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }

  lifecycle {
    precondition {
      condition     = local.use_tailscale || length(local.public_admin_cidrs) > 0
      error_message = "Set tailscale_auth_key (preferred) or admin_cidrs so you can still reach the droplet."
    }
  }
}
