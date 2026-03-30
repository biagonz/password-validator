variable "service_name" {
  description = "Nome do serviço (usado como nome do repositório ECR e da função Lambda)"
  type        = string
}

variable "image_tag" {
  description = "Tag da imagem Docker no ECR (ex: 'latest' ou o SHA do commit)"
  type        = string
  default     = "latest"
}

variable "execution_role_arn" {
  description = "ARN da IAM Role que a função Lambda vai assumir para executar"
  type        = string
}

variable "api_gateway_execution_arn" {
  description = "ARN de execução do API Gateway (usado na permissão Lambda)"
  type        = string
}

variable "environment_variables" {
  description = "Variáveis de ambiente injetadas na função Lambda em runtime"
  type        = map(string)
  default     = {}
}

variable "memory_size" {
  description = "Memória alocada para a função Lambda em MB"
  type        = number
  default     = 512
}

variable "timeout" {
  description = "Timeout da função Lambda em segundos (máximo: 900)"
  type        = number
  default     = 30
}

variable "app_port" {
  description = "Porta em que o servidor HTTP da aplicação escuta (usada pelo Lambda Web Adapter)"
  type        = number
  default     = 3001
}

variable "lwa_remove_base_path" {
  description = "Prefixo de path removido pelo Lambda Web Adapter antes de repassar ao app (ex: /prod). Deve coincidir com o stage name do API Gateway."
  type        = string
  default     = ""
}
