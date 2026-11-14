# Checklist de avances: estado del backend y próximos pasos

Este documento dice **qué está listo, qué falta y qué le toca a cada uno**, con el detalle
necesario para que cada integrante pueda tomar su parte sin tener que leer el código de
los demás.

*Última actualización: 25 de octubre de 2026.*

## Contenido

- [Resumen](#resumen)
- [Quién hace qué](#quién-hace-qué)
- [Francisco · Autenticación](#francisco--autenticación)
- [Simón · Capa de datos](#simón--capa-de-datos)
- [Frontend · Conexión con la API](#frontend--conexión-con-la-api)
- [Tomás · Servidor y API de negocio](#tomás--servidor-y-api-de-negocio)
- [Problemas conocidos](#problemas-conocidos)
- [Decisiones tomadas](#decisiones-tomadas)
- [Flujo de trabajo con Git](#flujo-de-trabajo-con-git)

---

## Resumen

| Pieza | Estado |
| --- | --- |
| Servidor Express + TypeScript | ✅ Listo |
| Base de datos (esquema + semilla) | ✅ Lista |
| Capa de datos (servicios con SQL) | ✅ Lista |
| 11 endpoints de negocio (incluye health; trámites, solicitudes con cancelación, reportes, notificaciones) + 4 de auth | ✅ Listos y probados contra MariaDB |
| Autenticación: registro, login, perfil (GET y PUT), JWT y roles | ✅ Lista e integrada con la API de negocio |
| Notificaciones automáticas al cambiar el estado de una solicitud | ✅ Listas (en la misma transacción) |
| Frontend consumiendo la API | ✅ Integrado (PR #13) |

**El backend está completo de punta a punta y el frontend ya lo consume.** Qué falta para
las próximas entregas está en [Tomás · Próximos pasos posibles](#próximos-pasos-posibles).

---

## Quién hace qué

| Integrante | Responsabilidad | Archivos |
| --- | --- | --- |
| **Tomás** | Servidor, API REST de negocio (EP 2.1 y parte de EP 2.3) | `app.ts`, `server.ts`, `controllers/` (salvo auth), `routes/` (salvo auth), `middleware/errorHandler.ts` |
| **Simón** | Base de datos y consultas | `schema.sql`, `config/database.ts`, `services/` |
| **Francisco** | Autenticación y autorización | `config/jwt.ts`, `routes/authRoutes.ts`, `controllers/authController.ts`, `middleware/authMiddleware.ts`, `middleware/roleMiddleware.ts`, `middleware/validateRequest.ts`, `types/express.d.ts`, `tests/` |
| **Frontend** | Interfaz Ionic + React (rama `frontend`) | `src/services/` consume la API real; pestañas, perfil y cancelación conectados |

---

## Francisco · Autenticación

**Entregado** en la rama `backend-auth-jwt-francisco` e integrado con la API de negocio en
`backend-tomas`.

### Qué hace

| Archivo | Qué hace |
| --- | --- |
| `src/config/jwt.ts` | Lee `JWT_SECRET` y `JWT_EXPIRES_IN`. **El servidor no arranca** si el secreto es corto (< 32), vacío o contiene `cambiar`, o si la duración no es positiva |
| `src/controllers/authController.ts` | `register`, `login` y `getMe`. Hashea con bcrypt (10 rondas) y firma JWT HS256 con `{ id, email, rol }` |
| `src/middleware/authMiddleware.ts` | Verifica el token del header `Authorization: Bearer …` y deja `req.user = { id, email, rol }` |
| `src/middleware/roleMiddleware.ts` | `roleMiddleware('funcionario')`: 401 sin sesión, 403 con otro rol |
| `src/middleware/validateRequest.ts` | Reglas de `express-validator` para register y login, con errores en `details` |
| `src/routes/authRoutes.ts` | `POST /register`, `POST /login`, `GET /me` |
| `src/types/express.d.ts` | Tipo de `req.user` para todo el proyecto |
| `tests/auth.test.cjs` | Pruebas HTTP reales de registro, login, tokens, roles y errores (`npm test`) |

El contrato completo de los endpoints está en [API.md](API.md#autenticación).

### Cómo se usa desde otras rutas

Ambos middlewares se exportan **con nombre**:

```typescript
import { authMiddleware } from '../middleware/authMiddleware';
import { roleMiddleware } from '../middleware/roleMiddleware';

router.use(authMiddleware);
router.post('/', roleMiddleware('vecino'), crearSolicitud);
```

### Pendientes y puntos a revisar

- **Registro de funcionarios:** `POST /register` ignora `rol` y siempre crea un `vecino`.
  Las cuentas de funcionario se crean directo en la base de datos.
- **Pruebas de auth:** `tests/auth.test.cjs` reemplaza `userService` por memoria (no necesita
  MySQL). El login, el registro y `PUT /api/auth/me` contra la base real se prueban en
  `tests/api.test.cjs` (ver [Tomás · Verificado](#verificado)).
- **Perfil:** `PUT /api/auth/me` (RF-06) reemplaza nombre y email y reemite el token, porque
  el email viaja en sus claims.

---

## Simón · Capa de datos

Tu parte está entregada y funcionando: los controladores usan los servicios tal cual, sin
cambiarles ninguna firma. Quedan estos pendientes, en orden de importancia:

### 1. Verificar el dueño de solicitudes y notificaciones ✅

Resuelto: `solicitudService.getOwnerId(folio)` permite que `obtenerSolicitud` responda `404`
a un vecino que pide una solicitud ajena, y `notificacionService.markAsRead(id, usuarioId)`
filtra por dueño dentro del `UPDATE`.

### 2. Folio duplicado en creaciones simultáneas ✅

Resuelto: `solicitudService.create` inserta con un folio temporal y lo reemplaza por
`SOL-(1000 + insertId)` dentro de una transacción, así que ya no hay `MAX(id)+1`.

### 3. `seed.sql` separado ✅

Resuelto sin separar el archivo: `schema.sql` ahora empieza con `DROP TABLE IF EXISTS` y se
puede ejecutar varias veces, así que recarga la semilla sin borrar la base. Separar
estructura y datos complicaría la preparación de la base de pruebas.

### 4. Notificaciones automáticas ✅

Resuelto: `solicitudService.updateEstado` valida la transición, cambia el estado y crea la
notificación para el vecino dueño **en una sola transacción** (con `SELECT … FOR UPDATE`).
El vecino y el id numérico se leen dentro del servicio y nunca salen por la API.

---

## Frontend · Conexión con la API

### Estado actual

**Integrado (PR #13).** La rama `frontend` consume la API real: `src/services/apiClient.ts`
agrega el token Bearer y traduce los errores, `src/services/tramiteService.ts` y
`src/services/authService.ts` llaman a los endpoints, y la sesión se restaura con
`GET /api/auth/me`. La documentación del lado del frontend está en el README de su rama
(sección "Integración con la API").

### Correspondencia entre funciones del frontend y endpoints

| Función (frontend) | Endpoint | Notas |
| --- | --- | --- |
| `getTramites()` | `GET /api/tramites` | Pasa a ser `async` |
| `getTramiteById(id)` | `GET /api/tramites/:id` | `async`; `null` si responde 404 |
| `buscarTramites(termino)` | — | Puede seguir filtrando en el cliente sobre `getTramites()` |
| `getSolicitudes()` | `GET /api/solicitudes` | Con token de vecino devuelve solo las suyas; con token de funcionario, todas (acepta `?estado=`) |
| `getSolicitudById(id)` | `GET /api/solicitudes/:folio` | El `id` ya es el folio, como hoy |
| `crearSolicitud(datos)` | `POST /api/solicitudes` | Body: `{ tramiteId, observaciones? }`; el vecino sale del token |
| `cancelarSolicitud(folio)` | `DELETE /api/solicitudes/:folio` | Solo el vecino dueño y solo si está pendiente; responde 204 |
| `actualizarEstadoSolicitud(...)` | `PATCH /api/solicitudes/:folio` | Body: `{ estado, observaciones? }`; 409 si la transición no es válida |
| `getNotificaciones()` | `GET /api/notificaciones` | |
| `marcarNotificacionLeida(id)` | `PATCH /api/notificaciones/:id` | Devuelve la notificación actualizada |
| `getResumenPorEstado()` | `GET /api/solicitudes/reportes` | Mismo formato `Record<EstadoSolicitud, number>` |
| `loginRequest(email, password)` | `POST /api/auth/login` | Responde `{ user, token }`. Guardar el **token**, no solo el usuario. 401 `Credenciales inválidas` |
| `registerRequest(datos)` | `POST /api/auth/register` | Responde `{ user, token }`, ya con sesión iniciada. 400 con `details` por campo, 409 si el email existe |
| `recuperarSesion()` | `GET /api/auth/me` | Con el token guardado, confirma que la sesión sigue válida al recargar la app |
| `actualizarPerfilRequest(datos)` | `PUT /api/auth/me` | Body: `{ nombre, email }`; responde `{ user, token }` y el frontend reemplaza el token guardado |

### Diferencias de detalle

- `User.id` en el frontend es string; la API lo entrega como **número** (`1`) y el frontend
  lo convierte al guardar la sesión.
- Las reglas de contraseña del backend (8+ caracteres, mayúscula, minúscula y número) se
  replican en `src/utils/validators.ts` del frontend.
- Si una petición responde 401 (`Token expirado` o `Token inválido`), el frontend limpia la
  sesión y envía al login.
- `Notificacion.id` sí viene como string, igual que en el frontend.
- `observaciones` se omite del JSON cuando está vacía, compatible con el `?` opcional
  del tipo.
- La API no envía `activo` en los trámites: solo devuelve los activos.

### Configuración

1. URL base en una variable de entorno de Vite, p. ej. `VITE_API_URL=http://localhost:3000`
   (el origen del servidor, **sin** `/api`) en un `.env` del frontend, leída con
   `import.meta.env.VITE_API_URL`. Si no se define, el frontend usa `http://localhost:3000`.
2. Enviar en cada petición protegida el header `Authorization: Bearer <token>`.
3. **CORS:** el backend solo acepta el origen definido en `FRONTEND_URL`. El frontend
   corre con Vite en `http://localhost:5173`, así que en el `.env` del backend debe ir
   `FRONTEND_URL=http://localhost:5173` (el valor por defecto, `8100`, corresponde a
   `ionic serve`).
4. Siempre revisar `success` antes de usar `data`, y mostrar `error` al usuario cuando
   venga `false`.

Ejemplo de cliente mínimo:

```typescript
const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';

async function api<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('munisd.token');
  const res = await fetch(`${API}/api${ruta}`, {
    ...opciones,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opciones.headers,
    },
  });
  const cuerpo = await res.json();
  if (!cuerpo.success) throw new Error(cuerpo.error);
  return cuerpo.data as T;
}

// uso
const tramites = await api<Tramite[]>('/tramites');
```

### Correr front y back al mismo tiempo

No hace falta mezclar ramas: las dos usan la raíz del repositorio y chocarían
(`package.json`, `README.md`, `src/services/tramiteService.ts`, …). Se puede tener cada
rama en su propia carpeta con `git worktree`:

```bash
# desde la carpeta del backend
git worktree add ../MuniStoDomingo-Frontend frontend
```

Luego `npm install` y `npm run dev` en cada carpeta: backend en `:3000` y frontend en
`:5173`.

Referencia completa de los endpoints: [API.md](API.md).

---

## Tomás · Servidor y API de negocio

### Entregado

- Proyecto Express 5 + TypeScript con scripts `dev`, `build`, `start` y `typecheck`.
- `app.ts`: CORS, parseo de JSON (límite 16kb), `/api/health`, montaje de rutas, 404 para
  rutas inexistentes y manejador global de errores.
- `errorHandler`: 400 si el JSON viene mal formado, 413 si el body es demasiado grande, 415
  si la codificación no está soportada y 500 genérico en lo demás; nunca devuelve
  `err.message` (en desarrollo el detalle solo va a la consola del servidor).
- Controladores y rutas de trámites, solicitudes, reportes y notificaciones.
- `DELETE /api/solicitudes/:folio`: el vecino cancela una solicitud propia que sigue
  pendiente (204; 404 si no existe o es ajena; 409 si ya no está pendiente).
- `PATCH /api/solicitudes/:folio` valida las transiciones de estado (409 si no son válidas) y
  crea la notificación para el vecino en la misma transacción.
- Validaciones de entrada: `tramiteId` existente, `estado` válido (en el body y en
  `?estado=`), `observaciones` de tipo texto e ids numéricos estrictos.
- Integración con la auth de Francisco: las rutas usan sus `authMiddleware` y
  `roleMiddleware`, y `app.ts` combina lo de ambos (CORS y rutas de negocio, más
  `x-powered-by` deshabilitado y límite de 16kb).

### Verificado

Probado contra MariaDB 10.4 (XAMPP) con los datos semilla y **tokens JWT reales**
obtenidos con `POST /api/auth/login` para ambas cuentas de prueba: los 11 endpoints de
negocio y los 4 de auth, con sus casos de éxito, 400, 401, 403, 404 y 409. Además pasa
`npm test` (suite contra la base real `muni_stodomingo_test`, que no depende del `.env`) y la
colección Postman corre sin fallos con newman, dos veces seguidas.

### Próximos pasos posibles

- Documentación interactiva con Swagger UI en `/api/docs` (opcional).
- RF-03 (adjuntar documentos) y teléfono y dirección en el perfil (RF-06), para la
  siguiente entrega.

---

## Problemas conocidos

| # | Problema | Impacto | Responsable |
| --- | --- | --- | --- |
| 1 | ~~`schema.sql` no se puede ejecutar dos veces~~ ✅ | Resuelto: empieza con `DROP TABLE IF EXISTS` y se puede re-ejecutar | Simón |
| 2 | ~~`FRONTEND_URL` por defecto es `:8100` y Vite usa `:5173`~~ ✅ | Resuelto: `.env.example` trae `FRONTEND_URL=http://localhost:5173` (con `ionic serve` hay que poner `http://localhost:8100`) y el README lo recuerda | Quien conecte el frontend |

---

## Decisiones tomadas

Diferencias con el documento de instrucciones original, y por qué:

| Instrucción original | Lo que se hizo | Motivo |
| --- | --- | --- |
| Crear stubs simulados en `services/` y `config/database.ts` | **No se crearon** | Simón ya había entregado las versiones reales; los stubs las habrían sobrescrito |
| Tipos `User`, `Solicitud`, `Notificacion` en `types/index.ts` | Se mantuvieron los de Simón (`UsuarioPublico`, `SolicitudFrontend`, `NotificacionFrontend`, …) y `req.user` se tipa en `types/express.d.ts` (de Francisco) | Los servicios ya dependen de ellos; cambiarlos habría roto la capa de datos |
| `GET/PATCH /solicitudes/:id` con `parseInt` | Se usa el **folio** (`SOL-1001`) | Los servicios buscan por folio, y el frontend identifica las solicitudes por folio |
| Folio con `Date.now() % 10000` | Folio derivado del `insertId` en `solicitudService.create` | La versión original se repite cada 10 segundos; la nueva es correlativa y no colisiona |
| `POST /solicitudes` sin restricción de rol en el código | `roleMiddleware('vecino')` | La tabla de endpoints del mismo documento dice que es solo para vecinos |
| — | Comprobar que el trámite existe antes de crear la solicitud | Si no, la clave foránea falla y el cliente recibe un 500 en vez de un 400 |
| — | Respuesta 404 para rutas inexistentes, 400 para JSON mal formado y 413 para bodies grandes | Mantener el formato `{ success, error }` en todos los casos. Los mensajes coinciden con los que esperan las pruebas de Francisco |
| Middlewares de auth con `export default` | Se exportan con nombre (`{ authMiddleware }`), como los entregó Francisco | Su implementación y sus pruebas los usan así; las rutas de negocio se adaptaron |
| — | `"ts-node": { "files": true }` en `tsconfig.json` | Para que `ts-node` (usado por `npm run dev`) cargue `types/express.d.ts` |
| `dev` con nodemon + ts-node | Se mantuvo; Francisco usaba `tsx watch` | Decisión del equipo de seguir las instrucciones. Ambos funcionan |
| — | `DELETE /api/solicitudes/:folio` es un borrado físico, solo del vecino dueño y solo de solicitudes pendientes | Completa el CRUD de `solicitud` sin agregar un estado "cancelada" (cambiaría el CHECK, los reportes y la UI). Los avisos se conservan (`ON DELETE SET NULL`). Un funcionario usa `rechazado` |
| — | `PUT /api/auth/me` en vez de `/api/usuarios/me` | Es el mismo recurso que `GET /api/auth/me`: comparten URI y no se duplica la lectura |
| — | Máquina de estados: `pendiente` pasa a `en_revision`, `aprobado` o `rechazado`; `en_revision` pasa a `aprobado` o `rechazado`, o a sí mismo solo si trae observaciones; los finales no cambian | Cumple RF-04, evita reabrir solicitudes resueltas y avisos repetidos sin información nueva. Se responde 409 |
| `DROP DATABASE` para reiniciar la semilla | `DROP TABLE IF EXISTS` al inicio de `schema.sql` | La suite de pruebas reutiliza el script sin las líneas `CREATE DATABASE` y `USE`: un `DROP DATABASE` borraría la base de desarrollo durante `npm test` |
| `err.message` visible con `NODE_ENV=development` | El 500 nunca incluye el detalle; en desarrollo solo se escribe en la consola | El `.env.example` trae `development` y habría filtrado mensajes de la base de datos |

---

## Flujo de trabajo con Git

```
backend-<persona>  ──PR──▶  backend  ──PR──▶  main
```

1. Cada integrante trabaja en su rama personal **creada desde `backend`**.
2. Antes de subir: `npm run typecheck` y `npm test` sin errores, y `npm run dev` arrancando.
3. Se sube la rama y se abre un Pull Request hacia `backend`. En la descripción conviene
   enlazar la sección de este checklist que corresponde.
4. Al recibir cambios de otros: `git pull origin backend` en la rama personal.

Si un clon solo trae la rama `backend` (`git branch -r` no muestra las demás), se arregla
con:

```bash
git config remote.origin.fetch "+refs/heads/*:refs/remotes/origin/*"
git fetch origin
```
