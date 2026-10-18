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

Crear la base de datos y cargar el esquema con sus datos de prueba:

```bash
mysql -u root -p -e "CREATE DATABASE muni_stodomingo"
mysql -u root -p muni_stodomingo < schema.sql
```

`schema.sql` crea las cinco tablas y carga datos semilla, de modo que el sistema queda
utilizable apenas se levanta.

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
├── config/database.ts      Pool de conexiones a MySQL
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
