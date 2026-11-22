@echo off
REM MuniStoDomingo Tramites - inicia todo con Docker (doble clic en Windows).
REM Revisa que Docker este listo, construye y levanta base de datos, API y frontend,
REM espera a que respondan y abre la aplicacion en el navegador.
setlocal
cd /d "%~dp0"
title MuniStoDomingo - Iniciar

echo.
echo  MuniStoDomingo Tramites - inicio con Docker
echo  ===========================================
echo.

where docker >nul 2>nul
if errorlevel 1 (
  echo  [X] No se encontro Docker en este equipo.
  echo      Instala Docker Desktop desde https://www.docker.com/products/docker-desktop/
  echo      y vuelve a ejecutar este archivo. Detalle en DOCKER.md, paso 1.
  echo.
  pause
  exit /b 1
)

docker info >nul 2>nul
if errorlevel 1 (
  echo  [X] Docker esta instalado pero no esta encendido.
  echo      Abre Docker Desktop, espera a que diga "Engine running"
  echo      y vuelve a ejecutar este archivo.
  echo.
  pause
  exit /b 1
)

docker compose version >nul 2>nul
if errorlevel 1 (
  echo  [X] Falta Docker Compose v2. Actualiza Docker Desktop a una version reciente.
  echo.
  pause
  exit /b 1
)

REM Puerto de la aplicacion: el de .env.docker, o el de .env.docker.local si existe.
set "PUERTO=8080"
for /f "usebackq tokens=1,* delims==" %%A in (".env.docker") do if "%%A"=="FRONTEND_PORT" set "PUERTO=%%B"
set "EXTRA="
if exist ".env.docker.local" (
  set "EXTRA=--env-file .env.docker.local"
  for /f "usebackq tokens=1,* delims==" %%A in (".env.docker.local") do if "%%A"=="FRONTEND_PORT" set "PUERTO=%%B"
  echo  Usando tambien .env.docker.local para las claves locales.
)

echo  [1/2] Construyendo y levantando los contenedores.
echo        El codigo del front y del back ya viene en esta carpeta. La primera vez
echo        tarda entre 3 y 10 minutos porque Docker descarga las imagenes base
echo        (Node, Nginx, MariaDB) y las librerias npm, y compila. Despues es rapido.
echo.
docker compose --env-file .env.docker %EXTRA% up -d --build --wait
if errorlevel 1 (
  echo.
  echo  [X] No se pudo levantar todo. Causas mas comunes:
  echo      - "port is already allocated": otro programa usa el puerto 8080, 3000 o 3307.
  echo        Cambia FRONTEND_PORT, BACKEND_PORT o DB_EXTERNAL_PORT en .env.docker.
  echo      - Sin internet en el primer arranque: hace falta para descargar las imagenes.
  echo      Para ver el detalle:  docker compose logs backend
  echo      Mas ayuda en DOCKER.md, seccion "Si algo falla".
  echo.
  pause
  exit /b 1
)

echo.
echo  [2/2] Listo. Los tres contenedores estan funcionando.
echo.
echo      Aplicacion:  http://localhost:%PUERTO%
echo      Vecino:      vecino@test.com       contrasena Test1234
echo      Funcionario: funcionario@test.com  contrasena Test1234
echo.
echo      Codigos de verificacion y correos (sin Resend):  docker compose logs -f backend
echo      Para detener:  doble clic en detener.bat  (los datos se conservan)
echo.
if not defined MUNI_NO_ABRIR start "" "http://localhost:%PUERTO%"
pause
