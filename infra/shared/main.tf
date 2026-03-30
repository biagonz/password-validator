# ── Shared: recursos compartilhados entre todos os serviços ──────────────────
# Contém: Cognito (auth), API Gateway HTTP API, IAM Role para Lambda.
#
# Estes recursos existem uma única vez por ambiente e são referenciados pelos
# serviços via data.terraform_remote_state.shared.
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

# ── Cognito ────────────────────────────────────────────────────────────────────
# Substitui o /auth/token implementado no NestJS.
# Gerencia client_id/client_secret e gera tokens JWT OAuth2 padronizados.

resource "aws_cognito_user_pool" "this" {
  name = "${var.project_name}-${var.environment}"

  # Client Credentials flow não usa usuários humanos — desabilitamos auto-sign-up
  admin_create_user_config {
    allow_admin_create_user_only = true
  }
}

# App Client: representa o mfe-password como cliente OAuth2
# Usa o fluxo Client Credentials (machine-to-machine, sem usuário humano)
resource "aws_cognito_user_pool_client" "mfe_password" {
  name         = "mfe-password-client"
  user_pool_id = aws_cognito_user_pool.this.id

  # Client Credentials: o MFE envia client_id + client_secret para obter token
  allowed_oauth_flows                  = ["client_credentials"]
  allowed_oauth_flows_user_pool_client = true
  generate_secret                      = true

  # O token de acesso terá este scope — o ms-password valida esse scope
  allowed_oauth_scopes = ["${aws_cognito_resource_server.ms_password.identifier}/validate"]

  depends_on = [aws_cognito_resource_server.ms_password]
}

# Resource Server: representa o ms-password como recurso protegido
# Define os scopes que os clients podem solicitar
resource "aws_cognito_resource_server" "ms_password" {
  identifier   = "https://ms-password.${var.project_name}.internal"
  name         = "ms-password"
  user_pool_id = aws_cognito_user_pool.this.id

  scope {
    scope_name        = "validate"
    scope_description = "Permissão para chamar o endpoint de validação de senha"
  }
}

# User Pool Domain: necessário para o endpoint /oauth2/token do Cognito
resource "aws_cognito_user_pool_domain" "this" {
  domain       = "${var.project_name}-${var.environment}"
  user_pool_id = aws_cognito_user_pool.this.id
}

# ── IAM Role para Lambda ───────────────────────────────────────────────────────
# Todos os Lambdas do projeto assumem esta role.
# Tem permissão mínima: só o necessário para rodar e escrever logs.

data "aws_iam_policy_document" "lambda_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "lambda_execution" {
  name               = "${var.project_name}-lambda-execution-${var.environment}"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

# Permissão básica: criar log groups/streams e escrever logs no CloudWatch
resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Permissão para puxar imagens do ECR (necessário para Lambda Container Image)
resource "aws_iam_role_policy_attachment" "lambda_ecr" {
  role       = aws_iam_role.lambda_execution.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

# ── API Gateway HTTP API ───────────────────────────────────────────────────────
# Ponto de entrada HTTP para o ms-password.
# HTTP API é ~70% mais barato que REST API e tem menor latência.

resource "aws_apigatewayv2_api" "this" {
  name          = "${var.project_name}-${var.environment}"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = var.allowed_origins
    allow_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_headers = ["Content-Type", "Authorization"]
    max_age       = 300
  }
}

# Stage: "prod" é o estágio que recebe tráfego real
# $default seria uma alternativa sem prefixo na URL
resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.this.id
  name        = var.environment
  auto_deploy = true

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gateway.arn
    format = jsonencode({
      requestId        = "$context.requestId"
      sourceIp         = "$context.identity.sourceIp"
      httpMethod       = "$context.httpMethod"
      routeKey         = "$context.routeKey"
      status           = "$context.status"
      responseLength   = "$context.responseLength"
      integrationError = "$context.integrationErrorMessage"
    })
  }
}

resource "aws_cloudwatch_log_group" "api_gateway" {
  name              = "/aws/apigateway/${var.project_name}-${var.environment}"
  retention_in_days = 7
}

# Autorizador JWT: valida tokens emitidos pelo Cognito antes de passar para o Lambda
# As rotas protegidas referenciam este autorizador pelo ID
resource "aws_apigatewayv2_authorizer" "cognito" {
  api_id           = aws_apigatewayv2_api.this.id
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"]
  name             = "cognito-jwt"

  jwt_configuration {
    audience = [aws_cognito_user_pool_client.mfe_password.id]
    issuer   = "https://cognito-idp.${var.aws_region}.amazonaws.com/${aws_cognito_user_pool.this.id}"
  }
}
