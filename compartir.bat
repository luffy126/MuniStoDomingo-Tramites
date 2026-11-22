@echo off
REM MuniStoDomingo Tramites - comparte la app con una URL publica (Cloudflare Tunnel).
REM Primero inicia la app con iniciar.bat. Detalle en compartir.ps1 e INSTALAR.md.
REM   compartir.bat          https://muni.tenerex.cl (necesita cloudflare-token.txt)
REM   compartir.bat -Rapido  URL al azar *.trycloudflare.com, sin cuenta
setlocal
cd /d "%~dp0"
title MuniStoDomingo - Compartir

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0compartir.ps1" %*

echo.
pause
