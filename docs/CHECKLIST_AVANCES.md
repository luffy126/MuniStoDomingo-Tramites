# Checklist de avances: estado del backend y próximos pasos

Este documento dice **qué está listo, qué falta y qué le toca a cada uno**, con el detalle
necesario para que cada integrante pueda tomar su parte sin tener que leer el código de
los demás.

*Última actualización: 18 de octubre de 2026.*

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
| 10 endpoints de negocio (trámites, solicitudes, reportes, notificaciones) | ✅ Listos y probados contra MariaDB |
| Autenticación: registro, login, JWT y roles | ✅ Lista e integrada con la API de negocio |
| Frontend consumiendo la API | ❌ El frontend aún usa datos mock |

**El backend está completo de punta a punta.** El siguiente paso grande es conectar el
frontend: ver [Frontend · Conexión con la API](#frontend--conexión-con-la-api).

---

## Quién hace qué

| Integrante | Responsabilidad | Archivos |
| --- | --- | --- |
| **Tomás** | Servidor, API REST de negocio (EP 2.1 y parte de EP 2.3) | `app.ts`, `server.ts`, `controllers/` (salvo auth), `routes/` (salvo auth), `middleware/errorHandler.ts` |
| **Simón** | Base de datos y consultas | `schema.sql`, `config/database.ts`, `services/` |
| **Francisco** | Autenticación y autorización | `config/jwt.ts`, `routes/authRoutes.ts`, `controllers/authController.ts`, `middleware/authMiddleware.ts`, `middleware/roleMiddleware.ts`, `middleware/validateRequest.ts`, `types/express.d.ts`, `tests/` |
| **Frontend** | Interfaz Ionic + React (rama `frontend`) | Reemplazar los mocks de `src/services/` por llamadas a la API |

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
- **Pruebas sin MySQL:** las pruebas reemplazan `userService` por memoria. El login contra
  la base real se verificó manualmente con las cuentas semilla (ver
  [Tomás · Verificado](#verificado)).

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

### 3. `seed.sql` separado

Las instrucciones del proyecto mencionan un `seed.sql`, pero hoy la semilla está dentro de
`schema.sql`. Hay que confirmar con el equipo o el profesor si basta así, o si conviene
separar estructura y datos (lo que, de paso, permitiría recargar la semilla sin borrar la
base).

### 4. Notificaciones automáticas (opcional)

La tabla `notificacion` existe, pero nada crea notificaciones cuando un funcionario cambia
el estado de una solicitud. `notificacionService.create` ya existe. Para usarlo desde
`actualizarEstado`, el controlador necesita el `vecino_id` y el `id` numérico de la
solicitud: el mismo dato del punto 1.

---

## Frontend · Conexión con la API

### Situación actual

La rama `frontend` funciona **100 % con datos mock**: su `src/services/tramiteService.ts`
usa arreglos en memoria y su `src/services/authService.ts` guarda la sesión en
`localStorage`. No hay ninguna llamada HTTP.

La buena noticia: **los tipos coinciden** con lo que devuelve la API (`Tramite`,
`Solicitud`, `Notificacion`, `EstadoSolicitud`, `CategoriaTramite`), así que los
componentes no deberían cambiar de forma.

### Correspondencia entre funciones mock y endpoints

| Función actual (frontend) | Endpoint | Cambios |
| --- | --- | --- |
| `getTramites()` | `GET /api/tramites` | Pasa a ser `async` |
| `getTramiteById(id)` | `GET /api/tramites/:id` | `async`; `null` si responde 404 |
| `buscarTramites(termino)` | — | Puede seguir filtrando en el cliente sobre `getTramites()` |
| `getSolicitudes()` | `GET /api/solicitudes` | Con token de funcionario devuelve todas; acepta `?estado=` |
| `getSolicitudesPorVecino(vecinoNombre)` | `GET /api/solicitudes` | Con token de vecino devuelve solo las suyas; **el nombre ya no se envía** |
| `getSolicitudById(id)` | `GET /api/solicitudes/:folio` | El `id` ya es el folio, como hoy |
| `crearSolicitud(datos)` | `POST /api/solicitudes` | Body: `{ tramiteId, observaciones? }`; **`vecinoNombre` ya no se envía** (sale del token) |
| `actualizarEstadoSolicitud(...)` | `PATCH /api/solicitudes/:folio` | Body: `{ estado, observaciones? }` |
| `getNotificaciones()` | `GET /api/notificaciones` | |
| — | `PATCH /api/notificaciones/:id` | Nuevo: marcar como leída |
| `getResumenPorEstado()` | `GET /api/solicitudes/reportes` | Mismo formato `Record<EstadoSolicitud, number>` |
| `loginRequest(email, password)` | `POST /api/auth/login` | Responde `{ user, token }`. Guardar el **token**, no solo el usuario. 401 `Credenciales inválidas` |
| `registerRequest(datos)` | `POST /api/auth/register` | Responde `{ user, token }`, ya con sesión iniciada. 400 con `details` por campo, 409 si el email existe |
| `recuperarSesion()` | `GET /api/auth/me` | Con el token guardado, confirma que la sesión sigue válida al recargar la app |

Los mocks actuales son **síncronos**. Al conectarlos a la API pasan a devolver
`Promise`, así que los componentes que hoy los llaman directamente tendrán que usar
`useEffect` y manejar estados de carga y error.

### Diferencias de detalle

- `User.id` en el frontend es string (`'u-1'`); la API lo entrega como **número** (`1`).
- Las reglas de contraseña del backend (8+ caracteres, mayúscula, minúscula y número) son
  más estrictas que las del mock: conviene alinear `src/utils/validators.ts` de la rama `frontend`.
- Si una petición responde 401 (`Token expirado` o `Token inválido`), limpiar la sesión y
  enviar al login.
- `Notificacion.id` sí viene como string, igual que en el frontend.
- `observaciones` se omite del JSON cuando está vacía, compatible con el `?` opcional
  del tipo.
- La API no envía `activo` en los trámites: solo devuelve los activos.

### Configuración

1. URL base en una variable de entorno de Vite, p. ej. `VITE_API_URL=http://localhost:3000/api`
   en un `.env` del frontend, leída con `import.meta.env.VITE_API_URL`.
2. Enviar en cada petición protegida el header `Authorization: Bearer <token>`.
3. **CORS:** el backend solo acepta el origen definido en `FRONTEND_URL`. El frontend
   corre con Vite en `http://localhost:5173`, así que en el `.env` del backend debe ir
   `FRONTEND_URL=http://localhost:5173` (el valor por defecto, `8100`, corresponde a
   `ionic serve`).
4. Siempre revisar `success` antes de usar `data`, y mostrar `error` al usuario cuando
   venga `false`.

Ejemplo de cliente mínimo:

```typescript
const API = import.meta.env.VITE_API_URL;

async function api<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('munisd.token');
  const res = await fetch(`${API}${ruta}`, {
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
- `errorHandler`: 400 si el JSON viene mal formado, 413 si el body es demasiado grande, 500
  en lo demás; el detalle solo se muestra en desarrollo.
- Controladores y rutas de trámites, solicitudes, reportes y notificaciones.
- Validaciones de entrada: `tramiteId` existente, `estado` válido (en el body y en
  `?estado=`), `observaciones` de tipo texto e ids numéricos estrictos.
- Integración con la auth de Francisco: las rutas usan sus `authMiddleware` y
  `roleMiddleware`, y `app.ts` combina lo de ambos (CORS y rutas de negocio, más
  `x-powered-by` deshabilitado y límite de 16kb).

### Verificado

Probado contra MariaDB 10.4 (XAMPP) con los datos semilla y **tokens JWT reales**
obtenidos con `POST /api/auth/login` para ambas cuentas de prueba: los 10 endpoints de
negocio y los 3 de auth, con sus casos de éxito, 400, 401, 403 y 404. Además pasa
`npm test`.

### Próximos pasos posibles

- Documentación interactiva con Swagger UI en `/api/docs` (opcional).
- Notificación automática al cambiar el estado de una solicitud.

---

## Problemas conocidos

| # | Problema | Impacto | Responsable |
| --- | --- | --- | --- |
| 1 | `schema.sql` no se puede ejecutar dos veces | Para reiniciar la semilla hay que borrar la base primero | Simón |
| 2 | `FRONTEND_URL` por defecto es `:8100` y Vite usa `:5173` | Errores de CORS al conectar el frontend | Quien conecte el frontend |

---

## Decisiones tomadas

Diferencias con el documento de instrucciones original, y por qué:

| Instrucción original | Lo que se hizo | Motivo |
| --- | --- | --- |
| Crear stubs con mocks en `services/` y `config/database.ts` | **No se crearon** | Simón ya había entregado las versiones reales; los stubs las habrían sobrescrito |
| Tipos `User`, `Solicitud`, `Notificacion` en `types/index.ts` | Se mantuvieron los de Simón (`UsuarioPublico`, `SolicitudFrontend`, `NotificacionFrontend`, …) y `req.user` se tipa en `types/express.d.ts` (de Francisco) | Los servicios ya dependen de ellos; cambiarlos habría roto la capa de datos |
| `GET/PATCH /solicitudes/:id` con `parseInt` | Se usa el **folio** (`SOL-1001`) | Los servicios buscan por folio, y el frontend identifica las solicitudes por folio |
| Folio con `Date.now() % 10000` | Folio derivado del `insertId` en `solicitudService.create` | La versión original se repite cada 10 segundos; la nueva es correlativa y no colisiona |
| `POST /solicitudes` sin restricción de rol en el código | `roleMiddleware('vecino')` | La tabla de endpoints del mismo documento dice que es solo para vecinos |
| — | Comprobar que el trámite existe antes de crear la solicitud | Si no, la clave foránea falla y el cliente recibe un 500 en vez de un 400 |
| — | Respuesta 404 para rutas inexistentes, 400 para JSON mal formado y 413 para bodies grandes | Mantener el formato `{ success, error }` en todos los casos. Los mensajes coinciden con los que esperan las pruebas de Francisco |
| Middlewares de auth con `export default` | Se exportan con nombre (`{ authMiddleware }`), como los entregó Francisco | Su implementación y sus pruebas los usan así; las rutas de negocio se adaptaron |
| — | `"ts-node": { "files": true }` en `tsconfig.json` | Para que `ts-node` (usado por `npm run dev`) cargue `types/express.d.ts` |
| `dev` con nodemon + ts-node | Se mantuvo; Francisco usaba `tsx watch` | Decisión del equipo de seguir las instrucciones. Ambos funcionan |

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
