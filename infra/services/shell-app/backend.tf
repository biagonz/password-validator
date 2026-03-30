# Em multi-repo: este arquivo fica dentro do repo shell-app em infra/backend.tf

terraform {
  backend "s3" {
    bucket         = "password-validator-300326-tfstate"
    key            = "services/shell-app/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "password-validator-300326-tflock"
    encrypt        = true
  }
}
