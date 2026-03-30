# ── shell-app: S3 + CloudFront (com origens para mfe e API) ──────────────────
#
# O shell-app é o ponto de entrada do usuário. Seu CloudFront tem 3 origens:
#   /          → S3 com os arquivos estáticos do shell
#   /mfe/*     → CloudFront do mfe-password (lido via remote state)
#   /api/*     → API Gateway do ms-password (lido via remote state)
#
# Esse roteamento no CloudFront elimina problemas de CORS — o browser vê
# tudo como o mesmo domínio.
#
# Em multi-repo: mova este diretório para o repo shell-app como infra/
# As leituras de remote state continuam funcionando pois apontam para o mesmo S3.
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

# ── Leitura dos states dos outros serviços ────────────────────────────────────
# Este é o padrão central para multi-repo:
# o shell-app não importa código do mfe-password nem do shared —
# ele só lê os outputs já publicados no S3 backend.

data "terraform_remote_state" "shared" {
  backend = "s3"
  config = {
    bucket = "password-validator-300326-tfstate"
    key    = "shared/terraform.tfstate"
    region = var.aws_region
  }
}

data "terraform_remote_state" "mfe_password" {
  backend = "s3"
  config = {
    bucket = "password-validator-300326-tfstate"
    key    = "services/mfe-password/terraform.tfstate"
    region = var.aws_region
  }
}

# ── CloudFront Origin Access Control ──────────────────────────────────────────

resource "aws_cloudfront_origin_access_control" "this" {
  name                              = "shell-app-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# ── CloudFront Distribution ────────────────────────────────────────────────────

resource "aws_cloudfront_distribution" "this" {
  enabled             = true
  default_root_object = "index.html"
  price_class         = "PriceClass_100"

  # ── Origem 1: S3 com os arquivos do shell ─────────────────────────────────
  origin {
    domain_name              = module.s3.bucket_regional_domain_name
    origin_id                = "s3-shell-app"
    origin_access_control_id = aws_cloudfront_origin_access_control.this.id
  }

  # ── Origem 2: CloudFront do mfe-password ──────────────────────────────────
  # Ao rotear /mfe/* para o CloudFront do mfe, o browser não precisa conhecer
  # a URL real do mfe — tudo vem do mesmo domínio do shell.
  origin {
    # Extrai apenas o hostname do output (remove o "https://")
    domain_name = replace(
      data.terraform_remote_state.mfe_password.outputs.cloudfront_domain,
      "https://",
      ""
    )
    origin_id = "cloudfront-mfe-password"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # ── Origem 3: API Gateway do ms-password ──────────────────────────────────
  # invoke_url formato: https://<id>.execute-api.<region>.amazonaws.com/<stage>
  # domain_name aceita apenas o hostname — o stage vai em origin_path.
  origin {
    domain_name = split("/", replace(
      data.terraform_remote_state.shared.outputs.api_gateway_endpoint,
      "https://", ""
    ))[0]
    origin_path = "/${split("/", replace(
      data.terraform_remote_state.shared.outputs.api_gateway_endpoint,
      "https://", ""
    ))[1]}"
    origin_id = "api-gateway-ms-password"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # ── Comportamento padrão: serve o shell do S3 ─────────────────────────────
  default_cache_behavior {
    target_origin_id       = "s3-shell-app"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]

    forwarded_values {
      query_string = false
      cookies { forward = "none" }
    }

    min_ttl     = 0
    default_ttl = 86400
    max_ttl     = 31536000
  }

  # ── Comportamento /mfe/*: encaminha para o CloudFront do mfe-password ──────
  ordered_cache_behavior {
    path_pattern           = "/mfe/*"
    target_origin_id       = "cloudfront-mfe-password"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]

    forwarded_values {
      query_string = false
      cookies { forward = "none" }
    }

    min_ttl     = 0
    default_ttl = 86400
    max_ttl     = 31536000
  }

  # ── Comportamento /api/*: encaminha para o API Gateway ────────────────────
  # Sem cache — APIs não devem ter respostas cacheadas pelo CDN
  ordered_cache_behavior {
    path_pattern           = "/api/*"
    target_origin_id       = "api-gateway-ms-password"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods         = ["GET", "HEAD"]

    forwarded_values {
      query_string = true
      headers      = ["Authorization", "Content-Type"]
      cookies { forward = "none" }
    }

    min_ttl     = 0
    default_ttl = 0
    max_ttl     = 0
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

  bucket_name                 = "password-validator-shell-app-${var.environment}"
  cloudfront_distribution_arn = aws_cloudfront_distribution.this.arn
}
