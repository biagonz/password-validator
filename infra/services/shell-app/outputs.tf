output "cloudfront_domain" {
  description = "URL pública do shell-app. Este é o endereço que o usuário acessa."
  value       = "https://${aws_cloudfront_distribution.this.domain_name}"
}

output "cloudfront_distribution_id" {
  description = "ID da distribuição CloudFront. Usar no CI/CD para invalidar o cache."
  value       = aws_cloudfront_distribution.this.id
}

output "s3_bucket_id" {
  description = "Nome do bucket S3. Usar no CI/CD para o aws s3 sync."
  value       = module.s3.bucket_id
}

output "mfe_password_url" {
  description = "URL do mfe-password lida do remote state (para referência e debug)."
  value       = data.terraform_remote_state.mfe_password.outputs.cloudfront_domain
}

output "api_gateway_endpoint" {
  description = "URL do API Gateway lida do remote state (para referência e debug)."
  value       = data.terraform_remote_state.shared.outputs.api_gateway_endpoint
}
