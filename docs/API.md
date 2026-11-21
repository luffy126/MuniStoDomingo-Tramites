# Referencia de la API

Base URL en desarrollo: `http://localhost:3000/api`.

Desde el frontend de Vite se usa la misma ruta `/api` (proxy `same-origin` en el puerto
5173), así que no se escribe la URL del backend en el código del cliente.

Todos los ejemplos de respuesta son reales, obtenidos con los datos semilla de `schema.sql`.

## Contenido

- [Convenciones generales](#convenciones-generales)
- [Resumen de endpoints](#resumen-de-endpoints)
- [Health](#health)
- [Autenticación](#autenticación)
- [Trámites](#trámites)
- [Solicitudes](#solicitudes)
- [Reportes](#reportes)
- [Notificaciones](#notificaciones)
- [Documentos adjuntos](#documentos-adjuntos)
- [Cómo probar la API](#cómo-probar-la-api)

---

## Convenciones generales

### Sobre de respuesta

```json
{ "success": true,  "data": <objeto | arreglo> }
{ "success": false, "error": "Mensaje descriptivo" }
```

El frontend puede revisar siempre `success` primero; `data` solo existe cuando es `true` y
`error` solo cuando es `false`.

### Compresión

Las respuestas de 1 kB o más se comprimen con gzip cuando el cliente envía
`Accept-Encoding: gzip`. La cabecera `Vary` incluye `Accept-Encoding`. Las descargas de
adjuntos quedan excluidas: el archivo se sirve tal cual, con su `Content-Disposition` y sus
cabeceras `no-store`.

### Paginación

`GET /api/solicitudes` y `GET /api/notificaciones` responden de a páginas. `data` sigue
siendo el arreglo de elementos y los metadatos viajan al lado, en `pagination`:

```json
{
  "success": true,
  "data": [ ... ],
  "pagination": { "page": 1, "limit": 20, "total": 47, "totalPages": 3, "hasNext": true, "hasPrev": false }
}
```

| Parámetro | Por defecto | Reglas |
|---|---|---|
| `page` | `1` | Entero desde 1. Una página más allá del final responde `data: []`, no error |
| `limit` | `20` | Entero entre 1 y 100. Un valor mayor se recorta a 100 |

Un valor inválido (`page=abc`, `limit=-1`) se reemplaza por el valor por defecto; no produce
un 400. `total` cuenta todos los elementos que cumplen el filtro, no solo los de la página.

> **Importante para quien consuma la API:** sin `page` ni `limit` solo llegan los primeros
> 20 elementos. Para mostrar un listado completo hay que seguir pidiendo páginas mientras
> `hasNext` sea `true`.

### Límites de peticiones

| Ámbito | Límite por defecto | Configuración |
|---|---|---|
| `POST /api/auth/register`, `login`, `forgot-password`, `reset-password` | 10 intentos por IP cada 15 minutos | `AUTH_RATE_LIMIT_MAX` |
| Resto de las rutas, incluido `GET /api/auth/me` | 100 peticiones por IP y minuto | `GENERAL_RATE_LIMIT_MAX` |

Al superar el límite la API responde **429** con
`{ "success": false, "error": "Demasiados intentos. Intenta de nuevo en 15 minutos." }` o el
mensaje general equivalente. Los valores por defecto son los seguros para producción; el suite
E2E puede subirlos en desarrollo porque hace varios inicios de sesión y muchas peticiones en
poco tiempo.

### Códigos HTTP

| Código | Significado en esta API |
| --- | --- |
| `200` | Consulta o actualización exitosa |
| `201` | Usuario o solicitud creados |
| `204` | Solicitud cancelada (sin cuerpo en la respuesta) |
| `400` | Falta un campo, tiene un valor no permitido o el body no es JSON válido (`Datos de entrada inválidos`) |
| `401` | No autenticado: falta el token, es inválido o expiró; o credenciales incorrectas en el login |
| `403` | Autenticado, pero el rol no tiene permiso para ese endpoint (`No tienes permisos para esta acción`) |
| `404` | El recurso no existe, o la ruta no existe |
| `409` | Conflicto: el email ya está registrado, o la solicitud no está en un estado que admita la operación |
| `413` | El body JSON supera 16kb (`Solicitud demasiado grande`) o un archivo adjunto supera 5 MB |
| `415` | Codificación del body no soportada, p. ej. `charset=latin1` (`Tipo de contenido no soportado`) |
| `500` | Error interno. El campo `error` siempre es `Error interno del servidor`; el detalle (p. ej. `ECONNREFUSED` si la base de datos está apagada) solo se registra en la consola del servidor |

Los errores de validación de los endpoints de autenticación agregan un campo `details`:

```json
{
  "success": false,
  "error": "Datos de entrada inválidos",
  "details": [{ "campo": "email", "mensaje": "El formato del email no es válido" }]
}
```

### Autenticación en las peticiones

Las rutas marcadas con **Auth: Sí** requieren el header:

```
Authorization: Bearer <token>
```

El token se obtiene en [`POST /api/auth/login`](#post-apiauthlogin) o
[`POST /api/auth/register`](#post-apiauthregister) y dura lo que indique `JWT_EXPIRES_IN`
(24 horas por defecto). Cuando expira, el cliente debe volver a iniciar sesión.

| Situación | Código | `error` |
| --- | --- | --- |
| Sin header, o no empieza con `Bearer ` | 401 | `Token no proporcionado` |
| Token alterado, firmado con otra clave o con datos inválidos | 401 | `Token inválido` |
| Token vencido | 401 | `Token expirado` |
| Token válido pero rol incorrecto | 403 | `No tienes permisos para esta acción` |

### Valores permitidos

| Campo | Valores |
| --- | --- |
| `estado` | `pendiente`, `en_revision`, `aprobado`, `rechazado` |
| `prioridad` | `baja`, `media`, `alta`, `urgente` |
| `orden` | `reciente`, `antigua`, `prioridad`, `limite` (solo en la bandeja del funcionario) |
| `categoria` | `certificados`, `permisos`, `reclamos`, `solicitudes` |
| `rol` | `vecino`, `funcionario` |

### Identificadores

| Recurso | Identificador en la API | Ejemplo |
| --- | --- | --- |
| Trámite | `id` textual | `cert-residencia` |
| Solicitud | **folio** | `SOL-1001` |
| Notificación | id numérico (en el JSON viene como string) | `"1"` |

### Fechas

Siempre `YYYY-MM-DD`, en la zona horaria del servidor (no UTC). En Chile corresponde a la hora local.

---

## Resumen de endpoints

| Método | Ruta | Auth | Rol | Descripción |
| --- | --- | --- | --- | --- |
| GET | `/api/health` | No | — | Estado del servidor |
| GET | `/api/tramites` | No | — | Catálogo de trámites activos con requisitos |
| GET | `/api/tramites/:id` | No | — | Detalle de un trámite |
| POST | `/api/solicitudes` | Sí | vecino | Crear una solicitud |
| GET | `/api/solicitudes` | Sí | ambos | Vecino: las suyas. Funcionario: todas, con filtros y orden |
| GET | `/api/solicitudes/reportes` | Sí | funcionario | Agregados por estado, trámite y prioridad |
| GET | `/api/solicitudes/:folio` | Sí | ambos | Detalle de una solicitud, con historial |
| PATCH | `/api/solicitudes/:folio` | Sí | funcionario | Cambiar el estado |
| PATCH | `/api/solicitudes/:folio/prioridad` | Sí | funcionario | Ajustar prioridad y fecha límite |
| GET | `/api/solicitudes/:folio/documentos` | Sí | ambos | Listar adjuntos |
| POST | `/api/solicitudes/:folio/documentos` | Sí | vecino | Subir un adjunto binario |
| GET | `/api/solicitudes/:folio/documentos/:docId/descarga` | Sí | ambos | Descargar un adjunto |
| DELETE | `/api/solicitudes/:folio/documentos/:docId` | Sí | vecino | Quitar un adjunto propio de una solicitud abierta |
| DELETE | `/api/solicitudes/:folio` | Sí | vecino | Cancelar una solicitud propia que sigue pendiente |
| GET | `/api/notificaciones` | Sí | ambos | Notificaciones del usuario |
| PATCH | `/api/notificaciones/leidas` | Sí | ambos | Marcar todas como leídas |
| PATCH | `/api/notificaciones/:id` | Sí | ambos | Marcar como leída |
| POST | `/api/auth/register` | No | — | Crear cuenta y obtener token |
| POST | `/api/auth/login` | No | — | Iniciar sesión y obtener token |
| POST | `/api/auth/forgot-password` | No | — | Enviar enlace de recuperación (respuesta genérica) |
| POST | `/api/auth/reset-password` | No | — | Cambiar contraseña con token de un solo uso |
| GET | `/api/auth/me` | Sí | ambos | Datos del usuario de la sesión |
| PUT | `/api/auth/me` | Sí | ambos | Editar perfil; devuelve un token nuevo |

---

## Health

### `GET /api/health`

Sirve para comprobar que el servidor está arriba. No consulta la base de datos.

**200**

```json
{ "success": true, "data": { "status": "ok", "timestamp": "2026-10-19T01:09:45.328Z" } }
```

---

## Autenticación

### `POST /api/auth/register`

Crea una cuenta y devuelve la sesión iniciada.

**Body**

```json
{ "nombre": "Ana Pérez", "email": "ana@correo.cl", "password": "Secreta123" }
```

| Campo | Requerido | Regla |
| --- | --- | --- |
| `nombre` | Sí | Entre 3 y 120 caracteres (se recortan los espacios) |
| `email` | Sí | Formato válido, hasta 160 caracteres. Se recorta y se guarda en minúsculas |
| `password` | Sí | Mínimo 8 caracteres, con al menos una mayúscula, una minúscula y un número; máximo 72 bytes |

> `telefono` y `direccion` se pueden enviar al registrarse, pero son opcionales. El registro
> público siempre crea cuentas `vecino`: si el body incluye `rol`, se ignora. Las cuentas
> `funcionario` se crean directamente en la base de datos (ver `schema.sql`).

**201**

```json
{
  "success": true,
  "data": {
    "user": { "id": 3, "nombre": "Ana Pérez", "email": "ana@correo.cl", "rol": "vecino", "telefono": null, "direccion": null },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Errores**

| Código | `error` | Causa |
| --- | --- | --- |
| 400 | `Datos de entrada inválidos` + `details` | Algún campo no cumple su regla |
| 409 | `El email ya está registrado` | Ya existe una cuenta con ese correo |

### `POST /api/auth/login`

**Body**

```json
{ "email": "vecino@test.com", "password": "Test1234" }
```

**200**

```json
{
  "success": true,
  "data": {
    "user": { "id": 1, "nombre": "Vecino Demo", "email": "vecino@test.com", "rol": "vecino", "telefono": null, "direccion": null },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

El cliente debe guardar `token` y enviarlo en el header `Authorization` de las siguientes
peticiones. `user.rol` sirve para decidir a qué vista redirigir.

**Errores**

| Código | `error` | Causa |
| --- | --- | --- |
| 400 | `Datos de entrada inválidos` + `details` | Falta el email o la contraseña, o no son texto |
| 401 | `Credenciales inválidas` | El correo no existe **o** la contraseña es incorrecta (mismo mensaje a propósito, para no revelar qué cuentas existen) |

### `GET /api/auth/me`

Devuelve el usuario de la sesión. Sirve para restaurar la sesión al recargar la app.

**200**

```json
{ "success": true, "data": { "id": 1, "nombre": "Vecino Demo", "email": "vecino@test.com", "rol": "vecino", "telefono": null, "direccion": null } }
```

**Errores**: los 401 de [autenticación](#autenticación-en-las-peticiones), y **404** `Usuario no encontrado`
si la cuenta se eliminó después de emitir el token.

### `PUT /api/auth/me`

Reemplaza el nombre y el email del usuario de la sesión (RF-06). Es el mismo recurso que
`GET /api/auth/me`, por eso comparten URI. Sirve para ambos roles.

**Body**

```json
{ "nombre": "Ana Pérez Soto", "email": "ana.nueva@correo.cl", "telefono": "+56 9 1234 5678", "direccion": "Av. Central 123" }
```

| Campo | Requerido | Regla |
| --- | --- | --- |
| `nombre` | Sí | Entre 3 y 120 caracteres (se recortan los espacios) |
| `email` | Sí | Formato válido, hasta 160 caracteres. Se recorta y se guarda en minúsculas |
| `telefono` | No | Texto de hasta 30 caracteres; se guarda `null` si falta o está vacío |
| `direccion` | No | Texto de hasta 200 caracteres; se guarda `null` si falta o está vacío |
| `passwordActual` | Solo si cambia el email | Contraseña actual del usuario. Sin ella (o incorrecta) responde **403** |

Con `PUT` se envían **nombre y email**. Teléfono y dirección son opcionales; si se omiten se
guardan como `null`. Si el body incluye `rol` o `password`, se ignoran.

**200**: la sesión actualizada. Como el email viaja dentro del token, se **emite un token
nuevo** y el cliente debe reemplazar el anterior. Si el email cambió, los tokens anteriores
(otras sesiones abiertas) dejan de servir: el backend sube la versión de sesión del usuario
(`token_version`, claim `tv`). Lo mismo ocurre al restablecer la contraseña.

```json
{
  "success": true,
  "data": {
    "user": { "id": 3, "nombre": "Ana Pérez Soto", "email": "ana.nueva@correo.cl", "rol": "vecino", "telefono": "+56 9 1234 5678", "direccion": "Av. Central 123" },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Errores**

| Código | `error` | Causa |
| --- | --- | --- |
| 400 | `Datos de entrada inválidos` + `details` | Falta un campo o no cumple su regla |
| 401 | `Token no proporcionado` / `Token inválido` / `Token expirado` | Falta el token o no es válido |
| 404 | `Usuario no encontrado` | La cuenta se eliminó después de emitir el token |
| 409 | `El email ya está registrado` | Otro usuario ya tiene ese correo |

### `POST /api/auth/forgot-password`

Solicita un enlace de recuperación. **Siempre responde lo mismo**, exista o no la cuenta,
para no revelar qué correos están registrados.

**Body**

```json
{ "email": "ana@correo.cl" }
```

**200**

```json
{ "success": true, "data": { "mensaje": "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña." } }
```

Si la cuenta existe, se crea un token SHA-256 de un solo uso con vigencia de 1 hora y se envía
un correo a `${FRONTEND_URL || 'http://localhost:5173'}/recuperar-password?token=...`. Sin
`RESEND_API_KEY`, el correo queda en modo *dry run* y el enlace se imprime en la consola del
backend.

### `POST /api/auth/reset-password`

Cambia la contraseña usando el token del correo.

**Body**

```json
{ "token": "token-de-un-solo-uso", "password": "NuevaClave123" }
```

| Campo | Requerido | Regla |
| --- | --- | --- |
| `token` | Sí | Token recibido por correo; se invalida tras el primer uso o al vencer |
| `password` | Sí | Mínimo 8 caracteres, con mayúscula, minúscula y número |

**200**

```json
{ "success": true, "data": { "mensaje": "Tu contraseña se actualizó. Ya puedes ingresar." } }
```

**400** `{ "success": false, "error": "El enlace no es válido o ya venció. Solicita uno nuevo." }`
cuando el token no existe, ya se usó o expiró.

---

## Trámites

El catálogo es público: no requiere login.

### `GET /api/tramites`

Lista los trámites **activos**, ordenados por nombre, cada uno con sus requisitos en orden.

**200**

```json
{
  "success": true,
  "data": [
    {
      "id": "cert-numero-municipal",
      "nombre": "Certificado de número municipal",
      "categoria": "certificados",
      "descripcion": "Certifica el número asignado a tu propiedad por la municipalidad.",
      "icono": "homeOutline",
      "requisitos": ["Rol de avalúo de la propiedad", "Cédula de identidad del propietario"]
    }
  ]
}
```

`icono` es el nombre de un ícono de [Ionicons](https://ionic.io/ionicons) en camelCase.

### `GET /api/tramites/:id`

**200**

```json
{
  "success": true,
  "data": {
    "id": "cert-residencia",
    "nombre": "Certificado de residencia",
    "categoria": "certificados",
    "descripcion": "Acredita tu domicilio dentro de la comuna de Santo Domingo.",
    "icono": "documentTextOutline",
    "requisitos": [
      "Cédula de identidad vigente",
      "Comprobante de domicilio de los últimos 3 meses",
      "Declaración jurada simple"
    ]
  }
}
```

**404** `{ "success": false, "error": "Trámite no encontrado" }`, también cuando el trámite existe pero está inactivo.

---

## Solicitudes

Todas requieren autenticación.

### Objeto Solicitud

| Campo | Tipo | Nota |
| --- | --- | --- |
| `id` | string | El folio, p. ej. `SOL-1001` |
| `tramiteId` | string | Id del trámite |
| `tramiteNombre` | string | Nombre legible del trámite |
| `vecinoNombre` | string | Nombre de quien la ingresó |
| `fecha` | string | Fecha de creación, `YYYY-MM-DD` |
| `estado` | string | Ver [valores permitidos](#valores-permitidos) |
| `prioridad` | string | `baja`, `media`, `alta` u `urgente` |
| `fechaLimite` | string, opcional | `YYYY-MM-DD`; se omite si no hay plazo |
| `fechaResolucion` | string, opcional | `YYYY-MM-DD`; se omite mientras no esté resuelta |
| `observaciones` | string, opcional | **Se omite** cuando no hay observaciones |

El detalle (`GET /api/solicitudes/:folio`) agrega `historial`, una lista ordenada de eventos
con `id`, `estadoAnterior`, `estadoNuevo`, `actorNombre`, `observaciones` (opcional) y `fecha`
(`YYYY-MM-DD HH:mm:ss`). Las solicitudes semilla no tienen eventos y el frontend muestra un
fallback; las nuevas sí registran su creación.

### `POST /api/solicitudes`

Crea una solicitud a nombre del usuario autenticado. **Solo vecinos.** El vecino no se
envía en el body: se toma de la sesión. El folio lo genera el servidor.

**Body**

```json
{ "tramiteId": "cert-residencia", "observaciones": "Lo necesito para postular a un subsidio" }
```

| Campo | Requerido | Regla |
| --- | --- | --- |
| `tramiteId` | Sí | Debe ser un trámite existente y activo |
| `observaciones` | No | Texto |

**201**

```json
{
  "success": true,
  "data": {
    "id": "SOL-1006",
    "tramiteId": "cert-residencia",
    "vecinoNombre": "Vecino Demo",
    "fecha": "2026-10-18",
    "estado": "pendiente",
    "observaciones": "Lo necesito para postular a un subsidio"
  }
}
```

**Errores**

| Código | `error` | Causa |
| --- | --- | --- |
| 400 | `tramiteId es requerido` | Falta o no es texto |
| 400 | `observaciones debe ser texto` | Se envió un valor que no es string |
| 400 | `El trámite indicado no existe` | No existe o está inactivo |
| 400 | `Datos de entrada inválidos` | JSON mal formado |
| 403 | `No tienes permisos para esta acción` | El usuario es funcionario |

### `GET /api/solicitudes`

- **Vecino**: devuelve solo sus solicitudes.
- **Funcionario**: devuelve todas y acepta filtros, búsqueda y orden.

[Paginado](#paginación): acepta `?page=` y `?limit=` y la respuesta incluye `pagination`.
`total` cuenta solo lo que cumple los filtros.

| Parámetro | Aplica a | Regla |
| --- | --- | --- |
| `estado` | funcionario | Uno de los estados permitidos |
| `prioridad` | funcionario | `baja`, `media`, `alta`, `urgente` |
| `tramiteId` | funcionario | Id exacto del trámite |
| `q` | funcionario | Hasta 120 caracteres; busca sin distinción de tildes o mayúsculas |
| `desde` / `hasta` | funcionario | Fechas `YYYY-MM-DD`; `desde` no puede ser posterior a `hasta` |
| `vencidas` | funcionario | `1` o `true` solo incluye abiertas con `fechaLimite` pasada |
| `orden` | funcionario | `reciente` (default), `antigua`, `prioridad`, `limite` |

No existe el parámetro `dir`: cada valor de `orden` define su propio sentido.

```
GET /api/solicitudes
GET /api/solicitudes?page=2&limit=10
GET /api/solicitudes?estado=pendiente&prioridad=urgente&orden=limite
GET /api/solicitudes?q=alumbrado&vencidas=1
```

**200**

```json
{
  "success": true,
  "data": [
    {
      "id": "SOL-1004",
      "tramiteId": "permiso-evento",
      "tramiteNombre": "Permiso para evento",
      "vecinoNombre": "Vecino Demo",
      "fecha": "2026-09-18",
      "estado": "rechazado",
      "prioridad": "media",
      "fechaResolucion": "2026-09-20",
      "observaciones": "El plan de seguridad no cumple con el aforo declarado."
    },
    {
      "id": "SOL-1001",
      "tramiteId": "cert-residencia",
      "tramiteNombre": "Certificado de residencia",
      "vecinoNombre": "Vecino Demo",
      "fecha": "2026-09-12",
      "estado": "pendiente",
      "prioridad": "media"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 2, "totalPages": 1, "hasNext": false, "hasPrev": false }
}
```

**400** `estado debe ser uno de: pendiente, en_revision, aprobado, rechazado`, si el filtro
no es un estado válido.

### `GET /api/solicitudes/:folio`

```
GET /api/solicitudes/SOL-1003
```

**200**

```json
{
  "success": true,
  "data": {
    "id": "SOL-1003",
    "tramiteId": "reclamo-alumbrado",
    "tramiteNombre": "Reclamo por alumbrado público",
    "vecinoNombre": "Vecino Demo",
    "fecha": "2026-09-16",
    "estado": "aprobado",
    "prioridad": "alta",
    "fechaResolucion": "2026-09-17",
    "observaciones": "Cuadrilla asignada para el 20 de septiembre.",
    "historial": [
      {
        "id": "8",
        "estadoAnterior": null,
        "estadoNuevo": "pendiente",
        "actorNombre": "Vecino Demo",
        "observaciones": "Falta una luminaria frente al número 40.",
        "fecha": "2026-09-16 10:32:11"
      }
    ]
  }
}
```

**404** `{ "success": false, "error": "Solicitud no encontrada" }` (también cuando un vecino pide una solicitud que no es suya)

### `PATCH /api/solicitudes/:folio`

Cambia el estado de una solicitud. **Solo funcionarios.** El servidor registra qué
funcionario hizo el cambio y, si el estado es `aprobado` o `rechazado`, la fecha de
resolución.

**Transiciones permitidas** (según el estado actual de la solicitud):

| Estado actual | Puede pasar a |
| --- | --- |
| `pendiente` | `en_revision`, `aprobado`, `rechazado` |
| `en_revision` | `en_revision` (**solo si se envían `observaciones`** no vacías, para agregar información), `aprobado`, `rechazado` |
| `aprobado` | — (estado final) |
| `rechazado` | — (estado final) |

Ninguna transición vuelve a `pendiente`. Cualquier otra combinación responde **409**; también
`en_revision` → `en_revision` sin observaciones (o con solo espacios) o con las mismas que ya
tiene la solicitud, porque no aportaría información nueva. Las observaciones se guardan sin espacios sobrantes al inicio y al final.

**Efecto**: cada cambio exitoso crea **una notificación** para el vecino dueño de la
solicitud (`Solicitud en revisión`, `Solicitud aprobada` o `Solicitud rechazada`, con las
observaciones si se enviaron). El cambio y el aviso se guardan en una misma transacción y la
fila se bloquea mientras tanto: si dos funcionarios resuelven a la vez la misma solicitud, uno
recibe 200 y el otro 409.

**Body**

```json
{ "estado": "aprobado", "observaciones": "Retirar en oficina de partes" }
```

| Campo | Requerido | Regla |
| --- | --- | --- |
| `estado` | Sí | Uno de los [valores permitidos](#valores-permitidos) |
| `observaciones` | No | Texto sin etiquetas HTML, máximo 1000 caracteres. **Si se omite se conservan las anteriores**; un texto vacío o en blanco equivale a omitirlas. La interfaz exige al menos 10 caracteres al rechazar |

**200**: la solicitud actualizada, con el mismo formato que el detalle.

**Errores**

| Código | `error` | Causa |
| --- | --- | --- |
| 400 | `estado debe ser uno de: …` | Falta o no es válido |
| 400 | `observaciones debe ser texto` | No es string |
| 403 | `No tienes permisos para esta acción` | El usuario es vecino |
| 404 | `Solicitud no encontrada` | El folio no existe |
| 409 | `No se puede pasar una solicitud de "<actual>" a "<nuevo>"` | La transición no está permitida (p. ej. una solicitud ya aprobada, o pasar a `en_revision` otra vez sin observaciones) |

### `PATCH /api/solicitudes/:folio/prioridad`

Ajusta la prioridad y, opcionalmente, la fecha límite. **Solo funcionarios** y solo mientras la
solicitud esté `pendiente` o `en_revision`. La prioridad es manual: el servidor no aplica reglas
automáticas.

**Body**

```json
{ "prioridad": "urgente", "fechaLimite": "2026-11-25" }
```

| Campo | Requerido | Regla |
| --- | --- | --- |
| `prioridad` | Sí | `baja`, `media`, `alta`, `urgente` |
| `fechaLimite` | No | `YYYY-MM-DD`, `null` o `""` para quitar el plazo |

**200**: la solicitud actualizada, con el mismo formato que el detalle.

**Errores**

| Código | `error` | Causa |
| --- | --- | --- |
| 400 | `prioridad debe ser uno de: baja, media, alta, urgente` | Falta o no es válida |
| 400 | `fechaLimite debe ser una fecha YYYY-MM-DD o null` | Formato inválido |
| 403 | `No tienes permisos para esta acción` | El usuario es vecino |
| 404 | `Solicitud no encontrada` | El folio no existe |
| 409 | `La solicitud ya está "<estado>" y no admite cambios de prioridad` | Está aprobada o rechazada |

### `DELETE /api/solicitudes/:folio`

El vecino cancela una solicitud **propia** mientras siga `pendiente`. **Solo vecinos.** Es un
borrado físico: la solicitud desaparece, pero sus notificaciones se conservan (con
`solicitud_id` en `NULL`). Un funcionario no cancela: para eso tiene el estado `rechazado`.

```
DELETE /api/solicitudes/SOL-1005
```

No lleva body. **204** sin cuerpo.

**Errores**

| Código | `error` | Causa |
| --- | --- | --- |
| 401 | `Token no proporcionado` / `Token inválido` / `Token expirado` | Falta el token o no es válido |
| 403 | `No tienes permisos para esta acción` | El usuario es funcionario |
| 404 | `Solicitud no encontrada` | El folio no existe **o** es de otro vecino (misma respuesta, para no revelar que existe) |
| 409 | `Solo se pueden cancelar solicitudes pendientes` | La solicitud ya está `en_revision`, `aprobado` o `rechazado` |

---

## Reportes

### `GET /api/solicitudes/reportes`

Agregados para el panel de reportes. **Solo funcionarios.** Acepta `?desde=`, `?hasta=` y
`?tramiteId=` con las mismas reglas que la bandeja. Sin filtros, `desde` y `hasta` llegan `null`.

Los cuatro estados y las cuatro prioridades aparecen siempre, en `0` si no hay registros.
`vencidas` cuenta solicitudes abiertas cuya `fechaLimite` ya pasó. El promedio se calcula solo
sobre solicitudes resueltas y se redondea a un decimal.

**200**

```json
{
  "success": true,
  "data": {
    "desde": null,
    "hasta": null,
    "total": 5,
    "porEstado": {
      "pendiente": 2,
      "en_revision": 1,
      "aprobado": 1,
      "rechazado": 1,
      "vencidas": 1,
      "promedioResolucionDias": 2.4
    },
    "porTramite": [
      { "clave": "cert-residencia", "etiqueta": "Certificado de residencia", "total": 2 }
    ],
    "porPrioridad": [
      { "clave": "urgente", "etiqueta": "urgente", "total": 1 },
      { "clave": "media", "etiqueta": "media", "total": 4 }
    ],
    "vencidas": 1,
    "promedioResolucionDias": 2.4
  }
}
```

**400**: `desde debe ser una fecha YYYY-MM-DD`, `hasta debe ser una fecha YYYY-MM-DD` o
`desde no puede ser posterior a hasta`.

---

## Notificaciones

Todas requieren autenticación y trabajan sobre el usuario de la sesión.

Los avisos los genera el servidor: cada vez que un funcionario cambia el estado de una
solicitud (`PATCH /api/solicitudes/:folio`) el vecino dueño recibe una notificación. No hay un
endpoint para crearlas.

### Objeto Notificación

| Campo | Tipo | Nota |
| --- | --- | --- |
| `id` | string | Id numérico como texto, p. ej. `"1"` |
| `titulo` | string | |
| `mensaje` | string | |
| `fecha` | string | `YYYY-MM-DD` |
| `leida` | boolean | |
| `folio` | string, opcional | Folio de la solicitud asociada; el frontend enlaza al detalle |

### `GET /api/notificaciones`

De la más reciente a la más antigua. [Paginado](#paginación): acepta `?page=` y `?limit=`.
Aquí `pagination` trae además `unread`, la cantidad de avisos sin leer del usuario en
**todas** las páginas (sirve para el contador de la interfaz sin recorrer el listado).

**200**

```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "titulo": "Solicitud aprobada",
      "mensaje": "Tu reclamo por alumbrado público fue aprobado y asignado a una cuadrilla.",
      "fecha": "2026-09-16",
      "leida": false,
      "folio": "SOL-1003"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 1, "totalPages": 1, "hasNext": false, "hasPrev": false, "unread": 1 }
}
```

### `PATCH /api/notificaciones/leidas`

Marca todas las notificaciones del usuario como leídas. No requiere body. Va antes que
`/:id` para que `leidas` no se interprete como un identificador.

**200**

```json
{ "success": true, "data": { "actualizadas": 3 } }
```

### `PATCH /api/notificaciones/:id`

Marca una notificación como leída. No requiere body.

```
PATCH /api/notificaciones/1
```

**200**: la notificación actualizada, con el mismo formato que el listado. Es idempotente:
marcar una notificación que ya estaba leída también responde 200.

```json
{
  "success": true,
  "data": {
    "id": "1",
    "titulo": "Solicitud aprobada",
    "mensaje": "Tu reclamo por alumbrado público fue aprobado y asignado a una cuadrilla.",
    "fecha": "2026-09-16",
    "leida": true
  }
}
```

**Errores**

| Código | `error` | Causa |
| --- | --- | --- |
| 400 | `ID inválido` | No es un entero positivo (p. ej. `abc` o `5abc`) |
| 404 | `Notificación no encontrada` | No existe o pertenece a otro usuario |

---

## Cómo probar la API

Con el servidor levantado (`npm run dev`):

**Navegador**: los `GET` públicos se abren directo, p. ej. http://localhost:3000/api/tramites.

**Terminal (curl, en Git Bash)**

Primero se inicia sesión y se guarda el token; después se envía en cada petición:

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"vecino@test.com","password":"Test1234"}' | node -pe "JSON.parse(require('fs').readFileSync(0)).data.token")

curl http://localhost:3000/api/solicitudes -H "Authorization: Bearer $TOKEN"
curl -X POST http://localhost:3000/api/solicitudes -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"tramiteId":"cert-residencia"}'
curl -X PATCH http://localhost:3000/api/notificaciones/1 -H "Authorization: Bearer $TOKEN"
curl -X DELETE http://localhost:3000/api/solicitudes/SOL-1005 -H "Authorization: Bearer $TOKEN"   # 204 si está pendiente
```

Para probar como funcionario, repetir el login con `funcionario@test.com`.

**Herramientas gráficas**: Postman, Insomnia, Bruno o la extensión *REST Client* / *Thunder
Client* de VS Code.

**Ver el efecto en la base de datos**: phpMyAdmin (http://localhost/phpmyadmin con XAMPP),
base `muni_stodomingo`.

Después de probar, para volver a los datos semilla ver
[Puesta en marcha](../README.md#1-base-de-datos).

---

## Documentos adjuntos

MVP con almacenamiento local: los archivos se guardan en `UPLOAD_DIR` (por defecto
`back/uploads`) con nombre UUID y la base guarda el nombre original para mostrarlo. **Solo el
vecino dueño puede subir** mientras la solicitud esté abierta; el funcionario puede listar y
descargar. Un usuario sin permiso recibe `404` para no revelar el folio.

| Regla | Valor |
| --- | --- |
| Formatos | `application/pdf`, `image/jpeg`, `image/png` (se valida MIME **y** firma del archivo) |
| Tamaño máximo | 5 MB por archivo |
| Cantidad máxima | 10 documentos por solicitud |
| Nombre del archivo | UUID + extensión real; el nombre visible se normaliza y se le impone `.pdf`, `.jpg` o `.png` según la firma |
| Caché | `Cache-Control: private, no-store, must-revalidate` y `Vary: Authorization` en listado, subida, descarga y borrado |
| Auditoría | Se registra acción, resultado, `folio`, `docId`, rol, usuario e IP; nunca token ni nombre de archivo |
| Permisos de disco | Directorio `0700` y archivos `0600` cuando el sistema de archivos los respeta |
| Borrado físico | Al quitar un adjunto o cancelar la solicitud se elimina también el archivo de `UPLOAD_DIR` |

### Objeto Documento

| Campo | Tipo | Nota |
| --- | --- | --- |
| `id` | string | Id numérico como texto |
| `nombre` | string | Nombre original limpio |
| `tipo` | string | MIME detectado |
| `tamano` | number | Bytes |
| `fecha` | string | `YYYY-MM-DD HH:mm:ss` |
| `subidoPor` | string \| null | Nombre de quien lo subió |

### `GET /api/solicitudes/:folio/documentos`

**200**

```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "nombre": "cedula.pdf",
      "tipo": "application/pdf",
      "tamano": 18432,
      "fecha": "2026-11-18 10:15:03",
      "subidoPor": "Vecino Demo"
    }
  ]
}
```

### `POST /api/solicitudes/:folio/documentos`

El cuerpo es el **archivo binario**, no JSON. El nombre original viaja codificado en
`X-Nombre-Archivo`; el `Content-Type` debe ser uno de los tres formatos permitidos.

```bash
curl -X POST http://localhost:3000/api/solicitudes/SOL-1001/documentos \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/pdf" \
  -H "X-Nombre-Archivo: cedula.pdf" \
  --data-binary @cedula.pdf
```

**201**: el documento creado, con el formato del objeto anterior.

| Código | `error` | Causa |
| --- | --- | --- |
| 400 | `Envía el archivo como cuerpo binario (PDF, JPG o PNG).` | El body no es un buffer |
| 400 | `El archivo está vacío` | Buffer de 0 bytes |
| 400 | `Formato no permitido. Adjunta un PDF, JPG o PNG válido.` | MIME o firma no coinciden |
| 404 | `Solicitud no encontrada` | No existe o no pertenece al vecino |
| 409 | `La solicitud ya fue resuelta y no admite nuevos documentos` | Estado final |
| 409 | `Puedes adjuntar como máximo 10 documentos por solicitud` | Límite alcanzado |
| 413 | `El archivo no puede superar 5 MB` | Archivo demasiado grande |

### `GET /api/solicitudes/:folio/documentos/:docId/descarga`

Devuelve el archivo con `Content-Disposition: attachment` y el nombre original codificado.
Nunca expone la ruta de almacenamiento.

| Código | `error` | Causa |
| --- | --- | --- |
| 400 | `Documento no válido` | `docId` no es un entero positivo |
| 404 | `Solicitud no encontrada` | Sin permiso sobre el folio |
| 404 | `Documento no encontrado` | El id no pertenece a la solicitud |
| 404 | `El archivo ya no está disponible` | Falta el archivo en disco |

### `DELETE /api/solicitudes/:folio/documentos/:docId`

El vecino dueño puede retirar un adjunto mientras la solicitud siga pendiente o en revisión.
Borra la fila y el archivo físico; la respuesta es `204` sin cuerpo. El funcionario recibe
`403` porque la ruta exige rol `vecino`.

```bash
curl -X DELETE http://localhost:3000/api/solicitudes/SOL-1001/documentos/1 \
  -H "Authorization: Bearer $TOKEN"
```

| Código | `error` | Causa |
| --- | --- | --- |
| 400 | `Documento no válido` | `docId` no es un entero positivo |
| 403 | `Acceso denegado` | El token pertenece a un funcionario |
| 404 | `Documento no encontrado` | No existe, es de otro folio o de otro vecino |
| 409 | `La solicitud ya fue resuelta y sus documentos no se pueden modificar` | Estado final |
