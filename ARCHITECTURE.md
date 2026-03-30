# Arquitetura AWS — Password Validator

## Visão Geral

```
┌─────────────────────────────────────────────────────────────────────┐
│                           INTERNET                                  │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │   CloudFront    │  ← CDN (cache + HTTPS + WAF)
                    │  (distribuição) │    Único ponto de entrada
                    └────────┬────────┘
           ┌─────────────────┼──────────────────┐
           │                 │                  │
    Origin /             Origin /mfe/        Origin /api/*
           │                 │                  │
    ┌──────▼──────┐   ┌──────▼──────┐   ┌──────▼──────┐
    │     S3      │   │     S3      │   │ API Gateway │
    │  (Shell App)│   │(MFE Password│   │  (HTTP API) │
    │  estático   │   │  estático)  │   └──────┬──────┘
    └─────────────┘   └─────────────┘          │
                                        ┌──────▼──────┐
                                        │   Lambda    │
                                        │(ms-password)│
                                        └──────┬──────┘
                                               │ verifica tokens
                                        ┌──────▼──────┐
                                        │   Cognito   │
                                        │ User Pool + │
                                        │ App Client  │
                                        └─────────────┘
```

---

## Componentes

### CloudFront

- **O que é:** CDN (Content Delivery Network) da AWS — distribui conteúdo de servidores próximos ao usuário
- **Por que:** Reduz latência, habilita HTTPS automático, e pode ter WAF (Web Application Firewall) acoplado
- **FinOps:** ~$0.0085 por GB transferido — custo mínimo para apps com tráfego moderado

### S3 (Shell App + MFE)

- **O que é:** Armazenamento de objetos — servimos os arquivos estáticos (HTML, JS, CSS) do Next.js
- **Por que:** `next build` + `next export` gera arquivos estáticos que o S3 serve diretamente, sem servidor
- **FinOps:** ~$0.023 por GB armazenado/mês — praticamente gratuito para frontends

### API Gateway (HTTP API)

- **O que é:** Proxy gerenciado que recebe requisições HTTP e repassa para o Lambda
- **Por que:** Habilita HTTPS, rate limiting, autenticação integrada com Cognito, e logs automáticos
- **FinOps:** $1.00 por milhão de requisições — serverless, zero custo em ociosidade

### Lambda

- **O que é:** Execução de código sem servidor (serverless) — roda o NestJS em resposta a requisições
- **Por que:** Zero custo quando não há tráfego; escala automaticamente sob carga
- **FinOps:** Primeiros 1 milhão de invocações/mês são gratuitos

### Cognito (substitui o auth local)

- **O que é:** Serviço de autenticação gerenciado da AWS
- **Por que:** Em produção, substitui o `/auth/token` implementado no NestJS — o Cognito gerencia os
  `client_id`/`client_secret`, gera tokens JWT padronizados (OAuth2) e cuida da rotação de segredos
- **FinOps:** Gratuito até 50.000 usuários ativos/mês

---

## Fluxo em Produção

### 1. Deploy do Frontend

```
GitHub Actions (CI/CD)
    │
    ├── npm run build       (gera arquivos estáticos em /out)
    ├── aws s3 sync ./out s3://bucket-shell-app
    └── aws cloudfront create-invalidation  (invalida cache)
```

### 2. Deploy do Backend

```
GitHub Actions (CI/CD)
    │
    ├── docker build → ECR (Elastic Container Registry)
    └── aws lambda update-function-code
```

### 3. Fluxo de uma requisição real

```
Usuário abre https://app.exemplo.com
    │
    ▼ CloudFront
    │  → busca index.html do S3 (shell app)
    │  → retorna para o browser
    │
    ▼ Browser executa JavaScript
    │  → webpack detecta import('mfePassword/PasswordValidator')
    │  → GET https://app.exemplo.com/mfe/remoteEntry.js
    │      CloudFront → S3 (mfe-password)
    │  → carrega o componente
    │
    ▼ Usuário digita senha e clica "Validate"
    │
    ▼ POST https://app.exemplo.com/api/auth/token
    │  CloudFront → API Gateway → Lambda
    │  ← { access_token: "eyJ..." }
    │
    ▼ POST https://app.exemplo.com/api/password/validate
       Header: Authorization: Bearer eyJ...
       CloudFront → API Gateway → Lambda
       Lambda valida token no Cognito → executa PasswordService
       ← { valid: true, errors: [] }
```

---

## Por que esta arquitetura?

| Decisão                       | Alternativa                        | Motivo da escolha                                                           |
| ----------------------------- | ---------------------------------- | --------------------------------------------------------------------------- |
| S3 + CloudFront para frontend | EC2 / ECS servindo Next.js         | Next.js estático não precisa de servidor; S3+CF é 10x mais barato           |
| Lambda para backend           | ECS Fargate                        | Lambda tem custo zero em ociosidade; ideal para APIs com tráfego variável   |
| Cognito para auth             | Auth próprio (nosso `/auth/token`) | Cognito gerencia rotação de segredos, MFA e compliance sem código adicional |
| HTTP API Gateway              | REST API Gateway                   | HTTP API é ~70% mais barato e tem menor latência para casos simples         |

---

## Estimativa de Custo (FinOps)

Cenário: 10.000 validações/mês

| Serviço                                  | Custo estimado/mês |
| ---------------------------------------- | ------------------ |
| S3 (2 buckets, ~10MB)                    | < $0.01            |
| CloudFront (1GB transferência)           | ~$0.09             |
| API Gateway (20.000 req)                 | ~$0.02             |
| Lambda (20.000 invocações, 128MB, 100ms) | $0.00 (free tier)  |
| Cognito (< 50k users)                    | $0.00 (free tier)  |
| **Total**                                | **~$0.11/mês**     |
