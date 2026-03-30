# ── mfe-password: S3 + CloudFront próprio ────────────────────────────────────
#
# O mfe-password tem seu próprio CloudFront — isso permite que o shell-app
# referencie a URL do mfe via NEXT_PUBLIC_MFE_PASSWORD_URL sem depender de
# um CloudFront compartilhado.
#
# O remoteEntry.js fica disponível em:
#   https://<cloudfront_domain>/_next/static/chunks/remoteEntry.js
#
# Em multi-repo: mova este diretório para o repo mfe-password como infra/
# ──────────────────────────────────────────────────────────────────────────────

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

data "terraform_remote_state" "shared" {
  backend = "s3"
  config = {
    bucket = "password-validator-300326-tfstate"
    key    = "shared/terraform.tfstate"
    region = var.aws_region
  }
}

# ── CloudFront Origin Access Control ──────────────────────────────────────────
# OAC substitui o OAI legado — é a forma atual recomendada pela AWS para
# restringir acesso ao S3 apenas via CloudFront.

resource "aws_cloudfront_origin_access_control" "this" {
  name                              = "mfe-password-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# ── CloudFront Distribution ────────────────────────────────────────────────────
# Criamos o CloudFront ANTES do bucket para ter o ARN disponível na política S3.

resource "aws_cloudfront_distribution" "this" {
  enabled             = true
  default_root_object = "index.html"
  price_class         = "PriceClass_100" # Apenas América do Norte e Europa (mais barato)

  origin {
    domain_name              = module.s3.bucket_regional_domain_name
    origin_id                = "s3-mfe-password"
    origin_access_control_id = aws_cloudfront_origin_access_control.this.id
  }

  default_cache_behavior {
    target_origin_id       = "s3-mfe-password"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    # Cache longo para assets estáticos com hash no nome (ex: chunk.abc123.js)
    min_ttl     = 0
    default_ttl = 86400    # 1 dia
    max_ttl     = 31536000 # 1 ano
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}

# ── S3 Bucket ─────────────────────────────────────────────────────────────────

module "s3" {
  source = "../../modules/s3-frontend"

  bucket_name                 = "password-validator-mfe-password-${var.environment}"
  cloudfront_distribution_arn = aws_cloudfront_distribution.this.arn
}
