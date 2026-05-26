# ============================================================
# Dockerfile — mtgsrc (NestJS standalone microservice)
# ============================================================

# --- Stage 1: Build ---
FROM oven/bun:1.3 AS builder
WORKDIR /app

COPY package.json bun.lock nest-cli.json tsconfig.json ./
RUN bun install --frozen-lockfile

COPY src ./src
RUN bun run build

# --- Stage 2: Production ---
FROM node:22-alpine AS runner
WORKDIR /app

RUN apk add --no-cache curl

ENV NODE_ENV=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./

EXPOSE 3006

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -f http://localhost:3006/ || exit 1

CMD ["node", "dist/main.js"]
