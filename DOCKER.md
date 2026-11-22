# Despliegue con Docker (referencia técnica)

> ¿Vas a montarlo en un computador nuevo? Sigue la guía paso a paso [`INSTALAR.md`](INSTALAR.md). Este documento es la referencia técnica.

La aplicación completa (MariaDB + API Express + frontend Ionic/React servido por Nginx) se levanta con un solo comando. En la máquina solo se necesita **Docker con Compose v2** (`docker compose`). No hace falta instalar Node, npm, MariaDB ni XAMPP.

## Levantar

Con los scripts: `iniciar.bat` (Windows, doble clic) o `./iniciar.sh` (macOS/Linux). Revisan que Docker esté encendido, usan `.env.docker.local` si existe, esperan a que todo esté sano y abren el navegador. A mano:

```bash
docker compose --env-file .env.docker up -d --build --wait
```

La primera vez tarda unos minutos (descarga imágenes y compila). `--wait` termina cuando los tres contenedores están `healthy`:

| Qué | URL |
|---|---|
| Aplicación | http://localhost:8080 |
| API (vía Nginx) | http://localhost:8080/api/health |
| API (directo, solo desde este equipo) | http://localhost:3000/api/health |
| MariaDB (desde el host, solo este equipo) | `localhost:3307`, usuario `muniapp` / `munipass` |

**Usuarios de prueba** (contraseña `Test1234`): `vecino@test.com` y `funcionario@test.com`.

## Detener y reiniciar

```bash
docker compose down        # detiene (o detener.bat); los datos y los adjuntos se conservan en sus volúmenes
docker compose --env-file .env.docker up -d --wait   # vuelve a levantar con los mismos datos (o iniciar.bat)
docker compose down -v     # detiene y BORRA la BD y los adjuntos; el próximo arranque vuelve a la semilla
```

Ver logs: `docker compose logs -f backend` (o `db`, `frontend`).

## Arquitectura

```
navegador ──► :8080  frontend (Nginx)
                     ├─ /        → SPA (index.html, assets con caché, cabeceras de seguridad)
                     └─ /api/... → proxy ──► backend:3000 (Express)
                                                ├─► db:3306 (MariaDB, volumen db_data)
                                                └─► /app/uploads (adjuntos, volumen uploads_data)
```

- Los tres servicios comparten la red interna `muni-net` y se ven por nombre de servicio (`db`, `backend`); por eso el backend usa `DB_HOST=db` y no `localhost`.
- El frontend se compila con `VITE_API_URL=/`: el navegador llama a `/api/...` en el mismo origen y Nginx lo reenvía al backend, así que no hay problemas de CORS.
- Orden de arranque con healthchecks: `db` (healthy) → `backend` (healthy en `/api/health`) → `frontend`.
- `backend/schema.sql` se monta en `/docker-entrypoint-initdb.d/`: MariaDB lo ejecuta **solo cuando el volumen está vacío** (primer arranque o tras `down -v`). Ya incluye todo lo de `backend/migrations/`.
- El backend tiene `TRUST_PROXY=1` para que el rate limit use la IP real del cliente (la que reporta Nginx) y no la de Nginx.
- Los puertos de la API (`3000`) y de MariaDB (`3307`) se publican solo en `127.0.0.1`. Con las claves de ejemplo la base no debe verse desde la red, y quien llegue directo a la API podría falsear `X-Forwarded-For` y saltarse el límite de peticiones. Solo el puerto `8080` (Nginx) queda abierto a la red.

## Lo que Nginx hace por la API nueva

- **Adjuntos de hasta 5 MB:** viajan como cuerpo binario crudo; Nginx permite 6 MB (`client_max_body_size`). El límite por defecto de Nginx (1 MB) los habría rechazado con 413.
- **Cabeceras de seguridad** de los estáticos (CSP, `nosniff`, `X-Frame-Options`, COOP/CORP, etc.), las mismas de `vite.config.ts`, definidas en `frontend/security-headers.conf`. Las respuestas de `/api/` traen las suyas desde helmet. `Strict-Transport-Security` no va en el contenedor (habla HTTP plano): agrégala en el proxy que termine el TLS.
- **Caché:** `index.html`, `sw.js` y `manifest.json` nunca se cachean (así una versión nueva del service worker se ve al instante); `/assets/` (con hash) un año; fuentes e íconos 30 días.

## Imágenes y volúmenes

| Servicio | Dockerfile | Detalles |
|---|---|---|
| backend | `backend/Dockerfile` | Multi-stage `node:22-alpine`: compila TypeScript en la etapa de build; la imagen final solo tiene `dist/` y dependencias de producción, corre como usuario no-root `appuser`, guarda los adjuntos en `/app/uploads` y tiene `HEALTHCHECK`. |
| frontend | `frontend/Dockerfile` | Multi-stage: `vite build` en `node:22-alpine` y luego solo los estáticos sobre `nginx:1.27-alpine`, con fallback de SPA, gzip, caché de assets y `HEALTHCHECK`. |
| db | `mariadb:11` | Imagen oficial, utf8mb4, con healthcheck `healthcheck.sh`. |

| Volumen | Contenido |
|---|---|
| `db_data` | Datos de MariaDB |
| `uploads_data` | Documentos que suben los vecinos (datos personales: respáldalo como la base) |

## Variables (`.env.docker`)

| Variable | Default | Descripción |
|---|---|---|
| `DB_ROOT_PASSWORD` | `devpass` | Contraseña root de MariaDB |
| `DB_NAME` | `muni_stodomingo` | Base de datos (debe coincidir con la de `schema.sql`) |
| `DB_USER` / `DB_PASSWORD` | `muniapp` / `munipass` | Usuario de la app (no root) |
| `DB_EXTERNAL_PORT` | `3307` | Puerto de MariaDB en el host |
| `JWT_SECRET` | ejemplo largo | Secreto JWT (≥ 32 caracteres, sin la palabra "cambiar"; si no, el backend no arranca) |
| `JWT_EXPIRES_IN` | `24h` | Duración del token |
| `RESEND_API_KEY` | vacío | API key de Resend; vacío = los correos solo se registran en los logs |
| `EMAIL_FROM` | `MuniStoDomingo <onboarding@resend.dev>` | Remitente de los correos |
| `EMAIL_REDIRECT_TO` | vacío | Desvía **todos** los correos a esta casilla (demos con el remitente de prueba) |
| `MOSTRAR_TOKEN_RECUPERACION` | `0` | `1` = el dry run imprime el enlace completo de recuperación de contraseña. Solo demos |
| `AUTH_RATE_LIMIT_MAX` | `10` | Intentos de autenticación por IP cada 15 min |
| `GENERAL_RATE_LIMIT_MAX` | `100` | Peticiones por IP y minuto (súbelo si corres el suite E2E) |
| `UPLOAD_RATE_LIMIT_MAX` | `20` | Archivos subidos por IP cada 10 min |
| `CUOTA_DOCUMENTOS_MB` | `50` | Espacio total de adjuntos por vecino |
| `MAX_SOLICITUDES_ABIERTAS` | `20` | Solicitudes abiertas por vecino |
| `BACKEND_PORT` | `3000` | Puerto de la API en el host |
| `FRONTEND_PORT` | `8080` | Puerto de la app en el host |

Los valores de `.env.docker` son de ejemplo, para desarrollo y evaluación. En un despliegue real hay que cambiar las contraseñas y el `JWT_SECRET`.

## Claves (Resend) sin subirlas a git

`.env.docker` se commitea, así que **no pongas ahí claves reales**. Para enviar correos de verdad (2FA, recuperación de contraseña y avisos de estado), crea `.env.docker.local` (ya está en `.gitignore`) con solo lo que cambia:

```bash
# .env.docker.local
RESEND_API_KEY=re_tu_clave_real
EMAIL_REDIRECT_TO=tu_correo_de_la_cuenta_resend@ejemplo.cl   # solo con onboarding@resend.dev
```

y levanta con los dos archivos (el segundo pisa al primero):

```bash
docker compose --env-file .env.docker --env-file .env.docker.local up -d --wait
```

`iniciar.bat` / `iniciar.sh` agregan ese segundo archivo solos cuando existe.

Sin clave de Resend la app funciona igual: el backend registra cada correo en los logs (`docker compose logs -f backend`) y ahí se lee el código de 6 dígitos de la verificación en dos pasos.

## Solo la base de datos (en lugar de XAMPP)

Para desarrollar con `npm run dev` en `backend/` y `frontend/` sin instalar MySQL ni XAMPP, levanta solo MariaDB. La base se crea y se llena con la semilla sola:

```bash
docker compose --env-file .env.docker up -d db
```

Luego, en `backend/.env`, apunta el backend a ese contenedor:

```
DB_HOST=127.0.0.1
DB_PORT=3307
DB_USER=muniapp
DB_PASSWORD=munipass
DB_NAME=muni_stodomingo
```

Para reiniciar esa base a la semilla: `docker compose down -v` y vuelve a levantar `db`.

Los pasos detallados para crear y verificar la base, pensados para que los siga un agente de IA, están en [`Crear BD.md`](Crear%20BD.md).

## Migrar una base que ya existía

`schema.sql` solo se ejecuta con el volumen vacío. Si ya tenías un volumen de una versión anterior y no quieres perder sus datos, aplica las migraciones de `backend/migrations/` en orden (son idempotentes; se pueden repetir sin error):

```bash
docker cp backend/migrations muni-db:/tmp/migrations
docker exec muni-db sh -c 'for f in /tmp/migrations/*.sql; do mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" --default-character-set=utf8mb4 < "$f" || exit 1; done'
```

Funciona igual en PowerShell, Git Bash y Linux/macOS.

Si no te importan los datos, es más simple `docker compose down -v` y volver a levantar.

## Problemas comunes

- **Puerto ocupado** (`3000`, `3307` u `8080`): cambia `BACKEND_PORT`, `DB_EXTERNAL_PORT` o `FRONTEND_PORT` en `.env.docker`.
- **Cambié `schema.sql` y no se aplica**: el script solo corre con el volumen vacío. Usa `docker compose down -v` (borra también los adjuntos).
- **El backend se reinicia en bucle**: revisa `docker compose logs backend`. Lo más común es un `JWT_SECRET` inválido o una BD inaccesible.
- **La subida de un archivo responde 413**: el archivo supera los 5 MB que acepta la API (o los 6 MB de Nginx).
- **"Demasiados intentos"** al probar: el límite de autenticación es de 10 por IP cada 15 minutos; sube `AUTH_RATE_LIMIT_MAX` en `.env.docker` si estás haciendo pruebas intensivas.
- **No llegan los correos**: sin `RESEND_API_KEY` solo se registran en los logs. Con el remitente `onboarding@resend.dev`, Resend únicamente entrega al correo del dueño de la cuenta: usa `EMAIL_REDIRECT_TO` o verifica un dominio propio.

## Actualizar el código (`sync.sh`)

`backend/` y `frontend/` son copias de las ramas `backend` y `frontend`. Para traer los últimos cambios sin perder los archivos de Docker (`Dockerfile`, `.dockerignore`, `nginx.conf`, `security-headers.conf`):

```bash
./sync.sh                     # usa origin/backend y origin/frontend
docker compose --env-file .env.docker up -d --build
```

Si el esquema cambió (hay migraciones nuevas), mira la sección "Migrar una base que ya existía".
