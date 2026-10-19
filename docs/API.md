# Referencia de la API

Base URL en desarrollo: `http://localhost:3000/api`

Todos los ejemplos de respuesta son reales, obtenidos con los datos semilla de `schema.sql`.

## Contenido

- [Convenciones generales](#convenciones-generales)
- [Resumen de endpoints](#resumen-de-endpoints)
- [Health](#health)
- [Trámites](#trámites)
- [Solicitudes](#solicitudes)
- [Reportes](#reportes)
- [Notificaciones](#notificaciones)
- [Autenticación (pendiente)](#autenticación-pendiente)
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

### Códigos HTTP

| Código | Significado en esta API |
| --- | --- |
| `200` | Consulta o actualización exitosa |
| `201` | Solicitud creada |
| `400` | Falta un campo, tiene un valor no permitido o el body no es JSON válido |
| `401` | No autenticado (falta el token o es inválido) |
| `403` | Autenticado, pero el rol no tiene permiso para ese endpoint |
| `404` | El recurso no existe, o la ruta no existe |
| `500` | Error interno. Con `NODE_ENV=development` el campo `error` trae el detalle (p. ej. `ECONNREFUSED` si la base de datos está apagada) |

### Autenticación

Las rutas marcadas con **Auth: Sí** requieren un usuario autenticado. Cuando la auth real
esté lista se enviará el header:

```
Authorization: Bearer <token>
```

> **Estado actual:** la autenticación está en modo *stub*. Cualquier petición queda
> autenticada como **vecino id 1** (`vecino@test.com`), sin token. Por eso los endpoints de
> funcionario responden `403` por ahora. Ver [GUIA_EQUIPO.md](GUIA_EQUIPO.md#francisco--autenticación).

### Valores permitidos

| Campo | Valores |
| --- | --- |
| `estado` | `pendiente`, `en_revision`, `aprobado`, `rechazado` |
| `categoria` | `certificados`, `permisos`, `reclamos`, `solicitudes` |
| `rol` | `vecino`, `funcionario` |

### Identificadores

| Recurso | Identificador en la API | Ejemplo |
| --- | --- | --- |
| Trámite | `id` textual | `cert-residencia` |
| Solicitud | **folio** | `SOL-1001` |
| Notificación | id numérico (en el JSON viene como string) | `"1"` |

### Fechas

Siempre `YYYY-MM-DD`, en hora local de Chile (no UTC).

---

## Resumen de endpoints

| Método | Ruta | Auth | Rol | Descripción |
| --- | --- | --- | --- | --- |
| GET | `/api/health` | No | — | Estado del servidor |
| GET | `/api/tramites` | No | — | Catálogo de trámites activos con requisitos |
| GET | `/api/tramites/:id` | No | — | Detalle de un trámite |
| POST | `/api/solicitudes` | Sí | vecino | Crear una solicitud |
| GET | `/api/solicitudes` | Sí | ambos | Vecino: las suyas. Funcionario: todas |
| GET | `/api/solicitudes/reportes` | Sí | funcionario | Conteo de solicitudes por estado |
| GET | `/api/solicitudes/:folio` | Sí | ambos | Detalle de una solicitud |
| PATCH | `/api/solicitudes/:folio` | Sí | funcionario | Cambiar el estado |
| GET | `/api/notificaciones` | Sí | ambos | Notificaciones del usuario |
| PATCH | `/api/notificaciones/:id` | Sí | ambos | Marcar como leída |
| POST | `/api/auth/register` | No | — | *Pendiente (Francisco)* |
| POST | `/api/auth/login` | No | — | *Pendiente (Francisco)* |
| GET | `/api/auth/me` | Sí | ambos | *Pendiente (Francisco)* |

---

## Health

### `GET /api/health`

Sirve para comprobar que el servidor está arriba. No consulta la base de datos.

**200**

```json
{ "success": true, "data": { "status": "ok", "timestamp": "2026-10-19T01:09:45.328Z" } }
```

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

**404** `{ "success": false, "error": "Trámite no encontrado" }`

---

## Solicitudes

Todas requieren autenticación.

### Objeto Solicitud

| Campo | Tipo | Nota |
| --- | --- | --- |
| `id` | string | El folio, p. ej. `SOL-1001` |
| `tramiteId` | string | Id del trámite |
| `vecinoNombre` | string | Nombre de quien la ingresó |
| `fecha` | string | Fecha de creación, `YYYY-MM-DD` |
| `estado` | string | Ver [valores permitidos](#valores-permitidos) |
| `observaciones` | string, opcional | **Se omite** cuando no hay observaciones |

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
| 400 | `El cuerpo de la petición no es JSON válido` | JSON mal formado |
| 403 | `No autorizado para este recurso` | El usuario es funcionario |

### `GET /api/solicitudes`

- **Vecino**: devuelve solo sus solicitudes.
- **Funcionario**: devuelve todas. Acepta el filtro opcional `?estado=`.

Ordenadas de la más reciente a la más antigua.

```
GET /api/solicitudes
GET /api/solicitudes?estado=pendiente     (solo funcionario)
```

**200**

```json
{
  "success": true,
  "data": [
    {
      "id": "SOL-1004",
      "tramiteId": "permiso-evento",
      "vecinoNombre": "Vecino Demo",
      "fecha": "2026-09-18",
      "estado": "rechazado",
      "observaciones": "El plan de seguridad no cumple con el aforo declarado."
    },
    {
      "id": "SOL-1001",
      "tramiteId": "cert-residencia",
      "vecinoNombre": "Vecino Demo",
      "fecha": "2026-09-12",
      "estado": "pendiente"
    }
  ]
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
    "vecinoNombre": "Vecino Demo",
    "fecha": "2026-09-16",
    "estado": "aprobado",
    "observaciones": "Cuadrilla asignada para el 20 de septiembre."
  }
}
```

**404** `{ "success": false, "error": "Solicitud no encontrada" }`

> ⚠️ Hoy no se verifica que la solicitud pertenezca al vecino que la consulta. Ver
> [pendientes](GUIA_EQUIPO.md#problemas-conocidos).

### `PATCH /api/solicitudes/:folio`

Cambia el estado de una solicitud. **Solo funcionarios.** El servidor registra qué
funcionario hizo el cambio y, si el estado es `aprobado` o `rechazado`, la fecha de
resolución.

**Body**

```json
{ "estado": "aprobado", "observaciones": "Retirar en oficina de partes" }
```

| Campo | Requerido | Regla |
| --- | --- | --- |
| `estado` | Sí | Uno de los [valores permitidos](#valores-permitidos) |
| `observaciones` | No | Texto. **Si se omite se conservan las observaciones anteriores** |

**200**: la solicitud actualizada, con el mismo formato que el detalle.

**Errores**

| Código | `error` | Causa |
| --- | --- | --- |
| 400 | `estado debe ser uno de: …` | Falta o no es válido |
| 400 | `observaciones debe ser texto` | No es string |
| 403 | `No autorizado para este recurso` | El usuario es vecino |
| 404 | `Solicitud no encontrada` | El folio no existe |

---

## Reportes

### `GET /api/solicitudes/reportes`

Cantidad de solicitudes en cada estado. **Solo funcionarios.** Los cuatro estados vienen
siempre, en `0` si no hay ninguna.

**200**

```json
{ "success": true, "data": { "pendiente": 2, "en_revision": 1, "aprobado": 1, "rechazado": 1 } }
```

---

## Notificaciones

Todas requieren autenticación y trabajan sobre el usuario de la sesión.

### Objeto Notificación

| Campo | Tipo | Nota |
| --- | --- | --- |
| `id` | string | Id numérico como texto, p. ej. `"1"` |
| `titulo` | string | |
| `mensaje` | string | |
| `fecha` | string | `YYYY-MM-DD` |
| `leida` | boolean | |

### `GET /api/notificaciones`

De la más reciente a la más antigua.

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
      "leida": false
    }
  ]
}
```

### `PATCH /api/notificaciones/:id`

Marca una notificación como leída. No requiere body.

```
PATCH /api/notificaciones/1
```

**200** `{ "success": true, "data": { "message": "Notificación marcada como leída" } }`

**Errores**

| Código | `error` | Causa |
| --- | --- | --- |
| 400 | `ID inválido` | No es un entero positivo (p. ej. `abc` o `5abc`) |
| 404 | `Notificación no encontrada` | No existe |

> ⚠️ Hoy no se verifica que la notificación pertenezca al usuario. Ver
> [pendientes](GUIA_EQUIPO.md#problemas-conocidos).

---

## Autenticación (pendiente)

Estos endpoints los implementa Francisco. El contrato propuesto, para que el frontend
pueda prepararse, está en
[GUIA_EQUIPO.md](GUIA_EQUIPO.md#francisco--autenticación).

| Método | Ruta | Uso |
| --- | --- | --- |
| POST | `/api/auth/register` | Crear cuenta |
| POST | `/api/auth/login` | Iniciar sesión y obtener el token |
| GET | `/api/auth/me` | Datos del usuario de la sesión |

---

## Cómo probar la API

Con el servidor levantado (`npm run dev`):

**Navegador**: los `GET` públicos se abren directo, p. ej. http://localhost:3000/api/tramites.

**Terminal (curl)**

```bash
curl http://localhost:3000/api/solicitudes
curl -X POST http://localhost:3000/api/solicitudes -H "Content-Type: application/json" -d "{\"tramiteId\":\"cert-residencia\"}"
curl -X PATCH http://localhost:3000/api/notificaciones/1
```

**Herramientas gráficas**: Postman, Insomnia, Bruno o la extensión *REST Client* / *Thunder
Client* de VS Code.

**Ver el efecto en la base de datos**: phpMyAdmin (http://localhost/phpmyadmin con XAMPP),
base `muni_stodomingo`.

Después de probar, para volver a los datos semilla ver
[Puesta en marcha](../README.md#1-base-de-datos).
