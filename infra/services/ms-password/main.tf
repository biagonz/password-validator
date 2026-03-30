# ── ms-password: Lambda + ECR + rotas no API Gateway ─────────────────────────
#
# Lê os outputs do shared (Cognito, API GW, IAM Role) via remote state.
# Cria: repositório ECR, função Lambda, integração e rotas no API Gateway.
#
# Em multi-repo: mova este diretório para o repo ms-password como infra/
# O backend.tf aponta para o mesmo S3 bucket — nenhuma outra mudança necessária.
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

# ── Leitura do state compartilhado ────────────────────────────────────────────

data "terraform_remote_state" "shared" {
  backend = "s3"
  config = {
    bucket = "password-validator-300326-tfstate"
    key    = "shared/terraform.tfstate"
    region = var.aws_region
  }
}

# ── Lambda + ECR ──────────────────────────────────────────────────────────────

module "lambda" {
  source = "../../modules/lambda-service"

  service_name              = "ms-password"
  execution_role_arn        = data.terraform_remote_state.shared.outputs.lambda_execution_role_arn
  api_gateway_execution_arn = data.terraform_remote_state.shared.outputs.api_gateway_execution_arn
  image_tag                 = var.image_tag
  app_port                  = 3001
  lwa_remove_base_path      = "/${var.environment}"

  environment_variables = {
    COGNITO_USER_POOL_ID = data.terraform_remote_state.shared.outputs.cognito_user_pool_id
    JWT_EXPIRES_IN       = "1h"
    CLIENT_ID            = data.terraform_remote_state.shared.outputs.cognito_client_id
    CLIENT_SECRET        = data.terraform_remote_state.shared.outputs.cognito_client_secret
  }
}

# ── Rotas no API Gateway ───────────────────────────────────────────────────────

# Integração: conecta o API Gateway à função Lambda
resource "aws_apigatewayv2_integration" "ms_password" {
  api_id                 = data.terraform_remote_state.shared.outputs.api_gateway_id
  integration_type       = "AWS_PROXY"
  integration_uri        = module.lambda.invoke_arn
  payload_format_version = "2.0"
}

# Rota pública: emite token JWT (client_id + client_secret no body)
resource "aws_apigatewayv2_route" "auth_token" {
  api_id    = data.terraform_remote_state.shared.outputs.api_gateway_id
  route_key = "POST /auth/token"
  target    = "integrations/${aws_apigatewayv2_integration.ms_password.id}"
}

# Rota protegida: validação de senha (requer Bearer token no header Authorization)
# A validação do token é feita pelo JwtAuthGuard do NestJS (HS256 + JWT_SECRET),
# não pelo Cognito Authorizer do API Gateway — os dois são incompatíveis pois
# o NestJS gera tokens HS256 enquanto o Cognito emite RS256.
resource "aws_apigatewayv2_route" "password_validate" {
  api_id    = data.terraform_remote_state.shared.outputs.api_gateway_id
  route_key = "POST /password/validate"
  target    = "integrations/${aws_apigatewayv2_integration.ms_password.id}"
}
