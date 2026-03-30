output "ecr_repository_url" {
  description = "URL do repositório ECR. Usar no CI/CD para fazer push da imagem Docker."
  value       = module.lambda.ecr_repository_url
}

output "lambda_function_name" {
  description = "Nome da função Lambda. Usar no CI/CD para atualizar o código após o push da imagem."
  value       = module.lambda.function_name
}
