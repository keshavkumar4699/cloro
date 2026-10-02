# syntax=docker/dockerfile:1
# Production image for Cloro. Build: docker compose -f docker-compose.prod.yml build

FROM node:22-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# 1. Install dependencies (the postinstall step generates the Prisma client from the schema).
FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --no-audit --no-fund

# 2. Build the app. This stage also runs database migrations and admin scripts (see docker-compose.prod.yml).
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# 3. Small runtime image with only the standalone server.
FROM base AS runner
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 UPLOAD_DIR=/app/uploads
RUN groupadd --system --gid 1001 cloro && useradd --system --uid 1001 --gid cloro cloro \
  && mkdir -p /app/uploads && chown cloro:cloro /app/uploads
COPY --from=builder --chown=cloro:cloro /app/.next/standalone ./
COPY --from=builder --chown=cloro:cloro /app/.next/static ./.next/static
COPY --from=builder --chown=cloro:cloro /app/public ./public
# Prisma's query engine is loaded at runtime; make sure it's present next to the client.
COPY --from=builder --chown=cloro:cloro /app/node_modules/.prisma ./node_modules/.prisma
USER cloro
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
