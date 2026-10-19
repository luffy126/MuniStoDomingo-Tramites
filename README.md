# MuniStoDomingo-Tramites - Backend

Rama con la lógica de servidor del proyecto: API REST, acceso a la base de datos y
procesamiento de la información.

La documentación general del proyecto está en la rama `main`. El código de la interfaz
está en la rama `frontend`.

## Stack

Node.js 18+, TypeScript, Express y MySQL 8 / MariaDB 10+ (driver `mysql2`).

## Puesta en marcha

```bash
npm install
cp .env.example .env     # completar con las credenciales locales
```

Configurar `JWT_SECRET` con un secreto propio de al menos 32 caracteres. Para generar
uno localmente: `node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"`.
La aplicación rechaza secretos vacíos, cortos o con el texto placeholder `cambiar`.
`JWT_EXPIRES_IN` acepta una duración como `24h` o segundos enteros y debe ser positiva.

Crear la base de datos y cargar el esquema con sus datos de prueba:

```bash
mysql -u root -p -e "CREATE DATABASE muni_stodomingo"
mysql -u root -p muni_stodomingo < schema.sql
```

`schema.sql` crea las cinco tablas y carga datos semilla, de modo que el sistema queda
utilizable apenas se levanta.

```bash
npm run dev          # desarrollo con recarga
npm run typecheck    # comprobar TypeScript
npm test             # compilar y ejecutar pruebas de autenticación
npm run build
npm start            # ejecutar la versión compilada
```

## Autenticación y roles (EP 2.4 y EP 2.5)

| Método y ruta | Entrada / requisito | Respuesta |
| --- | --- | --- |
| `POST /api/auth/register` | `nombre`, `email`, `password`, `rol` opcional | 201, `data: { user, token }` |
| `POST /api/auth/login` | `email`, `password` | 200, `data: { user, token }` |
| `GET /api/auth/me` | Header `Authorization: Bearer <token>` | 200, `data: { id, nombre, email, rol }` |

Las respuestas incluyen `success`. Los errores incluyen `error`; los errores de
validación usan 400 y agregan `details: [{ campo, mensaje }]` sin devolver los valores
de las contraseñas. Un email duplicado devuelve 409. El login devuelve el mismo 401
`Credenciales inválidas` para usuario inexistente y contraseña incorrecta.

El registro exige nombre de 2 a 120 caracteres, email válido y contraseña de al menos
8 caracteres con mayúscula, minúscula y número. Se rechazan contraseñas de más de
72 bytes para evitar truncamiento por bcrypt. El login solo exige una contraseña
de texto no vacía. Los emails se recortan y se convierten a minúsculas.

Según el contrato de la EP, el registro admite `vecino` y `funcionario`, y usa
`vecino` por defecto. Esto permite crear funcionarios desde el registro público;
para un despliegue municipal real esa asignación debe requerir autorización.

Las contraseñas se guardan con bcrypt y 10 rondas. Los JWT usan HS256 e incluyen
`id`, `email`, `rol`, `iat` y `exp`. `authMiddleware` valida firma, expiración y
campos antes de asignar `req.user = { id, email, rol }`.
`roleMiddleware('funcionario')` se usa después de `authMiddleware` y devuelve
403 cuando el rol es insuficiente. Los hashes nunca forman parte de la respuesta.

Las pruebas ejecutan peticiones HTTP reales con bcrypt y JWT reales, sustituyendo
solo `userService` por persistencia en memoria dentro del proceso de pruebas.
Cubren registro, duplicados, validación, login, perfil, tokens, roles y errores.
La conexión y las consultas MySQL requieren comprobarse con una base de datos local.

### Variables de entorno

| Variable | Para qué |
| --- | --- |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Conexión a la base de datos |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | Firma y vigencia de los tokens de sesión |
| `PORT`, `NODE_ENV`, `FRONTEND_URL` | Servidor y origen permitido para CORS |

El archivo `.env` nunca se sube al repositorio; `.env.example` documenta las claves.

## Base de datos

| Tabla | Para qué |
| --- | --- |
| `usuario` | Vecinos y funcionarios municipales, con su rol |
| `tramite` | Catálogo de trámites disponibles |
| `requisito` | Requisitos de cada trámite |
| `solicitud` | Trámites iniciados por un vecino y su estado |
| `notificacion` | Avisos enviados al vecino |

### Cuentas de prueba

Ambas con la contraseña `Test1234`, almacenada como hash bcrypt:

| Correo | Rol |
| --- | --- |
| `vecino@test.com` | vecino |
| `funcionario@test.com` | funcionario |

## Estructura

```
src/
├── app.ts                 Express y montaje de /api/auth
├── server.ts              Inicio del servidor
├── config/jwt.ts          Configuración y validación del secreto JWT
├── config/database.ts      Pool de conexiones a MySQL
├── controllers/authController.ts
├── routes/authRoutes.ts
├── middleware/            Autenticación, roles y validación
├── types/express.d.ts      Contrato req.user
├── types/index.ts          Tipos compartidos y formateo de fechas
└── services/               Acceso a datos
    ├── userService.ts
    ├── tramiteService.ts
    ├── solicitudService.ts
    └── notificacionService.ts
```

Los servicios devuelven objetos planos y no conocen HTTP: no validan entradas ni deciden
códigos de estado. Cuando algo no existe devuelven `null`, y dejan que el error de base de
datos suba para que lo maneje el middleware de errores.

Todas las consultas son parametrizadas con `?`, nunca por concatenación de texto.

## Convenciones hacia el frontend

| Base de datos | API | Nota |
| --- | --- | --- |
| `solicitud.folio` | `id` | El frontend identifica las solicitudes por folio, no por el id numérico |
| `tramite_id` | `tramiteId` | snake_case a camelCase |
| `usuario.nombre` (JOIN) | `vecinoNombre` | Viene del JOIN con la tabla usuario |
| `creada_en` | `fecha` | Formateada como `YYYY-MM-DD` |
| `password_hash` | - | Nunca se expone en una respuesta |
