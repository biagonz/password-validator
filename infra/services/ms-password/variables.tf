variable "aws_region" {
  default = "us-east-1"
}

variable "image_tag" {
  description = "Tag da imagem Docker no ECR. Em CI/CD, usar o SHA do commit (ex: github.sha)"
  type        = string
  default     = "latest"
}

variable "environment" {
  description = "Nome do stage do API Gateway (deve coincidir com o stage criado no shared)"
  type        = string
  default     = "prod"
}
