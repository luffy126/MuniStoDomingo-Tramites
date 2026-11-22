# Crear la base de datos (instrucciones para un agente de IA)

Objetivo: dejar funcionando la base de datos de MuniStoDomingo-Tramites en este equipo, usando
el script `scripts/init-db.cjs`. Todo se ejecuta desde la carpeta `back/`.

## Requisitos previos

- Node.js 20 o superior y npm.
- Un servidor MySQL 8 o MariaDB 10+ encendido (puerto 3306 por defecto). En Windows suele ser
  XAMPP: el usuario `root` viene sin contraseña.

## Pasos

1. Entra a `back/` e instala dependencias si falta `node_modules/`:
   ```powershell
   npm install
   ```
2. Ejecuta el script:
   ```powershell
   npm run db:init
   ```
3. Interpreta el resultado:

   | Salida | Qué significa | Qué hacer |
   |---|---|---|
   | `✓ Base lista.` | Todo cargó: 9 tablas, 2 usuarios, 6 trámites, 15 requisitos, 5 solicitudes. | Terminar. Informar al usuario. |
   | `No se pudo conectar... no está encendido` (`ECONNREFUSED`) | El servidor MySQL/MariaDB está apagado. | Pedir al usuario que lo encienda (XAMPP → Start en MySQL) y repetir el paso 2. |
   | `Usuario o contraseña incorrectos` | `DB_USER` o `DB_PASSWORD` del `.env` no sirven. | Pedir la contraseña al usuario, que la escriba en `back/.env` (`DB_PASSWORD=`), y repetir. |
   | `La base "..." ya tiene N tablas y este script las borraría` | La base ya existe con datos. | **Detenerse y preguntar al usuario** (ver reglas). |

4. Verifica que el backend arranca con esa base (opcional pero recomendado):
   ```powershell
   npm run dev
   ```
   Debe iniciar sin errores de conexión. Detén el proceso al terminar.

## Qué hace el script

- Si no existe `back/.env`, lo crea desde `.env.example` con un `JWT_SECRET` aleatorio y
  `DB_PASSWORD` vacío. Si ya existe, lo respeta.
- Crea la base `DB_NAME` (por defecto `muni_stodomingo`) y ejecuta `schema.sql`, que ya incluye
  todas las migraciones de `migrations/`. **No hay que aplicar las migraciones aparte** en una
  base nueva.
- Crea la carpeta `uploads/` para los adjuntos.

Cuentas de prueba que deja cargadas (contraseña `Test1234`): `vecino@test.com` y
`funcionario@test.com`.

## Reglas para el agente

- **Nunca uses `--force` por iniciativa propia.** `npm run db:init -- --force` borra y recrea las
  tablas, con pérdida de todos los datos. Si el script dice que la base ya existe, pregunta al
  usuario si quiere reiniciarla; ejecuta `--force` solo con su confirmación explícita en ese turno.
  Si lo único que falta es estructura nueva, aplica las migraciones de `migrations/` en orden
  (son idempotentes), en lugar de recrear.
- No uses otra base distinta de la que indica `DB_NAME` del `.env`, y no apuntes el script a una
  base de producción.
- No muestres en tu respuesta el contenido de `.env` (contiene `JWT_SECRET` y claves). No lo
  subas al repositorio: está en `.gitignore`.
- No hagas `git commit` ni `git push` salvo que el usuario lo pida en ese mismo turno.
- Este script carga estructura y datos semilla, **no** los datos que otra persona haya creado en
  su base. Si el usuario quiere llevar datos reales, necesita un volcado (`mysqldump`).

## Cómo informar al usuario

Responde en español, breve: qué comando ejecutaste, el resumen que imprimió el script
(tablas y filas), si el backend arrancó, y qué falta (por ejemplo, la clave de Resend en
`.env`: sin ella los correos del 2FA solo se registran en la consola del servidor).
