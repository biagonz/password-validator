# ── Módulo: lambda-service ────────────────────────────────────────────────────
# Cria um repositório ECR e uma função Lambda que roda a imagem Docker.
#
# Usa Lambda Container Image: a imagem Docker existente (ms-password/Dockerfile)
# roda dentro do Lambda via AWS Lambda Web Adapter — uma extensão Lambda que
# intercepta requisições HTTP e repassa para o servidor NestJS, sem precisar
# alterar o código da aplicação.
#
# Referência: https://github.com/awslabs/aws-lambda-web-adapter
# ──────────────────────────────────────────────────────────────────────────────

# ── ECR ────────────────────────────────────────────────────────────────────────

resource "aws_ecr_repository" "this" {
  name = var.service_name

  # Permite sobrescrever tags (necessário para o deploy contínuo com :latest ou SHA)
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    # Escaneia a imagem automaticamente a cada push em busca de vulnerabilidades
    scan_on_push = true
  }
}

# Política de ciclo de vida: mantém apenas as 5 imagens mais recentes
# Evita que o ECR cresça indefinidamente e gere custo de armazenamento
resource "aws_ecr_lifecycle_policy" "this" {
  repository = aws_ecr_repository.this.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Manter apenas as 5 imagens mais recentes"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = 5
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

# ── Lambda ─────────────────────────────────────────────────────────────────────

resource "aws_cloudwatch_log_group" "this" {
  name              = "/aws/lambda/${var.service_name}"
  retention_in_days = 7
}

resource "aws_lambda_function" "this" {
  function_name = var.service_name
  role          = var.execution_role_arn

  # Lambda Container Image: usa a imagem Docker diretamente do ECR
  package_type = "Image"
  image_uri    = "${aws_ecr_repository.this.repository_url}:${var.image_tag}"

  # Lambda Web Adapter está instalado na imagem em /opt/extensions/lambda-adapter.
  # Ele inicia automaticamente como extensão Lambda e faz proxy das requisições
  # do API Gateway para o servidor HTTP da aplicação na porta definida em app_port.
  image_config {
    command = []
  }

  memory_size = var.memory_size
  timeout     = var.timeout

  environment {
    variables = merge(
      var.environment_variables,
      {
        # Informa ao Lambda Web Adapter qual porta o app está ouvindo
        PORT         = tostring(var.app_port)
        AWS_LWA_PORT = tostring(var.app_port)
        # Remove o prefixo do stage do API Gateway antes de repassar ao app.
        # Ex: /prod/auth/token → /auth/token (NestJS só conhece /auth/token)
        AWS_LWA_REMOVE_BASE_PATH = var.lwa_remove_base_path
      }
    )
  }

  depends_on = [aws_cloudwatch_log_group.this]
}

# Permite que o API Gateway invoque esta função Lambda
resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.this.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${var.api_gateway_execution_arn}/*/*"
}
