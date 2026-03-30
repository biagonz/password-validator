# ─── Stage 1: Builder ────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG NEXT_PUBLIC_MFE_PASSWORD_URL=http://mfe-password:3002
ARG NEXT_PRIVATE_LOCAL_WEBPACK=true

ENV NEXT_PUBLIC_MFE_PASSWORD_URL=$NEXT_PUBLIC_MFE_PASSWORD_URL
ENV NEXT_PRIVATE_LOCAL_WEBPACK=$NEXT_PRIVATE_LOCAL_WEBPACK

RUN npm run build

# ─── Stage 2: Production ─────────────────────────────────────────────────────
FROM node:22-alpine AS production

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

USER node

EXPOSE 3000

CMD ["npm", "start"]