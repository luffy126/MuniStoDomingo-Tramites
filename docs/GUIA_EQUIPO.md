# Guía del equipo: estado del backend y próximos pasos

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
| Autenticación: registro, login, JWT | ⏳ Stub, la implementa Francisco |
| Frontend consumiendo la API | ❌ El frontend aún usa datos mock |

**Lo que hoy bloquea al proyecto es la autenticación.** Sin ella el frontend no puede
iniciar sesión contra el backend, y no se pueden probar los endpoints de funcionario,
porque el stub siempre identifica al usuario como vecino.

---

## Quién hace qué

| Integrante | Responsabilidad | Archivos |
| --- | --- | --- |
| **Tomás** | Servidor, API REST de negocio (EP 2.1 y parte de EP 2.3) | `app.ts`, `server.ts`, `controllers/` (salvo auth), `routes/` (salvo auth), `middleware/errorHandler.ts`, `types/index.ts` |
| **Simón** | Base de datos y consultas | `schema.sql`, `config/database.ts`, `services/` |
| **Francisco** | Autenticación y autorización | `routes/authRoutes.ts`, `controllers/authController.ts`, `middleware/authMiddleware.ts`, `middleware/roleMiddleware.ts` |
| **Frontend** | Interfaz Ionic + React (rama `frontend`) | Reemplazar los mocks de `src/services/` por llamadas a la API |

---

## Francisco · Autenticación

### Qué existe hoy

Cuatro archivos *stub* que dejan el proyecto compilando y funcionando:

| Archivo | Qué hace hoy | Qué debe hacer |
| --- | --- | --- |
| `src/middleware/authMiddleware.ts` | Deja pasar todo y fija `req.user = { id: 1, email: 'dev@test.com', rol: 'vecino' }` | Verificar el JWT del header `Authorization` |
| `src/middleware/roleMiddleware.ts` | Ya funciona: compara `req.user.rol` con el rol pedido y responde 401/403 | Puede quedar igual o mejorarse |
| `src/routes/authRoutes.ts` | Router vacío, montado en `/api/auth` | Declarar `register`, `login` y `me` |
| `src/controllers/authController.ts` | Vacío | Implementar los tres controladores |

**Basta con reemplazar esos archivos.** No hay que tocar `app.ts` ni las demás rutas: ya
importan `authMiddleware` y `roleMiddleware` con estos nombres y como `export default`.

### Lo que el resto del código espera de ti

**1. `authMiddleware` debe dejar en `req.user` exactamente esto:**

```typescript
req.user = { id: number, email: string, rol: 'vecino' | 'funcionario' };
```

El tipo ya está declarado como `UsuarioSesion` en `src/types/index.ts`, así que
`req.user` está tipado en todo el proyecto. Los controladores leen `req.user.id` (para
saber de quién son las solicitudes y notificaciones) y `req.user.rol`.

**2. Si no hay token o es inválido**, responder sin llamar a `next()`:

```json
// 401
{ "success": false, "error": "No autenticado" }
```

**3. Las firmas de uso no cambian:**

```typescript
router.use(authMiddleware);                       // sin paréntesis
router.get('/x', roleMiddleware('funcionario'));  // recibe el rol como string
```

### Servicios disponibles (los hizo Simón)

Ojo: los nombres de tipos difieren del documento de instrucciones original. Usa estos:

```typescript
import * as userService from '../services/userService';
import type { UsuarioDB, UsuarioPublico, Rol } from '../types';

userService.createUser(nombre, email, passwordHash, rol): Promise<UsuarioPublico>
userService.findByEmail(email): Promise<UsuarioDB | null>   // incluye password_hash
userService.findById(id):       Promise<UsuarioPublico | null>
```

- `findByEmail` no distingue mayúsculas e incluye `password_hash`. **Nunca devolver ese
  objeto tal cual en una respuesta**; armar uno sin el hash.
- `createUser` lanza un error de MySQL con `code === 'ER_DUP_ENTRY'` si el correo ya
  existe. Conviene atraparlo y responder `409` (o `400`) en vez de dejarlo llegar al 500.
- `findById` sirve para confirmar en `/me` que el usuario del token sigue existiendo.

### Dependencias ya instaladas

`jsonwebtoken`, `bcrypt`, `express-validator` y sus tipos. El `JWT_SECRET` y el
`JWT_EXPIRES_IN` se leen de `.env`.

Las cuentas semilla (`vecino@test.com` y `funcionario@test.com`, contraseña `Test1234`)
tienen hash bcrypt de 10 rondas, así que `bcrypt.compare('Test1234', password_hash)` debe
dar `true`.

### Contrato propuesto para los endpoints

Es una propuesta para que el frontend pueda prepararse. Si Francisco decide otra forma,
basta con actualizar esta sección.

**`POST /api/auth/register`**

```json
// body
{ "nombre": "Ana Pérez", "email": "ana@correo.cl", "password": "Secreta123" }

// 201
{ "success": true, "data": { "token": "eyJ...", "user": { "id": 3, "nombre": "Ana Pérez", "email": "ana@correo.cl", "rol": "vecino" } } }
```

Recomendación: el registro público crea siempre **vecinos**. Si el body trae
`"rol": "funcionario"`, cualquiera podría darse permisos de funcionario.

**`POST /api/auth/login`**

```json
// body
{ "email": "vecino@test.com", "password": "Test1234" }

// 200
{ "success": true, "data": { "token": "eyJ...", "user": { "id": 1, "nombre": "Vecino Demo", "email": "vecino@test.com", "rol": "vecino" } } }

// 401: mismo mensaje si el correo no existe o la contraseña es incorrecta
{ "success": false, "error": "Credenciales inválidas" }
```

**`GET /api/auth/me`** (con `authMiddleware`)

```json
// 200
{ "success": true, "data": { "id": 1, "nombre": "Vecino Demo", "email": "vecino@test.com", "rol": "vecino" } }
```

**Payload sugerido del JWT:** `{ id, email, rol }`. Es justo lo que necesita `req.user`,
así el middleware no tiene que consultar la base de datos en cada petición.

### Cómo comprobar que quedó bien

1. `npm run typecheck` sin errores.
2. Sin token: `GET /api/solicitudes` → `401`.
3. Con el token del vecino: `GET /api/solicitudes` → sus 5 solicitudes, y
   `GET /api/solicitudes/reportes` → `403`.
4. Con el token del funcionario: `GET /api/solicitudes/reportes` → `200`, y
   `PATCH /api/solicitudes/SOL-1001` con `{"estado":"en_revision"}` → `200`.

---

## Simón · Capa de datos

Tu parte está entregada y funcionando: los controladores usan los servicios tal cual, sin
cambiarles ninguna firma. Quedan estos pendientes, en orden de importancia:

### 1. Verificar el dueño de solicitudes y notificaciones (seguridad)

Hoy un vecino puede ver la solicitud de otro (`GET /api/solicitudes/SOL-XXXX`) y marcar
como leída la notificación de otro (`PATCH /api/notificaciones/:id`). El controlador no
lo puede impedir porque **los servicios no le dicen de quién es el recurso**:
`SolicitudFrontend` no incluye `vecinoId`, y `markAsRead` no filtra por usuario.

Propuesta, a coordinar con Tomás:

```typescript
// solicitudService: agregar el dueño, sin exponerlo al frontend
export async function getOwnerId(folio: string): Promise<number | null>;

// notificacionService: filtrar por usuario dentro del UPDATE
export async function markAsRead(id: number, usuarioId: number): Promise<boolean>;
//   UPDATE notificacion SET leida = TRUE WHERE id = ? AND usuario_id = ?
```

Con eso Tomás agrega la verificación en los controladores. Al vecino se le respondería
`404` en vez de `403`, para no revelar que el folio existe.

### 2. Folio duplicado en creaciones simultáneas

`generarFolio()` calcula `MAX(id) + 1`. Si dos vecinos crean una solicitud en el mismo
instante, ambos pueden obtener el mismo folio, y la segunda inserción falla con un 500
(`folio` es `UNIQUE`). Con pocos usuarios es improbable. Opciones: insertar primero y
derivar el folio del `insertId` dentro de una transacción, o reintentar ante
`ER_DUP_ENTRY`.

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

La rama `frontend` funciona **100 % con datos mock**: `src/services/tramiteService.ts`
usa arreglos en memoria y `src/services/authService.ts` guarda la sesión en
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
| `loginRequest(email, password)` | `POST /api/auth/login` | Pendiente de Francisco. Guardar el **token**, no solo el usuario |
| `registerRequest(datos)` | `POST /api/auth/register` | Pendiente de Francisco |

Los mocks actuales son **síncronos**. Al conectarlos a la API pasan a devolver
`Promise`, así que los componentes que hoy los llaman directamente tendrán que usar
`useEffect` y manejar estados de carga y error.

### Diferencias de detalle

- `User.id` en el frontend es string (`'u-1'`); la API lo entrega como **número** (`1`).
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
- `app.ts`: CORS, parseo de JSON, `/api/health`, montaje de rutas, 404 para rutas
  inexistentes y manejador global de errores.
- `errorHandler`: 400 si el JSON viene mal formado, 500 en lo demás; el detalle solo se
  muestra en desarrollo.
- Controladores y rutas de trámites, solicitudes, reportes y notificaciones.
- Validaciones de entrada: `tramiteId` existente, `estado` válido (en el body y en
  `?estado=`), `observaciones` de tipo texto e ids numéricos estrictos.
- Stubs de Francisco para que el proyecto compile.
- Tipo `req.user` (`UsuarioSesion`) declarado para todo Express.

### Verificado

Probado contra MariaDB 10.4 (XAMPP) con los datos semilla: los 10 endpoints, con sus
casos de éxito, 400, 403 y 404. Los endpoints de funcionario se probaron montando los
mismos controladores con un usuario funcionario, sin modificar el stub.

### Próximos pasos posibles

- Verificación de dueño en solicitudes y notificaciones, cuando Simón exponga el dato
  (ver [Problemas conocidos](#problemas-conocidos)).
- Documentación interactiva con Swagger UI en `/api/docs` (opcional).
- Notificación automática al cambiar el estado de una solicitud.

---

## Problemas conocidos

| # | Problema | Impacto | Responsable |
| --- | --- | --- | --- |
| 1 | Sin auth real, todo usuario es "vecino id 1" | No se pueden probar las rutas de funcionario ni conectar el login del frontend | Francisco |
| 2 | `GET /solicitudes/:folio` no verifica que la solicitud sea del vecino | Un vecino puede ver solicitudes ajenas | Simón + Tomás |
| 3 | `PATCH /notificaciones/:id` no verifica el dueño | Un usuario puede marcar notificaciones ajenas | Simón + Tomás |
| 4 | Folio por `MAX(id)+1` | Posible 500 en creaciones simultáneas | Simón |
| 5 | `schema.sql` no se puede ejecutar dos veces | Para reiniciar la semilla hay que borrar la base primero | Simón |
| 6 | `FRONTEND_URL` por defecto es `:8100` y Vite usa `:5173` | Errores de CORS al conectar el frontend | Quien conecte el frontend |

---

## Decisiones tomadas

Diferencias con el documento de instrucciones original, y por qué:

| Instrucción original | Lo que se hizo | Motivo |
| --- | --- | --- |
| Crear stubs con mocks en `services/` y `config/database.ts` | **No se crearon** | Simón ya había entregado las versiones reales; los stubs las habrían sobrescrito |
| Tipos `User`, `Solicitud`, `Notificacion` en `types/index.ts` | Se mantuvieron los de Simón (`UsuarioPublico`, `SolicitudFrontend`, `NotificacionFrontend`, …) y se agregó `UsuarioSesion` para `req.user` | Los servicios ya dependen de ellos; cambiarlos habría roto la capa de datos |
| `GET/PATCH /solicitudes/:id` con `parseInt` | Se usa el **folio** (`SOL-1001`) | Los servicios buscan por folio, y el frontend identifica las solicitudes por folio |
| Folio con `Date.now() % 10000` | `solicitudService.generarFolio()` | La versión original se repite cada 10 segundos; la de Simón es correlativa |
| `POST /solicitudes` sin restricción de rol en el código | `roleMiddleware('vecino')` | La tabla de endpoints del mismo documento dice que es solo para vecinos |
| — | Comprobar que el trámite existe antes de crear la solicitud | Si no, la clave foránea falla y el cliente recibe un 500 en vez de un 400 |
| — | Respuesta 404 para rutas inexistentes y 400 para JSON mal formado | Mantener el formato `{ success, error }` en todos los casos |
| — | `"ts-node": { "files": true }` en `tsconfig.json` | Para que `ts-node` cargue la declaración global de `req.user` |

---

## Flujo de trabajo con Git

```
branch-<persona>  ──PR──▶  backend  ──PR──▶  main
```

1. Cada integrante trabaja en su rama personal **creada desde `backend`**.
2. Antes de subir: `npm run typecheck` sin errores y `npm run dev` arrancando.
3. Se sube la rama y se abre un Pull Request hacia `backend`. En la descripción conviene
   enlazar la sección de esta guía que corresponde.
4. Al recibir cambios de otros: `git pull origin backend` en la rama personal.

Si un clon solo trae la rama `backend` (`git branch -r` no muestra las demás), se arregla
con:

```bash
git config remote.origin.fetch "+refs/heads/*:refs/remotes/origin/*"
git fetch origin
```
