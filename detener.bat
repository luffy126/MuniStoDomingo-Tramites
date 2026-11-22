@echo off
REM MuniStoDomingo Tramites - detiene los contenedores (doble clic en Windows).
REM Los datos (base de datos y documentos adjuntos) se conservan para el proximo inicio.
setlocal
cd /d "%~dp0"
title MuniStoDomingo - Detener

set "EXTRA="
if exist ".env.docker.local" set "EXTRA=--env-file .env.docker.local"

echo.
echo  Deteniendo MuniStoDomingo Tramites...
echo.
docker compose --env-file .env.docker %EXTRA% down
if errorlevel 1 (
  echo.
  echo  [X] No se pudo detener. Revisa que Docker Desktop este encendido.
  echo.
  pause
  exit /b 1
)
echo.
echo  Listo. Los datos se conservan: vuelve a iniciar con iniciar.bat
echo.
pause
