output "cognito_user_pool_id" {
  value = aws_cognito_user_pool.this.id
}

output "cognito_domain" {
  value = "https://${aws_cognito_user_pool_domain.this.domain}.auth.${var.aws_region}.amazoncognito.com"
}

output "cognito_client_id" {
  value = aws_cognito_user_pool_client.mfe_password.id
}

output "cognito_client_secret" {
  value     = aws_cognito_user_pool_client.mfe_password.client_secret
  sensitive = true
}

output "lambda_execution_role_arn" {
  value = aws_iam_role.lambda_execution.arn
}

output "api_gateway_id" {
  value = aws_apigatewayv2_api.this.id
}

output "api_gateway_endpoint" {
  value = aws_apigatewayv2_stage.default.invoke_url
}

# execution_arn é usado pelo módulo lambda-service para criar a permissão de invocação
output "api_gateway_execution_arn" {
  value = aws_apigatewayv2_api.this.execution_arn
}

output "cognito_authorizer_id" {
  value = aws_apigatewayv2_authorizer.cognito.id
}
