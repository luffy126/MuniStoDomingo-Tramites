#!/usr/bin/env bash
# Vuelve a traer el código de las ramas backend y frontend a sus carpetas,
# conservando los archivos de Docker (Dockerfile, .dockerignore, nginx.conf).
#
# Uso:  ./sync.sh [ruta-al-repo] [rama-backend] [rama-frontend]
#   ruta-al-repo   clon con acceso a origin (por defecto: este mismo directorio)
#   rama-backend   por defecto origin/backend
#   rama-frontend  por defecto origin/frontend
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
REPO="${1:-$ROOT}"
BACK_REF="${2:-origin/backend}"
FRONT_REF="${3:-origin/frontend}"
KEEP=(Dockerfile .dockerignore nginx.conf)

# SKIP_FETCH=1 usa las refs locales tal como están
[ -n "${SKIP_FETCH:-}" ] || git -C "$REPO" fetch origin --quiet

sync_dir() {
  local dir="$1" ref="$2" tmp
  tmp="$(mktemp -d)"
  for f in "${KEEP[@]}"; do [ -e "$ROOT/$dir/$f" ] && cp "$ROOT/$dir/$f" "$tmp/"; done
  rm -rf "${ROOT:?}/$dir"
  mkdir -p "$ROOT/$dir"
  git -C "$REPO" archive "$ref" | tar -x -C "$ROOT/$dir"
  for f in "${KEEP[@]}"; do [ -e "$tmp/$f" ] && cp "$tmp/$f" "$ROOT/$dir/"; done
  rm -rf "$tmp"
  echo "✔ $dir/ ← $ref ($(git -C "$REPO" rev-parse --short "$ref"))"
}

sync_dir backend  "$BACK_REF"
sync_dir frontend "$FRONT_REF"

# Avisos sobre cosas de las que depende el despliegue
grep -q "trust proxy" "$ROOT/backend/src/app.ts" \
  || echo "⚠ backend/src/app.ts no tiene 'trust proxy': el rate limit verá a todos con la IP de Nginx."
grep -q "VITE_API_URL" "$ROOT/frontend/src/services/apiClient.ts" 2>/dev/null \
  || echo "⚠ apiClient.ts ya no usa VITE_API_URL: revisa cómo arma la URL de la API."

echo "Listo. Reconstruye con: docker compose --env-file .env.docker up -d --build"
