import { Resend } from 'resend';
import type { EstadoSolicitud } from '../types';

/**
 * Envío de correos transaccionales a través de Resend (https://resend.com).
 *
 * - Sin RESEND_API_KEY el servicio trabaja en "dry run": registra el correo en
 *   la consola y no envía nada, para que el backend funcione sin la clave.
 * - Ninguna función de este módulo lanza excepciones: un correo que no sale se
 *   registra y devuelve `false`, pero nunca interrumpe a quien lo pidió.
 * - EMAIL_REDIRECT_TO desvía TODOS los correos a una sola casilla. Hace falta
 *   mientras se use el remitente de prueba `onboarding@resend.dev`, porque con
 *   él Resend solo entrega al correo del dueño de la cuenta.
 */

/** Datos de un correo ya armado. */
export interface Email {
  to: string;
  subject: string;
  html: string;
  /** Versión de texto plano, para clientes sin HTML y para el dry run. */
  text: string;
}

/** Función que entrega un correo. Devuelve si el proveedor lo aceptó. */
export type EmailSender = (email: Email) => Promise<boolean>;

/** Tiempo máximo de espera por la respuesta de Resend. */
const TIMEOUT_MS = 10_000;

const REMITENTE_POR_DEFECTO = 'MuniStoDomingo <onboarding@resend.dev>';

/** En las pruebas automáticas no se ensucia la salida con los correos simulados. */
const silencioso = process.env.NODE_ENV === 'test';

const redactarToken = (texto: string): string =>
  texto.replace(/(token=)[^\s&]+/gi, '$1***');

const dryRunSender: EmailSender = async (email) => {
  if (!silencioso) {
    console.log(`📧 [DRY RUN] Email a ${email.to}: ${email.subject}`);
    console.log(`   ${redactarToken(email.text).replace(/\n+/g, ' | ')}`);
    // Solo para QA local explícito: nunca en producción ni por defecto.
    if (process.env.MOSTRAR_TOKEN_RECUPERACION === '1') {
      console.log(`   [QA] ${email.text.replace(/\n+/g, ' | ')}`);
    }
  }
  return true;
};

function crearResendSender(apiKey: string): EmailSender {
  const resend = new Resend(apiKey);
  const from = process.env.EMAIL_FROM?.trim() || REMITENTE_POR_DEFECTO;

  return async (email) => {
    const limite = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Resend no respondió en ${TIMEOUT_MS} ms`)), TIMEOUT_MS).unref();
    });
    const { error } = await Promise.race([
      resend.emails.send({ from, to: email.to, subject: email.subject, html: email.html, text: email.text }),
      limite,
    ]);

    if (error) {
      console.error(`❌ Resend rechazó el email a ${email.to}: ${error.name}: ${error.message}`);
      return false;
    }
    if (!silencioso) console.log(`📧 Email enviado a ${email.to}: ${email.subject}`);
    return true;
  };
}

function crearSenderPorDefecto(): EmailSender {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  // El valor de ejemplo de .env.example (re_xxx...) cuenta como "sin configurar".
  if (!apiKey || /^re_x+$/i.test(apiKey)) {
    if (!silencioso) {
      console.warn('⚠️  RESEND_API_KEY no configurada: los emails se registran en consola (dry run)');
    }
    return dryRunSender;
  }
  return crearResendSender(apiKey);
}

let sender: EmailSender = crearSenderPorDefecto();

/**
 * Reemplaza el transporte de correo. Existe para las pruebas automáticas, que
 * verifican el flujo sin llamar a Resend. Sin argumento restaura el original.
 */
export function setEmailSender(nuevo?: EmailSender): void {
  sender = nuevo ?? crearSenderPorDefecto();
}

/**
 * Envía un correo. Nunca lanza: si el envío falla devuelve `false` y deja el
 * motivo en el log del servidor.
 */
export async function sendEmail(email: Email): Promise<boolean> {
  const redirigirA = process.env.EMAIL_REDIRECT_TO?.trim();
  const final: Email = redirigirA
    ? { ...email, to: redirigirA, subject: `[para ${email.to}] ${email.subject}` }
    : email;

  try {
    return await sender(final);
  } catch (err) {
    console.error(`❌ No se pudo enviar el email a ${final.to}:`, err instanceof Error ? err.message : err);
    return false;
  }
}

/** Escapa texto para insertarlo en HTML. Todo dato que venga de la BD pasa por aquí. */
export function escapeHtml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Quita saltos de línea: un asunto no puede traerlos (inyección de cabeceras). */
const enUnaLinea = (texto: string): string => texto.replace(/[\r\n]+/g, ' ').trim();

type EstadoNotificable = Exclude<EstadoSolicitud, 'pendiente'>;

/** Texto y colores del distintivo de cada estado. Los pares cumplen contraste AA. */
const PRESENTACION: Record<EstadoNotificable, { etiqueta: string; fondo: string; texto: string }> = {
  en_revision: { etiqueta: 'En revisión', fondo: '#f2b705', texto: '#1f2a37' },
  aprobado: { etiqueta: 'Aprobada', fondo: '#2e7d4f', texto: '#ffffff' },
  rechazado: { etiqueta: 'Rechazada', fondo: '#b42318', texto: '#ffffff' },
};

/** Datos del aviso de cambio de estado. */
export interface AvisoEstado {
  destinatario: string;
  nombreVecino: string;
  folio: string;
  nombreTramite: string;
  estado: EstadoNotificable;
  observaciones?: string;
}

/**
 * Arma el correo de cambio de estado. Es una función pura (no envía nada) para
 * poder probar el contenido, en especial el escapado de los datos.
 */
export function construirEmailEstado(aviso: AvisoEstado): Email {
  const { etiqueta, fondo, texto } = PRESENTACION[aviso.estado];
  const observaciones = aviso.observaciones?.trim();
  const folio = enUnaLinea(aviso.folio);

  const bloqueObservaciones = observaciones
    ? `<p style="margin:16px 0 0;padding:12px;background:#f3f6f3;border-left:4px solid ${fondo};border-radius:4px;white-space:pre-line;"><strong>Observaciones:</strong> ${escapeHtml(observaciones)}</p>`
    : '';

  const html = `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1f2a37;">
  <div style="background:#0d1f61;color:#ffffff;padding:20px;border-radius:8px 8px 0 0;border-bottom:4px solid #d32f2f;text-align:center;">
    <h1 style="margin:0;font-size:20px;">Municipalidad de Santo Domingo</h1>
    <p style="margin:4px 0 0;font-size:14px;">Sistema de Trámites en Línea</p>
  </div>
  <div style="border:1px solid #dde3e8;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
    <h2 style="color:#0d1f61;margin:0 0 12px;font-size:18px;">Actualización de tu solicitud</h2>
    <p style="margin:0 0 8px;">Hola, ${escapeHtml(aviso.nombreVecino)}:</p>
    <p style="margin:0;">Tu solicitud <strong>${escapeHtml(folio)}</strong> del trámite <strong>${escapeHtml(aviso.nombreTramite)}</strong> cambió de estado:</p>
    <p style="text-align:center;margin:20px 0;">
      <span style="display:inline-block;padding:8px 24px;background:${fondo};color:${texto};border-radius:20px;font-weight:bold;font-size:16px;">${etiqueta}</span>
    </p>
    ${bloqueObservaciones}
    <hr style="border:none;border-top:1px solid #dde3e8;margin:24px 0;">
    <p style="color:#4f5655;font-size:13px;text-align:center;margin:0;">
      Este es un correo automático del Sistema de Trámites de la Municipalidad de Santo Domingo. Por favor, no respondas a este mensaje.
    </p>
  </div>
</div>`.trim();

  const text = [
    `Hola, ${aviso.nombreVecino}:`,
    `Tu solicitud ${folio} del trámite ${aviso.nombreTramite} cambió de estado: ${etiqueta}.`,
    ...(observaciones ? [`Observaciones: ${observaciones}`] : []),
    'Este es un correo automático de la Municipalidad de Santo Domingo. Por favor, no respondas a este mensaje.',
  ].join('\n\n');

  return {
    to: aviso.destinatario,
    subject: enUnaLinea(`Solicitud ${folio}: ${etiqueta}`),
    html,
    text,
  };
}

/** Envía al vecino el aviso de que su solicitud cambió de estado. Nunca lanza. */
export async function enviarNotificacionEstado(aviso: AvisoEstado): Promise<boolean> {
  return sendEmail(construirEmailEstado(aviso));
}

export interface Recuperacion {
  destinatario: string;
  nombre: string;
  enlace: string;
  minutosVigencia: number;
}

/** Arma el correo de recuperación. Separado del envío para poder probarlo sin red. */
export function construirEmailRecuperacion(datos: Recuperacion): Email {
  const enlace = datos.enlace.replace(/[\r\n]+/g, '');
  const html = `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1f2a37;">
  <div style="background:#0d1f61;color:#ffffff;padding:20px;border-radius:8px 8px 0 0;border-bottom:4px solid #d32f2f;text-align:center;">
    <h1 style="margin:0;font-size:20px;">Municipalidad de Santo Domingo</h1>
    <p style="margin:4px 0 0;font-size:14px;">Sistema de Trámites en Línea</p>
  </div>
  <div style="border:1px solid #dde3e8;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
    <h2 style="color:#0d1f61;margin:0 0 12px;font-size:18px;">Recupera tu contraseña</h2>
    <p>Hola, ${escapeHtml(datos.nombre)}:</p>
    <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta. El enlace vence en ${datos.minutosVigencia} minutos y se puede usar una sola vez.</p>
    <p style="text-align:center;margin:24px 0;">
      <a href="${escapeHtml(enlace)}" style="display:inline-block;padding:12px 24px;background:#0d1f61;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold;">Crear nueva contraseña</a>
    </p>
    <p style="font-size:13px;color:#4f5655;">Si el botón no funciona, copia este enlace en tu navegador:<br>${escapeHtml(enlace)}</p>
    <p style="font-size:13px;color:#4f5655;">Si no pediste este cambio, ignora el correo. Tu contraseña actual seguirá funcionando.</p>
    <hr style="border:none;border-top:1px solid #dde3e8;margin:24px 0;">
    <p style="color:#4f5655;font-size:13px;text-align:center;margin:0;">
      Este es un correo automático del Sistema de Trámites de la Municipalidad de Santo Domingo. Por favor, no respondas a este mensaje.
    </p>
  </div>
</div>`.trim();

  const text = [
    `Hola, ${datos.nombre}:`,
    `Recibimos una solicitud para restablecer la contraseña de tu cuenta. El enlace vence en ${datos.minutosVigencia} minutos y se puede usar una sola vez:`,
    enlace,
    'Si no pediste este cambio, ignora el correo. Tu contraseña actual seguirá funcionando.',
    'Este es un correo automático de la Municipalidad de Santo Domingo. Por favor, no respondas a este mensaje.',
  ].join('\n\n');

  return {
    to: datos.destinatario,
    subject: 'Recupera tu contraseña · Trámites Santo Domingo',
    html,
    text,
  };
}

export interface CodigoAcceso {
  destinatario: string;
  nombre: string;
  codigo: string;
  minutosVigencia: number;
}

/** Arma el correo con el código de verificación en dos pasos. */
export function construirEmailCodigo(datos: CodigoAcceso): Email {
  const codigo = datos.codigo.replace(/\D/g, '');
  const html = `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1f2a37;">
  <div style="background:#0d1f61;color:#ffffff;padding:20px;border-radius:8px 8px 0 0;border-bottom:4px solid #d32f2f;text-align:center;">
    <h1 style="margin:0;font-size:20px;">Municipalidad de Santo Domingo</h1>
    <p style="margin:4px 0 0;font-size:14px;">Sistema de Trámites en Línea</p>
  </div>
  <div style="border:1px solid #dde3e8;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
    <h2 style="color:#0d1f61;margin:0 0 12px;font-size:18px;">Tu código de acceso</h2>
    <p>Hola, ${escapeHtml(datos.nombre)}:</p>
    <p>Usa este código para terminar de ingresar. Vence en ${datos.minutosVigencia} minutos.</p>
    <p style="text-align:center;margin:24px 0;font-size:32px;letter-spacing:8px;font-weight:bold;color:#0d1f61;">${codigo}</p>
    <p style="font-size:13px;color:#4f5655;">Si no intentaste ingresar, alguien conoce tu contraseña: cámbiala desde "¿Olvidaste tu contraseña?".</p>
  </div>
</div>`.trim();
  const text = [
    `Hola, ${datos.nombre}:`,
    `Tu código de acceso es ${codigo}. Vence en ${datos.minutosVigencia} minutos.`,
    'Si no intentaste ingresar, alguien conoce tu contraseña: cámbiala desde "¿Olvidaste tu contraseña?".',
  ].join('\n\n');
  return { to: datos.destinatario, subject: 'Tu código de acceso · Trámites Santo Domingo', html, text };
}

/** Envía el código de verificación en dos pasos. Nunca lanza. */
export async function enviarCodigoAcceso(datos: CodigoAcceso): Promise<boolean> {
  return sendEmail(construirEmailCodigo(datos));
}

/** Envía el enlace de recuperación. Nunca lanza. */
export async function enviarRecuperacion(datos: Recuperacion): Promise<boolean> {
  return sendEmail(construirEmailRecuperacion(datos));
}
