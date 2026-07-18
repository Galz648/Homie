# Terraform + DigitalOcean — single-node k3s droplet
#
# Manages: droplet, SSH key, firewall for k3s API / SSH / HTTP(S), WAHA volume(s).
# State: remote S3-compatible backend (DigitalOcean Spaces) — never commit .tfstate.
# Auth: DIGITALOCEAN_TOKEN env var (never commit; never pass on CLI as -var).
# Spaces creds for state: AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY (Spaces keys).

terraform {
  required_version = ">= 1.3.0"

  # Partial config — fill bucket/endpoint via backend.hcl (see backend.hcl.example).
  #   terraform init -backend-config=backend.hcl
  backend "s3" {
    key = "stacks/k3s/terraform.tfstate"
    # DO Spaces is S3-compatible; region is required by the AWS SDK (use us-east-1).
    region = "us-east-1"

    skip_credentials_validation = true
    skip_metadata_api_check     = true
    skip_region_validation      = true
    skip_requesting_account_id  = true
    skip_s3_checksum            = true
  }

  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.50"
    }
  }
}

provider "digitalocean" {
  # Reads DIGITALOCEAN_TOKEN from the environment automatically.
}
