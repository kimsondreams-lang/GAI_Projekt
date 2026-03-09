# Multi-stage Dockerfile for Next.js (standalone)

# ---- Builder ----
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files and install all deps (including dev for build)
COPY apps/web/package*.json ./
RUN npm ci

# Copy web source (contents) into builder
COPY apps/web/ ./

# Build Next.js (produces .next/standalone and .next/static)
RUN npm run build

# ---- Runner ----
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0

# Copy the minimal standalone server output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
# Public assets (kopiuj tylko jeśli istnieją) — pominięte, bo brak katalogu

# Optional: expose default port (Railway provides $PORT)
EXPOSE 3000

# Health check using dynamic $PORT
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
  CMD node -e "require('http').get(`http://127.0.0.1:${process.env.PORT||3000}/api/system/status`, (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Start standalone server
CMD ["node", "server.js"]
