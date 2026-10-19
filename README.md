# MuniStoDomingo-Tramites - Backend

Rama con la lógica de servidor del proyecto: API REST, acceso a la base de datos y
procesamiento de la información.

La documentación general del proyecto está en la rama `main`. El código de la interfaz
está en la rama `frontend`.

| Documento | Para quién | Contenido |
| --- | --- | --- |
| Este README | Todos | Cómo levantar el backend, estructura y convenciones |
| [docs/API.md](docs/API.md) | Frontend, backend, evaluación | Referencia de cada endpoint con ejemplos de petición y respuesta |
| [docs/GUIA_EQUIPO.md](docs/GUIA_EQUIPO.md) | Cada integrante | Qué está listo, qué falta, qué le toca a cada rol y cómo integrarlo |

## Stack

Node.js 18+, TypeScript, Express 5 y MySQL 8 / MariaDB 10+ (driver `mysql2`).

## Puesta en marcha

### 1. Base de datos

Se necesita un servidor MySQL o MariaDB corriendo en el puerto 3306. La forma más simple en
Windows es [XAMPP](https://www.apachefriends.org): instalarlo y presionar *Start* en
**MySQL** desde el panel de control. El usuario `root` de XAMPP viene sin contraseña.

Cargar el esquema con sus datos de prueba (crea la base `muni_stodomingo` por sí solo):

```bash
mysql -u root -p --default-character-set=utf8mb4 < schema.sql
```

Con XAMPP el cliente está en `C:\xampp\mysql\bin\mysql.exe` y se omite `-p` si `root` no
tiene contraseña. También se puede importar `schema.sql` desde phpMyAdmin
(http://localhost/phpmyadmin → *Importar*).

`schema.sql` crea las cinco tablas y carga datos semilla, de modo que el sistema queda
utilizable apenas se levanta. **No se puede ejecutar dos veces**: para volver a la semilla
primero hay que borrar la base.

```bash
mysql -u root -p -e "DROP DATABASE muni_stodomingo"
mysql -u root -p --default-character-set=utf8mb4 < schema.sql
```

### 2. Backend

```bash
npm install
cp .env.example .env     # completar DB_PASSWORD y JWT_SECRET
npm run dev
```

Si todo está bien la consola muestra `✅ Servidor corriendo en http://localhost:3000`, y
http://localhost:3000/api/health responde `{ "success": true, "data": { "status": "ok", ... } }`.

Para generar un `JWT_SECRET` seguro:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Scripts

| Script | Qué hace |
| --- | --- |
| `npm run dev` | Levanta el servidor con `ts-node` y lo reinicia con `nodemon` al guardar cambios en `src/` |
| `npm run typecheck` | Revisa los tipos sin generar archivos. Debe pasar antes de abrir un PR |
| `npm run build` | Compila TypeScript a `dist/` |
| `npm start` | Ejecuta la versión compilada (`dist/server.js`) |

### Variables de entorno

| Variable | Para qué | Valor de desarrollo |
| --- | --- | --- |
| `DB_HOST`, `DB_PORT` | Servidor de base de datos | `localhost`, `3306` |
| `DB_USER`, `DB_PASSWORD` | Credenciales | `root` y vacío con XAMPP |
| `DB_NAME` | Base de datos | `muni_stodomingo` |
| `JWT_SECRET` | Firma de los tokens de sesión | String aleatorio de 32+ caracteres |
| `JWT_EXPIRES_IN` | Vigencia de los tokens | `24h` |
| `PORT` | Puerto del servidor | `3000` |
| `NODE_ENV` | En `development` los errores 500 muestran el detalle | `development` |
| `FRONTEND_URL` | Origen permitido por CORS | `http://localhost:5173` si el front corre con Vite (`npm run dev`), `http://localhost:8100` con `ionic serve` |

El archivo `.env` nunca se sube al repositorio; `.env.example` documenta las claves.

## Arquitectura

Cada petición atraviesa cuatro capas. Cada una tiene un solo trabajo y un dueño:

```
Petición HTTP
   │
   ▼
routes/        Qué URL y método va a qué controlador, y qué middlewares la protegen
   │
middleware/    authMiddleware (¿quién es?) y roleMiddleware (¿puede hacerlo?)
   │
controllers/   Valida la entrada, llama a los servicios y decide el código HTTP
   │
services/      Consultas SQL y traducción de filas al formato del frontend
   │
   ▼
MySQL / MariaDB
```

Los errores no esperados de cualquier capa llegan a `middleware/errorHandler.ts`, que
responde 500 con el formato estándar.

### Estructura

```
src/
├── server.ts                      Punto de entrada: levanta el servidor en PORT
├── app.ts                         Express: CORS, JSON, rutas, 404 y manejo de errores
├── config/database.ts             Pool de conexiones a MySQL                      (Simón)
├── types/index.ts                 Tipos compartidos, req.user y formateo de fechas
├── routes/
│   ├── authRoutes.ts              STUB: /api/auth                                 (Francisco)
│   ├── tramiteRoutes.ts           /api/tramites                                   (Tomás)
│   ├── solicitudRoutes.ts         /api/solicitudes y /api/solicitudes/reportes   (Tomás)
│   └── notificacionRoutes.ts      /api/notificaciones                             (Tomás)
├── controllers/
│   ├── authController.ts          STUB                                            (Francisco)
│   ├── tramiteController.ts                                                       (Tomás)
│   ├── solicitudController.ts                                                     (Tomás)
│   └── notificacionController.ts                                                  (Tomás)
├── middleware/
│   ├── authMiddleware.ts          STUB: siempre autentica como vecino id 1        (Francisco)
│   ├── roleMiddleware.ts          STUB funcional: compara req.user.rol            (Francisco)
│   └── errorHandler.ts            Manejo global de errores                        (Tomás)
└── services/                      Acceso a datos                                  (Simón)
    ├── userService.ts
    ├── tramiteService.ts
    ├── solicitudService.ts
    └── notificacionService.ts
```

Los archivos marcados **STUB** existen para que el proyecto compile y se pueda probar
mientras su dueño los implementa. Se reemplazan completos sin tocar ningún otro archivo:
ver [docs/GUIA_EQUIPO.md](docs/GUIA_EQUIPO.md).

### Reglas de cada capa

- **Servicios**: devuelven objetos planos y no conocen HTTP; no validan entradas ni deciden
  códigos de estado. Cuando algo no existe devuelven `null`, y dejan que el error de base de
  datos suba para que lo maneje el middleware de errores. Todas las consultas son
  parametrizadas con `?`, nunca por concatenación de texto.
- **Controladores**: validan lo que llega del cliente, llaman a los servicios y responden.
  Todo error inesperado se pasa a `next(err)`. No escriben SQL.
- **Rutas**: solo declaran URL, método, middlewares y controlador. Las rutas fijas (como
  `/reportes`) van antes de las que tienen parámetros (`/:id`).

## Formato de respuesta

Todas las respuestas usan el mismo sobre:

```json
{ "success": true,  "data": { } }
{ "success": false, "error": "Mensaje descriptivo" }
```

| Código | Cuándo |
| --- | --- |
| `200` | Consulta o actualización exitosa |
| `201` | Recurso creado |
| `400` | Datos de entrada inválidos o faltantes, o JSON mal formado |
| `401` | No autenticado |
| `403` | Autenticado pero con un rol que no tiene permiso |
| `404` | Recurso o ruta inexistente |
| `500` | Error interno (en desarrollo incluye el detalle, en producción no) |

La lista completa de endpoints, con ejemplos, está en [docs/API.md](docs/API.md).

## Base de datos

| Tabla | Para qué |
| --- | --- |
| `usuario` | Vecinos y funcionarios municipales, con su rol |
| `tramite` | Catálogo de trámites disponibles |
| `requisito` | Requisitos de cada trámite |
| `solicitud` | Trámites iniciados por un vecino y su estado |
| `notificacion` | Avisos enviados al vecino |

### Datos semilla

| Tabla | Contenido |
| --- | --- |
| `usuario` | 2 cuentas de prueba (abajo) |
| `tramite` / `requisito` | 6 trámites con 15 requisitos en total |
| `solicitud` | 5 solicitudes del vecino demo, `SOL-1001` a `SOL-1005`, una o más en cada estado |
| `notificacion` | 3 notificaciones del vecino demo, una ya leída |

### Cuentas de prueba

Ambas con la contraseña `Test1234`, almacenada como hash bcrypt:

| Id | Correo | Rol |
| --- | --- | --- |
| 1 | `vecino@test.com` | vecino |
| 2 | `funcionario@test.com` | funcionario |

## Convenciones hacia el frontend

| Base de datos | API | Nota |
| --- | --- | --- |
| `solicitud.folio` | `id` | El frontend identifica las solicitudes por folio (`SOL-1001`), no por el id numérico. Las URLs `/api/solicitudes/:id` reciben el folio |
| `tramite_id` | `tramiteId` | snake_case a camelCase |
| `usuario.nombre` (JOIN) | `vecinoNombre` | Viene del JOIN con la tabla usuario |
| `creada_en` | `fecha` | Formateada como `YYYY-MM-DD` |
| `notificacion.id` | `id` | Se entrega como string (`"1"`) |
| `observaciones` | `observaciones` | Se omite del JSON cuando está vacía |
| `password_hash` | - | Nunca se expone en una respuesta |

## Cómo contribuir

1. Cada integrante trabaja en su rama personal (`branch-tomas`, `branch-xopan`, …) creada
   **a partir de `backend`**.
2. Antes de subir: `npm run typecheck` sin errores y `npm run dev` arrancando.
3. Se sube la rama personal y se abre un Pull Request hacia `backend`.
4. Nunca se suben `.env`, `node_modules/` ni `dist/` (ya están en `.gitignore`).
