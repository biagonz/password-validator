variable "bucket_name" {
  description = "Nome do bucket S3 (deve ser globalmente único)"
  type        = string
}

variable "cloudfront_distribution_arn" {
  description = "ARN da distribuição CloudFront que terá acesso ao bucket via OAC"
  type        = string
}
