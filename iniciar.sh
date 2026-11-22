#!/usr/bin/env bash
# MuniStoDomingo Tramites - inicia todo con Docker (macOS / Linux).
# Revisa que Docker esté listo, construye y levanta base de datos, API y frontend,
# espera a que respondan y abre la aplicación en el navegador.
set -uo pipefail
cd "$(dirname "$0")"

echo
echo " MuniStoDomingo Trámites - inicio con Docker"
echo " ==========================================="
echo

if ! command -v docker >/dev/null 2>&1; then
  echo " [X] No se encontró Docker. Instálalo desde https://docs.docker.com/get-docker/"
  exit 1
fi
if ! docker info >/dev/null 2>&1; then
  echo " [X] Docker está instalado pero no está encendido (abre Docker Desktop o inicia el servicio)."
  exit 1
fi
if ! docker compose version >/dev/null 2>&1; then
  echo " [X] Falta Docker Compose v2. Actualiza Docker."
  exit 1
fi

leer_puerto() { grep -E '^FRONTEND_PORT=' "$1" 2>/dev/null | tail -1 | cut -d= -f2 | tr -d '\r'; }
PUERTO="$(leer_puerto .env.docker)"; PUERTO="${PUERTO:-8080}"
EXTRA=()
if [ -f .env.docker.local ]; then
  EXTRA=(--env-file .env.docker.local)
  LOCAL="$(leer_puerto .env.docker.local)"; PUERTO="${LOCAL:-$PUERTO}"
  echo " Usando también .env.docker.local para las claves locales."
fi

echo " [1/2] Construyendo y levantando los contenedores."
echo "       El código del front y del back ya viene en esta carpeta. La primera vez"
echo "       tarda entre 3 y 10 minutos porque Docker descarga las imágenes base"
echo "       (Node, Nginx, MariaDB) y las librerías npm, y compila. Después es rápido."
echo
if ! docker compose --env-file .env.docker "${EXTRA[@]}" up -d --build --wait; then
  echo
  echo " [X] No se pudo levantar todo. Causas más comunes:"
  echo "     - \"port is already allocated\": otro programa usa el puerto 8080, 3000 o 3307."
  echo "       Cambia FRONTEND_PORT, BACKEND_PORT o DB_EXTERNAL_PORT en .env.docker."
  echo "     - Sin internet en el primer arranque: hace falta para descargar las imágenes."
  echo "     Para ver el detalle:  docker compose logs backend"
  exit 1
fi

URL="http://localhost:${PUERTO}"
echo
echo " [2/2] Listo. Los tres contenedores están funcionando."
echo
echo "     Aplicación:  ${URL}"
echo "     Vecino:      vecino@test.com       contraseña Test1234"
echo "     Funcionario: funcionario@test.com  contraseña Test1234"
echo
echo "     Códigos de verificación y correos (sin Resend):  docker compose logs -f backend"
echo "     Para detener:  ./detener.sh  (los datos se conservan)"
echo
if [ -z "${MUNI_NO_ABRIR:-}" ]; then
  if command -v open >/dev/null 2>&1; then open "$URL"
  elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$URL" >/dev/null 2>&1 &
  fi
fi
