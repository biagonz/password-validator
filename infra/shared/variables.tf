variable "project_name" {
  description = "Nome do projeto (usado como prefixo em todos os recursos)"
  type        = string
  default     = "password-validator"
}

variable "environment" {
  description = "Ambiente de deploy (ex: prod, staging)"
  type        = string
  default     = "prod"
}

variable "aws_region" {
  description = "Região AWS onde os recursos serão criados"
  type        = string
  default     = "us-east-1"
}

variable "allowed_origins" {
  description = "Origens permitidas no CORS do API Gateway (URLs dos frontends)"
  type        = list(string)
  # Atualizar com as URLs reais do CloudFront após o deploy dos frontends
  default = ["*"]
}
