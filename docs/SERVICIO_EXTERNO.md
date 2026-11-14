# Integración con un servicio externo: correos con Resend

## Qué hace

Cuando un funcionario cambia el estado de una solicitud (`PATCH /api/solicitudes/:folio`), el
vecino dueño recibe, además del aviso dentro de la app, un **correo electrónico**. El envío
lo hace [Resend](https://resend.com), una API de correo transaccional.

## Configuración

Variables en `.env` (ver `.env.example`):

| Variable | Obligatoria | Para qué |
|---|---|---|
| `RESEND_API_KEY` | No | Clave de https://resend.com/api-keys. Sin ella el servicio trabaja en *dry run* |
| `EMAIL_FROM` | No | Remitente. Por defecto `MuniStoDomingo <onboarding@resend.dev>` |
| `EMAIL_REDIRECT_TO` | No | Desvía **todos** los correos a una casilla. El asunto indica el destinatario original |

Pasos: crear una cuenta en Resend (plan gratuito: 100 correos al día), generar una clave y
ponerla en `RESEND_API_KEY`. Reiniciar el servidor.

### Limitación del remitente de prueba (leer antes de la demo)

Con `onboarding@resend.dev` Resend **solo entrega al correo del dueño de la cuenta**. Un
correo dirigido a `vecino@test.com` (o a cualquier otro vecino) es rechazado con un error 403
y queda registrado en el log; el cambio de estado se guarda igual. Hay dos salidas:

1. **Para la demo:** definir `EMAIL_REDIRECT_TO` con el correo de la cuenta de Resend. Todos
   los avisos llegan a esa casilla con el asunto `[para vecino@test.com] Solicitud ...`.
2. **Para uso real:** verificar un dominio propio en https://resend.com/domains y usarlo en
   `EMAIL_FROM` (por ejemplo `Trámites <no-responder@midominio.cl>`).

## Modo dry run

Sin `RESEND_API_KEY` (o con el valor de ejemplo `re_xxx...`) no se envía nada: el correo se
escribe en la consola del servidor.

```
⚠️  RESEND_API_KEY no configurada: los emails se registran en consola (dry run)
📧 [DRY RUN] Email a vecino@test.com: Solicitud SOL-1010: En revisión
   Hola, Vecino Demo: | Tu solicitud SOL-1010 del trámite Certificado de residencia cambió de estado: En revisión. | Observaciones: Revisando documentos | ...
```

## Flujo

1. El funcionario envía `PATCH /api/solicitudes/:folio`.
2. En una transacción se valida la transición, se actualiza la solicitud y se crea el aviso
   dentro de la app.
3. **Después del commit** se lanza el envío del correo, sin esperar su resultado. La
   respuesta HTTP sale de inmediato.
4. En segundo plano se busca el correo del vecino, se arma el mensaje y se llama a Resend
   (con un tiempo máximo de 10 segundos).

## Manejo de errores

El correo nunca afecta al cambio de estado:

| Situación | Qué pasa |
|---|---|
| Resend rechaza el correo (clave inválida, destinatario no permitido, cuota) | Se registra `❌ Resend rechazó el email a ...: <motivo>` y se sigue |
| Resend no responde o no hay red | Se corta a los 10 s, se registra y se sigue |
| Falla la búsqueda del vecino en la BD | Se registra y se sigue |
| El cambio de estado es inválido (409) o el folio no existe (404) | No se envía ningún correo |

Lo que **no** hay (decisión consciente por el alcance del curso): reintentos, cola de envíos
ni registro en la base de qué correos salieron. Un correo que falla se pierde; el aviso
dentro de la app es el respaldo.

## Contenido del correo

- Encabezado con el nombre de la Municipalidad y sus colores.
- Saludo con el nombre del vecino, folio y nombre del trámite.
- Distintivo con el nuevo estado: En revisión (amarillo), Aprobada (verde), Rechazada (rojo).
- Observaciones del funcionario, si las escribió.
- Versión en texto plano, para clientes de correo sin HTML.

Todos los datos que vienen de la base (nombre, trámite, observaciones) se **escapan** antes
de insertarlos en el HTML, y el asunto no admite saltos de línea.

## Pruebas

- `tests/unit.test.cjs`: contenido del correo por estado, escapado de HTML, asunto sin saltos
  de línea, dry run y transporte que falla.
- `tests/api.test.cjs` ("Aviso por email al cambiar el estado"): contra la base real, con el
  transporte reemplazado por uno de prueba (`setEmailSender`). Verifica que el correo va al
  dueño, que un fallo del proveedor no impide guardar el cambio, que un 409/404 no envía
  nada y que `EMAIL_REDIRECT_TO` funciona.

Ninguna prueba automática llama a Resend. La entrega real hay que comprobarla a mano con una
clave válida (ver "Limitación del remitente de prueba").

## Archivos

- `src/services/emailService.ts`: cliente de Resend, dry run y plantilla del correo.
- `src/services/solicitudService.ts`: `avisarPorEmail`, llamado desde `updateEstado` tras el commit.
