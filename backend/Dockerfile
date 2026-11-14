# ── Etapa 1: build ─────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Dependencias primero (aprovecha la caché de capas)
COPY package.json package-lock.json ./
RUN npm ci

# Código fuente y compilación TypeScript → dist/
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# ── Etapa 2: producción ───────────────────────────
FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app

# Solo dependencias de producción (sin typescript, nodemon, ts-node, @types)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# JS compilado desde la etapa anterior (sin source maps ni .d.ts)
COPY --from=builder /app/dist ./dist

# Usuario no-root por seguridad
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "dist/server.js"]
