# ─── Stage 1: Builder ────────────────────────────────────────────────────────
# Instala todas as dependências (incluindo devDependencies) e compila TypeScript
FROM node:22-alpine AS builder

WORKDIR /app

# Copia apenas os arquivos de manifesto primeiro
# Isso aproveita o cache do Docker: se package.json não mudou, não reinstala
COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

# ─── Stage 2: Production ─────────────────────────────────────────────────────
# Imagem final: só o necessário para rodar
FROM node:22-alpine AS production

WORKDIR /app

# Apenas dependências de produção (sem devDependencies)
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copia o código compilado do stage anterior
COPY --from=builder /app/dist ./dist

# Lambda Web Adapter: converte eventos do API Gateway em requisições HTTP
# para que o NestJS (servidor HTTP comum) funcione dentro do Lambda.
# Em container images, deve ir em /opt/extensions (carregado como extensão automática),
# não em /opt/bootstrap (que é para zip-based functions com Lambda RIC).
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:0.8.4 /lambda-adapter /opt/extensions/lambda-adapter

# Usuário não-root por segurança (boa prática em containers)
USER node

EXPOSE 3001

CMD ["node", "dist/main"]