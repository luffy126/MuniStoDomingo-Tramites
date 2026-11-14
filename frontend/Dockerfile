# ── Etapa 1: build ─────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# URL base de la API, inyectada en build time.
# "/" => rutas relativas (/api/...) que Nginx reenvía al backend.
# Ojo: una cadena vacía NO sirve, apiClient.ts cae a http://localhost:3000.
ARG VITE_API_URL=/
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ── Etapa 2: servir con Nginx ─────────────────────
FROM nginx:1.27-alpine

# Build estático
COPY --from=builder /app/dist /usr/share/nginx/html

# Config SPA + proxy reverso a la API
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
