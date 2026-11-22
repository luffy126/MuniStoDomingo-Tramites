# Crear la base de datos con Docker (instrucciones para un agente de IA)

Objetivo: dejar funcionando la base de datos de MuniStoDomingo-Tramites en este equipo **usando
Docker**. En este directorio no hay XAMPP ni MySQL instalado en el equipo: la base es el
contenedor `db` (MariaDB 11) de `docker-compose.yml`, que se crea y se llena sola con
`backend/schema.sql` en su primer arranque. Todo se ejecuta desde la **raíz de este repositorio**
(donde está `docker-compose.yml`), no desde `backend/`.

## Requisitos previos

- Docker con Compose v2 (`docker --version` y `docker compose version` deben responder).
- El daemon de Docker encendido. En Windows, abrir **Docker Desktop** y esperar a que diga que el
  motor está corriendo. Si `docker info` falla con "cannot connect" o "pipe ... not found", está
  apagado: pídele al usuario que lo abra y repite.
- No hace falta instalar Node, npm ni MariaDB para crear la base.

## Pasos

1. Levanta solo la base de datos:
   ```powershell
   docker compose --env-file .env.docker up -d db
   ```
   La primera vez descarga la imagen `mariadb:11` y ejecuta `backend/schema.sql` automáticamente.
2. Espera a que esté lista (`healthy`), normalmente 15 a 40 segundos:
   ```powershell
   docker compose --env-file .env.docker ps db
   ```
3. Verifica que se creó todo:
   ```powershell
   docker exec muni-db mariadb -uroot -pdevpass -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='muni_stodomingo'; SELECT COUNT(*) FROM muni_stodomingo.usuario; SELECT COUNT(*) FROM muni_stodomingo.tramite;"
   ```
   Debe responder `9`, `2` y `6` (9 tablas, 2 usuarios de prueba, 6 trámites). Si cambiaron
   `DB_ROOT_PASSWORD` o `DB_NAME` en `.env.docker`, usa esos valores en el comando.
4. Si el usuario también quiere la aplicación completa (API y frontend), no hace falta crear
   nada más: `docker compose --env-file .env.docker up -d --build` levanta los tres servicios y
   reutiliza esta base.

## Qué hay al terminar

| Dato | Valor (de `.env.docker`) |
|---|---|
| Base de datos | `muni_stodomingo` |
| Usuario de la app | `muniapp` / `munipass` |
| Usuario root | `root` / `devpass` |
| Acceso desde este equipo | `127.0.0.1:3307` (solo local; no se publica en la red) |
| Datos | Volumen `munistodomingo_db_data`: sobreviven a `docker compose down` |
| Cuentas de prueba | `vecino@test.com` y `funcionario@test.com`, contraseña `Test1234` |

El esquema (`schema.sql`) ya incluye todo lo de `backend/migrations/`; en una base nueva **no hay
que aplicar las migraciones aparte**. El script `backend/scripts/init-db.cjs` (`npm run db:init`,
dentro de `backend/`) no hace falta en este entorno, porque Docker ya inicializa la base.

## Si algo falla

| Síntoma | Qué significa | Qué hacer |
|---|---|---|
| `cannot connect to the docker API` / `pipe ... not found` | Docker Desktop apagado. | Pedir al usuario que lo abra y repetir el paso 1. |
| `port is already allocated` (3307) | Otro programa usa ese puerto. | Cambiar `DB_EXTERNAL_PORT` en `.env.docker` (por ejemplo `3308`) y repetir. |
| El contenedor queda `unhealthy` o se reinicia | La inicialización falló. | Revisar `docker compose --env-file .env.docker logs db`; no borrar nada todavía. |
| Las tablas existen pero con datos viejos o incompletos | El volumen es de una versión anterior: `schema.sql` solo corre con el volumen vacío. | **Detenerse y preguntar al usuario** (ver reglas): migrar o reiniciar. |
| `Access denied` al verificar | Las claves de `.env.docker` no son las del volumen existente. | Usar las claves con las que se creó el volumen o reiniciarlo con permiso del usuario. |

## Si la base ya existía (volumen con datos)

Esto no es "crear" la base: es actualizarla. Pregunta antes al usuario y elige una:

- **Conservar los datos:** aplicar las migraciones, que son idempotentes y se pueden repetir:
  ```powershell
  docker cp backend/migrations muni-db:/tmp/migrations
  docker exec muni-db sh -c 'for f in /tmp/migrations/*.sql; do mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" --default-character-set=utf8mb4 < "$f" || exit 1; done'
  ```
- **Empezar de cero** (se pierden la base **y los documentos adjuntos**, que viven en otro volumen):
  ```powershell
  docker compose --env-file .env.docker down -v
  docker compose --env-file .env.docker up -d db
  ```

## Reglas para el agente

- **Nunca uses `down -v` por iniciativa propia.** Borra la base y los adjuntos de los vecinos
  sin posibilidad de recuperarlos. Ejecútalo solo con la confirmación explícita del usuario en
  ese mismo turno. `docker compose down` (sin `-v`) sí es seguro: conserva los datos.
- No borres volúmenes ni contenedores de otros proyectos (`docker volume rm`, `docker system
  prune`): este repositorio solo usa los volúmenes `munistodomingo_db_data` y
  `munistodomingo_uploads_data`.
- No cambies las contraseñas de `.env.docker` ni publiques el puerto de la base en la red
  (queda en `127.0.0.1` a propósito).
- No pongas claves reales (Resend, etc.) en `.env.docker`: ese archivo se commitea. Van en
  `.env.docker.local`, que git ignora (ver `DOCKER.md`).
- No hagas `git commit` ni `git push` salvo que el usuario lo pida en ese mismo turno.
- Esto crea la estructura y los datos semilla, **no** los datos que otra persona haya creado en
  su base. Para llevar datos reales hace falta un volcado (`mysqldump`).

## Cómo informar al usuario

Responde en español, breve: qué comando ejecutaste, el resultado de la verificación (tablas,
usuarios y trámites), si el contenedor quedó `healthy`, y qué falta (por ejemplo, levantar
también la API y el frontend con `docker compose --env-file .env.docker up -d --build`).
