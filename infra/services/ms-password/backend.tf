terraform {
  backend "s3" {
    bucket         = "password-validator-300326-tfstate"
    key            = "services/ms-password/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "password-validator-300326-tflock"
    encrypt        = true
  }
}
