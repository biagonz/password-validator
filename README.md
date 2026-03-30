# Password Validator

Aplicação full-stack para validação de senhas construída como um desafio técnico para aprender **AWS**, **Module Federation**, **OAuth2** e **NestJS**.

## Visão Geral

O projeto é dividido em três aplicações independentes que se comunicam em produção via AWS:

```
Usuário
  │
  └─▶ CloudFront (shell-app)
          ├─ /          → S3 (shell-app estático)
          ├─ /mfe/*     → CloudFront (mfe-password) → S3 (mfe-password estático)
          └─ /api/*     → API Gateway → Lambda → NestJS (ms-password)
```

| Aplicação      | Tecnologia                | Porta local | Função                                       |
| -------------- | ------------------------- | ----------- | -------------------------------------------- |
| `shell-app`    | Next.js 14 (Pages Router) | 3000        | Host do Micro Frontend                       |
| `mfe-password` | Next.js 15 (Pages Router) | 3002        | Micro Frontend com o componente de validação |
| `ms-password`  | NestJS                    | 3001        | API REST de validação de senhas              |

---

## Arquitetura

### Module Federation

O `shell-app` carrega o componente `PasswordValidator` do `mfe-password` em runtime via [Module Federation](https://module-federation.io/). Cada aplicação é buildada e deployada de forma independente.

```
shell-app (host)
  └─ importa em runtime:
       mfePassword@<URL>/remoteEntry.js
         └─ expõe: ./PasswordValidator
```

### Fluxo de autenticação

```
mfe-password
  │
  ├─ POST /auth/token  { client_id, client_secret, grant_type }
  │     └─▶ ms-password valida credenciais e retorna JWT (HS256)
  │
  └─ POST /password/validate  Authorization: Bearer <token>
        └─▶ ms-password valida o token (JwtAuthGuard) e retorna { valid, errors }
```

### Infraestrutura AWS

```
┌─────────────────────────────────────────────────────────────┐
│  CloudFront (shell-app)  d23svf17vzwino.cloudfront.net      │
│  ├─ Origin 1: S3 (shell-app)      ← rota /                 │
│  ├─ Origin 2: CloudFront mfe-password ← rota /mfe/*        │
│  └─ Origin 3: API Gateway          ← rota /api/*           │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│  CloudFront (mfe-password)               │
│  d23svf17vzwino.cloudfront.net           │
│  └─ Origin: S3 (mfe-password)            │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│  API Gateway HTTP  a7p7mpg7fg.execute-api...         │
│  POST /auth/token       → Lambda ms-password         │
│  POST /password/validate → Lambda ms-password        │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│  Lambda ms-password                      │
│  Container Image (ECR)                   │
│  Lambda Web Adapter → NestJS :3001       │
└──────────────────────────────────────────┘
```

---

## Pré-requisitos

- Node.js >= 20 (usar `nvm use 20`)
- AWS CLI configurado (`aws configure`)
- Terraform >= 1.5
- Docker

---

## Desenvolvimento local

### 1. ms-password (API)

```bash
cd ms-password

# Instalar dependências
npm install

# Criar arquivo de variáveis
cat > .env << EOF
PORT=3001
CLIENT_ID=mfe-password-client
CLIENT_SECRET=mfe-password-secret
JWT_EXPIRES_IN=1h
ALLOWED_ORIGIN=http://localhost:3002
EOF

# Rodar em modo watch
npm run start:dev
```

### 2. mfe-password (Micro Frontend)

```bash
cd mfe-password

# Instalar dependências
npm install

# Criar arquivo de variáveis
cat > .env.local << EOF
NEXT_PRIVATE_LOCAL_WEBPACK=true
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_CLIENT_ID=mfe-password-client
NEXT_PUBLIC_CLIENT_SECRET=mfe-password-secret
EOF

# Rodar na porta 3002
npm run dev
```

### 3. shell-app (Host)

```bash
cd shell-app

# Instalar dependências
npm install

# Criar arquivo de variáveis
cat > .env.local << EOF
NEXT_PRIVATE_LOCAL_WEBPACK=true
NEXT_PUBLIC_MFE_PASSWORD_URL=http://localhost:3002
EOF

# Rodar na porta 3000
npm run dev
```

Acesse: [http://localhost:3000](http://localhost:3000)

---

## Deploy na AWS

### Pré-requisitos

Antes de tudo, o Terraform precisa de um bucket S3 para armazenar o state.
Isso é feito **uma única vez** pelo bootstrap:

```bash
cd infra/bootstrap
terraform init
terraform apply
```

Isso cria:

- Bucket S3: `password-validator-teste-27032026-tfstate`
- Tabela DynamoDB: `password-validator-teste-27032026-tflock`

---

### Passo 1 — Infraestrutura compartilhada (Cognito + API Gateway + IAM)

```bash
cd infra/shared
terraform init
terraform apply
```

Outputs relevantes:

```bash
terraform output api_gateway_endpoint     # URL do API Gateway
terraform output cognito_client_id        # Client ID do Cognito
terraform output -raw cognito_client_secret # Client Secret do Cognito
```

---

### Passo 2 — Deploy do ms-password (Backend)

#### 2a. Build e push da imagem Docker

```bash
cd ms-password

# Login no ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  465900306832.dkr.ecr.us-east-1.amazonaws.com

# Build — obrigatório usar --provenance=false para o Lambda aceitar a imagem
docker build --platform linux/amd64 --provenance=false \
  -t 465900306832.dkr.ecr.us-east-1.amazonaws.com/ms-password:latest .

# Push
docker push 465900306832.dkr.ecr.us-east-1.amazonaws.com/ms-password:latest
```

> **Atenção:** o flag `--provenance=false` é obrigatório. Sem ele, o Docker
> gera um manifest list multi-plataforma que o Lambda não suporta.

#### 2b. Criar infraestrutura e atualizar Lambda

```bash
cd infra/services/ms-password
terraform init
terraform apply
```

#### 2c. Atualizar o código da função Lambda

```bash
aws lambda update-function-code \
  --function-name ms-password \
  --region us-east-1 \
  --image-uri 465900306832.dkr.ecr.us-east-1.amazonaws.com/ms-password:latest

aws lambda wait function-updated --function-name ms-password --region us-east-1
```

---

### Passo 3 — Deploy do mfe-password (Micro Frontend)

#### 3a. Build com variáveis de produção

```bash
cd mfe-password

# Obter os valores do Terraform
API_URL=$(cd ../infra/shared && terraform output -raw api_gateway_endpoint)
CLIENT_ID=$(cd ../infra/shared && terraform output -raw cognito_client_id)
CLIENT_SECRET=$(cd ../infra/shared && terraform output -raw cognito_client_secret)

NEXT_PUBLIC_API_URL=$API_URL \
NEXT_PUBLIC_CLIENT_ID=$CLIENT_ID \
NEXT_PUBLIC_CLIENT_SECRET=$CLIENT_SECRET \
npm run build
```

> **Por que precisa de variáveis no build?**
> `NEXT_PUBLIC_*` no Next.js é resolvido em **tempo de build**, não em runtime.
> Se o build for feito sem essas variáveis, os valores padrão (ex: `localhost:3001`)
> ficam gravados no bundle enviado ao S3.

#### 3b. Upload para S3 e invalidação do CloudFront

```bash
cd infra/services/mfe-password
terraform init
terraform apply

# Obter o bucket e distribution ID
BUCKET=$(terraform output -raw s3_bucket_id)
DIST_ID=$(terraform output -raw cloudfront_distribution_id)

# Sync
cd ../../..
aws s3 sync ./mfe-password/out s3://$BUCKET --delete

# Invalidar cache
aws cloudfront create-invalidation \
  --distribution-id $DIST_ID \
  --paths "/*"
```

---

### Passo 4 — Deploy do shell-app

```bash
cd infra/services/shell-app
terraform init
terraform apply

BUCKET=$(terraform output -raw s3_bucket_id)
DIST_ID=$(terraform output -raw cloudfront_distribution_id)

cd ../../..
aws s3 sync ./shell-app/out s3://$BUCKET --delete

aws cloudfront create-invalidation \
  --distribution-id $DIST_ID \
  --paths "/*"
```

---

## Testar a API

```bash
# 1. Obter token
TOKEN=$(curl -s -X POST \
  https://a7p7mpg7fg.execute-api.us-east-1.amazonaws.com/prod/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "<CLIENT_ID>",
    "client_secret": "<CLIENT_SECRET>",
    "grant_type": "client_credentials"
  }' | jq -r '.access_token')

# 2. Validar senha
curl -s -X POST \
  https://a7p7mpg7fg.execute-api.us-east-1.amazonaws.com/prod/password/validate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"password": "MinhaSenh@123"}'

# Resposta esperada
# { "valid": true, "errors": [] }
```

---

## Estrutura do projeto

```
password-validator/
├── shell-app/              # Next.js 14 — host do Module Federation
├── mfe-password/           # Next.js 15 — micro frontend (componente de validação)
├── ms-password/            # NestJS — API REST
│   ├── src/
│   │   ├── auth/           # POST /auth/token
│   │   └── password/       # POST /password/validate
│   └── Dockerfile
└── infra/                  # Terraform
    ├── bootstrap/          # Criação do backend de estado (executar uma vez)
    ├── shared/             # Cognito, API Gateway, IAM Role
    ├── modules/
    │   ├── lambda-service/ # Módulo reutilizável: ECR + Lambda
    │   └── s3-frontend/    # Módulo reutilizável: S3 + política OAC
    └── services/
        ├── shell-app/      # CloudFront + S3 do shell
        ├── mfe-password/   # CloudFront + S3 do mfe
        └── ms-password/    # Lambda + ECR + rotas API Gateway
```

---

## Decisões técnicas

### Lambda Web Adapter

O NestJS é um servidor HTTP comum. Para rodá-lo dentro do Lambda sem reescrever
o código, usamos o [Lambda Web Adapter (LWA)](https://github.com/awslabs/aws-lambda-web-adapter).
O LWA recebe o evento do API Gateway, converte para uma requisição HTTP e
repassa para o NestJS na porta 3001.

```dockerfile
# Instalação correta para container images (não zip-based functions)
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:0.8.4 \
     /lambda-adapter /opt/extensions/lambda-adapter
```

Variáveis de ambiente necessárias para o LWA:

| Variável                   | Valor   | Motivo                                                |
| -------------------------- | ------- | ----------------------------------------------------- |
| `AWS_LWA_PORT`             | `3001`  | Porta onde o NestJS escuta                            |
| `AWS_LWA_REMOVE_BASE_PATH` | `/prod` | Remove o prefixo do stage antes de repassar ao NestJS |

### Autenticação

O fluxo usa JWT gerado pelo próprio NestJS (HS256). O `JwtAuthGuard` no
controller `/password/validate` valida o token internamente — sem depender do
Cognito JWT Authorizer do API Gateway, que só valida tokens RS256.

### Module Federation no Next.js

O `remoteEntry.js` do `mfe-password` é carregado pelo `shell-app` em runtime.
A URL do remote é definida pela variável `NEXT_PUBLIC_MFE_PASSWORD_URL` no
build do shell-app.

---

## Documentação adicional

- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) — problemas encontrados no deploy e como foram resolvidos
