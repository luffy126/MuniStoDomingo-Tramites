# Medidas de Seguridad — MuniStoDomingo API

## Autenticación y autorización

- JWT firmado con HS256. La verificación permite únicamente ese algoritmo.
- `JWT_SECRET` es obligatorio: debe tener al menos 32 caracteres después de recortar espacios y no puede contener el texto de ejemplo `cambiar`.
- Los tokens expiran según `JWT_EXPIRES_IN` (por defecto, `24h`). La aplicación rechaza al arrancar una duración que no genere una vigencia positiva.
- Las rutas protegidas exigen `Authorization: Bearer <token>`. El middleware comprueba la firma, la expiración y los claims: `id` entero positivo seguro, `email` no vacío, `rol` permitido y `exp` numérico finito.
- El middleware de roles restringe la creación y cancelación de solicitudes a vecinos, y los cambios de estado y reportes a funcionarios.
- El registro público siempre asigna el rol `vecino`, aunque el cliente envíe otro rol.
- El perfil se consulta y actualiza usando el identificador del token; el cliente no elige otro usuario en el cuerpo.

## Protección de contraseñas

- Bcrypt genera hashes con 10 rounds de salt.
- El registro exige al menos 8 caracteres, una mayúscula, una minúscula y un número.
- La contraseña de registro no puede superar 72 bytes UTF-8, límite de bcrypt. Se cuentan bytes, no solo caracteres.
- Las respuestas de autenticación y perfil contienen una selección explícita de campos públicos. `password_hash` no se expone.
- Un correo inexistente y una contraseña incorrecta producen el mismo error `401 Credenciales inválidas`.

## Headers HTTP con Helmet

`helmet()` se aplica antes de CORS y de las rutas. Entre los headers configurados se incluyen:

- `X-Content-Type-Options: nosniff`.
- `X-Frame-Options: SAMEORIGIN`.
- `Strict-Transport-Security` (HSTS).
- `Content-Security-Policy`.
- `Referrer-Policy` y las políticas de aislamiento incluidas por defecto en Helmet.
- `X-XSS-Protection: 0`, valor que desactiva el filtro XSS obsoleto de algunos navegadores; la protección se apoya en CSP y en el tratamiento seguro del contenido.

Además, Express tiene deshabilitado `X-Powered-By`.

### HTTPS y despliegue detrás de un proxy

HSTS indica al navegador que use HTTPS en conexiones posteriores a un acceso HTTPS válido. **No redirige la primera petición HTTP ni convierte el servidor Express en un servidor TLS.** El despliegue público debe terminar TLS y redirigir HTTP a HTTPS en el proxy o balanceador.

La aplicación conserva `trust proxy` deshabilitado. Así, los límites usan la dirección del socket y no confían directamente en un `X-Forwarded-For` enviado por el cliente. Si se despliega detrás de un proxy, se debe configurar la confianza para los proxies o saltos reales de esa infraestructura y evitar acceso directo al backend que permita saltarse esa frontera. Una configuración incorrecta puede agrupar a todos los clientes bajo una sola IP o permitir falsificarla.

## Rate limiting

| Alcance | Límite por IP | Ventana |
| --- | --- | --- |
| API general | 100 peticiones | 1 minuto |
| `/api/auth` | 10 peticiones | 15 minutos |

- El límite general se ejecuta antes de las rutas. El límite de autenticación se monta en todo `/api/auth`, incluyendo registro, login y perfil (`/me`). Ambos límites se aplican a esas rutas.
- CORS y el parser JSON se ejecutan antes de los límites: los preflight que resuelve CORS y los cuerpos que el parser rechaza no llegan a incrementar los contadores.
- Los intentos admitidos cuentan aunque fallen las credenciales o la validación. No se excluyen las respuestas correctas.
- Al superar un límite se responde `429` con `{ success: false, error: "..." }` y `Retry-After`, expresado en segundos.
- Se utiliza el formato estándar `draft-7`: `RateLimit` y `RateLimit-Policy`. No se envían headers heredados `X-RateLimit-*`.
- Los contadores usan el almacén en memoria de `express-rate-limit`: son independientes por proceso y se reinician al reiniciar el servidor. Un despliegue con varias instancias necesita un almacén compartido para aplicar un límite común.

## Validación y tratamiento de entradas

`express-validator` se utiliza en registro, login, actualización de perfil y creación y actualización de estado de solicitudes. Las demás comprobaciones, como los estados permitidos y los identificadores de notificaciones, también se validan en sus controladores.

| Campo | Comprobaciones |
| --- | --- |
| `nombre` en registro y perfil | Texto, recorte de espacios, entre 2 y 120 caracteres, rechazo de etiquetas HTML y patrones de atributos de eventos. |
| `email` en registro, login y perfil | Texto no vacío, formato de email, máximo 160 caracteres, recorte y normalización a minúsculas. |
| `password` en registro | Texto no vacío y reglas de complejidad y longitud indicadas arriba. |
| `password` en login | Texto no vacío. |
| `tramiteId` al crear una solicitud | Texto obligatorio después del recorte; el controlador comprueba que el trámite exista y esté activo. |
| `estado` al actualizar una solicitud | Texto obligatorio después del recorte; el controlador exige un estado conocido y el servicio valida la transición. |
| `observaciones` al crear o actualizar estado | Opcional; si se envía, debe ser texto, se recortan espacios, máximo 1000 caracteres, sin etiquetas HTML ni patrones de atributos de eventos. |

El rechazo de HTML usa una regla reutilizable que identifica etiquetas (`/<[^>]*>/i`) y patrones como `onerror=` (`/on\w+\s*=/i`). Se comprueba el tipo antes de aplicar sanitizadores de texto para evitar convertir objetos, arreglos o números en strings válidos. Las entradas inválidas reciben `400`, con `error: "Datos de entrada inválidos"` y detalles por campo.

El texto válido conserva acentos, apóstrofes y `&`; por ejemplo, `Pérez & Asociados` no se transforma en entidades HTML. Esta validación rechaza contenido al recibirlo y no modifica registros anteriores. Los consumidores deben mostrar estos campos como texto, sin interpretarlos como HTML ni ejecutar su contenido: la regla de rechazo no es un analizador completo de HTML o JavaScript.

El body JSON está limitado a `16kb`. El manejador de errores devuelve errores de cliente para JSON inválido, cuerpos demasiado grandes y codificaciones no admitidas, sin exponer detalles internos.

## Prevención de SQL injection

Los valores externos se pasan como parámetros `?` a `execute` de mysql2. Los servicios no interpolan datos del usuario dentro del SQL. Algunas consultas reutilizan fragmentos SQL constantes definidos por el servidor; los valores de filtros e identificadores siguen parametrizados.

## Control de acceso a datos

- El listado de solicitudes de un vecino filtra por su identificador autenticado.
- El detalle comprueba el dueño antes de devolver una solicitud a un vecino.
- La cancelación exige folio, dueño y estado `pendiente` en el mismo `DELETE`, evitando borrar solicitudes ajenas o ya resueltas.
- Las notificaciones se listan por el usuario autenticado. Tanto el `UPDATE` como el `SELECT` para marcarlas como leídas incluyen `usuario_id`.
- Los recursos inexistentes y los recursos ajenos producen la misma respuesta `404`, sin revelar su existencia.
- Los funcionarios acceden al listado general, reportes y cambios de estado mediante las restricciones de roles correspondientes.
- Los cambios de estado y la creación de su notificación ocurren en una transacción. El estado actual se lee con `FOR UPDATE` para validar transiciones concurrentes.

## CORS

- El origen permitido se fija con `FRONTEND_URL`; si falta, se utiliza `http://localhost:8100`.
- Las credenciales CORS se habilitan para ese origen específico; no se usa `*`.
- CORS controla el acceso desde navegadores. La autorización de los endpoints protegidos se realiza con JWT, roles y comprobaciones de dueño.

## Comprobación manual

Con las dependencias instaladas, un `.env` válido y MariaDB/MySQL disponible con `schema.sql` cargado:

```bash
npm run build
npm run dev
```

En otra terminal, comprobar los headers de seguridad y del límite general:

```bash
curl -I http://localhost:3000/api/health
```

Comprobar el rechazo de HTML antes de consultar la base de datos:

```bash
curl -i -X POST http://localhost:3000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"nombre":"<script>alert(1)</script>","email":"xss@example.com","password":"Test1234"}'
```

La respuesta esperada es `400`, con un detalle de validación de `nombre` que indica que el texto no puede contener etiquetas HTML.

Para probar el límite de autenticación con una ventana nueva (reiniciar el servidor antes de ejecutar este bloque para no contar la prueba anterior), enviar un login inválido que no necesite consultar MariaDB:

```bash
for i in $(seq 1 11); do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST http://localhost:3000/api/auth/login \
    -H 'Content-Type: application/json' \
    -d '{}'
done
```

Se esperan diez respuestas `400` y una `429`. Un login con formato válido y credenciales incorrectas devuelve `401` antes de alcanzar el límite. Las pruebas de registro, login y perfil comparten contador por IP.

Para comprobar el límite general con una ventana nueva:

```bash
for i in $(seq 1 101); do
  curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/health
done
```

Se esperan cien respuestas `200` y una `429`, siempre que la secuencia completa ocurra dentro de la misma ventana de un minuto y no haya otras peticiones desde esa IP.

## Pruebas automatizadas

```bash
npm test
```

Este comando compila TypeScript antes de ejecutar `tests/*.test.cjs`, que cargan el código de `dist/`. Las pruebas HTTP de autenticación (`auth.test.cjs`) y seguridad (`security.test.cjs`) sustituyen la persistencia; las pruebas de integración de `api.test.cjs` requieren una base MySQL/MariaDB real.

Para ejecutar únicamente las pruebas que no necesitan base de datos:

```bash
npm run build
node --test tests/auth.test.cjs tests/security.test.cjs
```

La suite de integración utiliza las variables `TEST_DB_HOST`, `TEST_DB_PORT`, `TEST_DB_USER`, `TEST_DB_PASSWORD` y `TEST_DB_NAME` (por defecto, `muni_stodomingo_test`). **Borra y recrea exclusivamente esa base de pruebas**, cuyo nombre debe terminar en `_test`; no usa `DB_NAME` del entorno de desarrollo. Los resultados de una ejecución deben distinguir las pruebas HTTP sin base real de la validación de integración con MariaDB.
