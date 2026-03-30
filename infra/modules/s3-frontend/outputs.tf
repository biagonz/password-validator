output "bucket_id" {
  value = aws_s3_bucket.this.id
}

output "bucket_arn" {
  value = aws_s3_bucket.this.arn
}

# regional_domain_name é o endpoint correto para usar como origin no CloudFront
# (o domain_name simples pode causar redirect loops)
output "bucket_regional_domain_name" {
  value = aws_s3_bucket.this.bucket_regional_domain_name
}
