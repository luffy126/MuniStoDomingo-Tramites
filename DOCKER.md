# Despliegue con Docker

La aplicación completa (MariaDB + API Express + frontend Ionic/React servido por Nginx) se levanta con un solo comando. En la máquina solo se necesita **Docker con Compose v2** (`docker compose`). No hace falta instalar Node, npm ni MariaDB.

## Levantar

```bash
docker compose --env-file .env.docker up --build
```

La primera vez tarda unos minutos (descarga imágenes y compila). Cuando los tres contenedores aparezcan como `healthy`:

| Qué | URL |
|---|---|
| Aplicación | http://localhost:8080 |
| API (vía Nginx) | http://localhost:8080/api/health |
| API (directo) | http://localhost:3000/api/health |
| MariaDB (desde el host) | `localhost:3307`, usuario `muniapp` / `munipass` |

**Usuarios de prueba** (contraseña `Test1234`): `vecino@test.com` y `funcionario@test.com`.

## Detener y reiniciar

```bash
docker compose down        # detiene; los datos se conservan en el volumen db_data
docker compose --env-file .env.docker up -d   # vuelve a levantar con los mismos datos
docker compose down -v     # detiene y BORRA la BD; el próximo arranque vuelve a la semilla
```

Ver logs: `docker compose logs -f backend` (o `db`, `frontend`).

## Arquitectura

```
navegador ──► :8080  frontend (Nginx)
                     ├─ /        → SPA (index.html, assets con caché)
                     └─ /api/... → proxy ──► backend:3000 (Express)
                                                └─► db:3306 (MariaDB, volumen db_data)
```

- Los tres servicios comparten la red interna `muni-net` y se ven por nombre de servicio (`db`, `backend`); por eso el backend usa `DB_HOST=db` y no `localhost`.
- El frontend se compila con `VITE_API_URL=/`: el navegador llama a `/api/...` en el mismo origen y Nginx lo reenvía al backend, así que no hay problemas de CORS.
- Orden de arranque con healthchecks: `db` (healthy) → `backend` (healthy en `/api/health`) → `frontend`.
- `backend/schema.sql` se monta en `/docker-entrypoint-initdb.d/`: MariaDB lo ejecuta **solo cuando el volumen está vacío** (primer arranque o tras `down -v`).
- El backend tiene `TRUST_PROXY=1` para que el rate limit use la IP real del cliente (la que reporta Nginx) y no la de Nginx.

## Imágenes

| Servicio | Dockerfile | Detalles |
|---|---|---|
| backend | `backend/Dockerfile` | Multi-stage `node:22-alpine`: compila TypeScript en la etapa de build; la imagen final solo tiene `dist/` y dependencias de producción, corre como usuario no-root `appuser` y tiene `HEALTHCHECK`. |
| frontend | `frontend/Dockerfile` | Multi-stage: `vite build` en `node:22-alpine` y luego solo los estáticos sobre `nginx:1.27-alpine` (~79 MB), con fallback de SPA, gzip, caché de assets y `HEALTHCHECK`. |
| db | `mariadb:11` | Imagen oficial, con healthcheck `healthcheck.sh`. |

## Variables (`.env.docker`)

| Variable | Default | Descripción |
|---|---|---|
| `DB_ROOT_PASSWORD` | `devpass` | Contraseña root de MariaDB |
| `DB_NAME` | `muni_stodomingo` | Base de datos (debe coincidir con la de `schema.sql`) |
| `DB_USER` / `DB_PASSWORD` | `muniapp` / `munipass` | Usuario de la app (no root) |
| `DB_EXTERNAL_PORT` | `3307` | Puerto de MariaDB en el host |
| `JWT_SECRET` | ejemplo largo | Secreto JWT (≥ 32 caracteres, sin "cambiar") |
| `JWT_EXPIRES_IN` | `24h` | Duración del token |
| `RESEND_API_KEY` | vacío | API key de Resend; vacío = los emails solo se registran en los logs |
| `EMAIL_FROM` | `MuniStoDomingo <onboarding@resend.dev>` | Remitente de los emails |
| `BACKEND_PORT` | `3000` | Puerto de la API en el host |
| `FRONTEND_PORT` | `8080` | Puerto de la app en el host |

Los valores de `.env.docker` son de ejemplo, para desarrollo y evaluación. En un despliegue real hay que cambiar las contraseñas y el `JWT_SECRET`.

## Problemas comunes

- **Puerto ocupado** (`3000`, `3307` u `8080`): cambia `BACKEND_PORT`, `DB_EXTERNAL_PORT` o `FRONTEND_PORT` en `.env.docker`.
- **Cambié `schema.sql` y no se aplica**: el script solo corre con el volumen vacío. Usa `docker compose down -v`.
- **El backend se reinicia en bucle**: revisa `docker compose logs backend`. Lo más común es un `JWT_SECRET` inválido o una BD inaccesible.

## Actualizar el código (`sync.sh`)

`backend/` y `frontend/` son copias de las ramas `backend` y `frontend`. Para traer los últimos cambios sin perder los archivos de Docker:

```bash
./sync.sh                     # usa origin/backend y origin/frontend
docker compose --env-file .env.docker up -d --build
```
