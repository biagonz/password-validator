# ─── Stage 1: Builder ────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Variáveis de build passadas como ARG (substituídas em CI/CD ou docker build --build-arg)
# ARG diferente de ENV: existe apenas durante o build, não na imagem final
ARG NEXT_PUBLIC_API_URL=http://ms-password:3001
ARG NEXT_PUBLIC_CLIENT_ID
ARG NEXT_PUBLIC_CLIENT_SECRET
ARG NEXT_PRIVATE_LOCAL_WEBPACK=true

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_CLIENT_ID=$NEXT_PUBLIC_CLIENT_ID
ENV NEXT_PUBLIC_CLIENT_SECRET=$NEXT_PUBLIC_CLIENT_SECRET
ENV NEXT_PRIVATE_LOCAL_WEBPACK=$NEXT_PRIVATE_LOCAL_WEBPACK

RUN npm run build

# ─── Stage 2: Production ─────────────────────────────────────────────────────
FROM node:22-alpine AS production

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# O Next.js precisa do diretório .next para servir a aplicação
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

USER node

EXPOSE 3002

CMD ["npm", "start"]