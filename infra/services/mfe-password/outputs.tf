output "cloudfront_domain" {
  description = "URL do CloudFront do mfe-password. Usar como NEXT_PUBLIC_MFE_PASSWORD_URL no shell-app."
  value       = "https://${aws_cloudfront_distribution.this.domain_name}"
}

output "cloudfront_distribution_id" {
  description = "ID da distribuição CloudFront. Usar no CI/CD para invalidar o cache após o deploy."
  value       = aws_cloudfront_distribution.this.id
}

output "s3_bucket_id" {
  description = "Nome do bucket S3. Usar no CI/CD para o aws s3 sync."
  value       = module.s3.bucket_id
}
