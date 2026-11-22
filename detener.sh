#!/usr/bin/env bash
# MuniStoDomingo Tramites - detiene los contenedores (macOS / Linux).
# Los datos (base de datos y documentos adjuntos) se conservan para el próximo inicio.
set -uo pipefail
cd "$(dirname "$0")"
EXTRA=()
[ -f .env.docker.local ] && EXTRA=(--env-file .env.docker.local)
docker compose --env-file .env.docker "${EXTRA[@]}" down || { echo " [X] No se pudo detener: ¿Docker está encendido?"; exit 1; }
echo
echo " Listo. Los datos se conservan: vuelve a iniciar con ./iniciar.sh"
