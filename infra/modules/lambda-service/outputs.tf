output "function_arn" {
  value = aws_lambda_function.this.arn
}

output "function_name" {
  value = aws_lambda_function.this.function_name
}

# invoke_arn é o ARN usado pelo API Gateway para invocar a função
output "invoke_arn" {
  value = aws_lambda_function.this.invoke_arn
}

output "ecr_repository_url" {
  value = aws_ecr_repository.this.repository_url
}
