import { body, validationResult, type ValidationChain } from 'express-validator';
import type { Request, Response, NextFunction } from 'express';

export const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      error: 'Datos de entrada inválidos',
      details: errors.array().map((error) => ({
        campo: error.type === 'field' ? error.path : 'body',
        mensaje: error.msg,
      })),
    });
    return;
  }
  next();
};

/** Rechaza HTML y atributos de eventos sin alterar caracteres normales como & o tildes. */
const noHtmlTags = (chain: ValidationChain): ValidationChain =>
  chain.custom((value: string) => {
    if (/<[^>]*>/i.test(value)) {
      throw new Error('El texto no puede contener etiquetas HTML');
    }
    if (/on\w+\s*=/i.test(value)) {
      throw new Error('El texto contiene contenido no permitido');
    }
    return true;
  });

const nombreRule = () => noHtmlTags(
  body('nombre')
    .isString().withMessage('El nombre es obligatorio').bail()
    .trim().notEmpty().withMessage('El nombre es obligatorio').bail()
    .isLength({ min: 2, max: 120 }).withMessage('El nombre debe tener entre 2 y 120 caracteres').bail()
);

const observacionesRule = () => noHtmlTags(
  body('observaciones')
    .optional()
    .isString().withMessage('observaciones debe ser texto').bail()
    .trim()
    .isLength({ max: 1000 }).withMessage('Las observaciones no pueden superar 1000 caracteres').bail()
);

const emailRule = () => body('email')
  .isString().withMessage('El email es obligatorio').bail()
  .trim().notEmpty().withMessage('El email es obligatorio').bail()
  .isEmail().withMessage('El formato del email no es válido').bail()
  .isLength({ max: 160 }).withMessage('El email no puede superar 160 caracteres')
  .toLowerCase();

const passwordRule = () => body('password')
  .isString().withMessage('La contraseña es obligatoria').bail()
  .notEmpty().withMessage('La contraseña es obligatoria').bail();

export const validateRegister = [
  nombreRule(),
  emailRule(),
  passwordRule()
    .isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres')
    .matches(/[A-Z]/).withMessage('La contraseña debe contener al menos una letra mayúscula')
    .matches(/[a-z]/).withMessage('La contraseña debe contener al menos una letra minúscula')
    .matches(/\d/).withMessage('La contraseña debe contener al menos un número')
    .custom((value: string) => Buffer.byteLength(value, 'utf8') <= 72)
    .withMessage('La contraseña no puede superar 72 bytes'),
  handleValidationErrors,
];

export const validateLogin = [emailRule(), passwordRule(), handleValidationErrors];

export const validateForgotPassword = [emailRule(), handleValidationErrors];

export const validateResetPassword = [
  body('token')
    .isString().withMessage('El enlace no es válido').bail()
    .trim()
    .matches(/^[a-f0-9]{64}$/i).withMessage('El enlace no es válido'),
  passwordRule()
    .isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres')
    .matches(/[A-Z]/).withMessage('La contraseña debe contener al menos una letra mayúscula')
    .matches(/[a-z]/).withMessage('La contraseña debe contener al menos una letra minúscula')
    .matches(/\d/).withMessage('La contraseña debe contener al menos un número')
    .custom((value: string) => Buffer.byteLength(value, 'utf8') <= 72)
    .withMessage('La contraseña no puede superar 72 bytes'),
  handleValidationErrors,
];

/** POST /api/auth/2fa/verificar */
export const validateVerificar2fa = [
  body('desafio')
    .isString().withMessage('Vuelve a ingresar con tu contraseña').bail()
    .matches(/^[a-f0-9]{64}$/).withMessage('Vuelve a ingresar con tu contraseña'),
  body('codigo')
    .isString().withMessage('Ingresa el código de 6 dígitos').bail()
    .trim()
    .matches(/^\d{6}$/).withMessage('El código tiene 6 dígitos'),
  handleValidationErrors,
];

/** PUT /api/auth/2fa */
export const validateCambiar2fa = [
  body('activo').isBoolean({ strict: true }).withMessage('activo debe ser true o false'),
  passwordRule()
    .custom((value: string) => Buffer.byteLength(value, 'utf8') <= 72)
    .withMessage('La contraseña no puede superar 72 bytes'),
  handleValidationErrors,
];

const telefonoRule = () => noHtmlTags(
  body('telefono')
    .optional({ values: 'falsy' })
    .isString().withMessage('El teléfono debe ser texto').bail()
    .trim()
    .isLength({ max: 30 }).withMessage('El teléfono no puede superar 30 caracteres').bail()
    .matches(/^[0-9+() -]+$/).withMessage('El teléfono solo puede tener números, espacios, +, paréntesis y guiones')
);

const direccionRule = () => noHtmlTags(
  body('direccion')
    .optional({ values: 'falsy' })
    .isString().withMessage('La dirección debe ser texto').bail()
    .trim()
    .isLength({ max: 255 }).withMessage('La dirección no puede superar 255 caracteres')
);

/** PUT /api/auth/me: reemplaza nombre, email y datos de contacto del usuario de la sesión. */
export const validateUpdateProfile = [
  nombreRule(),
  emailRule(),
  telefonoRule(),
  direccionRule(),
  // Solo se exige al cambiar el email; el controlador la compara con el hash.
  body('passwordActual')
    .optional()
    .isString().withMessage('La contraseña actual debe ser texto').bail()
    .custom((value: string) => Buffer.byteLength(value, 'utf8') <= 72)
    .withMessage('La contraseña no puede superar 72 bytes'),
  handleValidationErrors,
];

/** POST /api/solicitudes: trámite requerido y observaciones opcionales de texto plano. */
export const validateCrearSolicitud = [
  body('tramiteId')
    .isString().withMessage('tramiteId es requerido').bail()
    .trim().notEmpty().withMessage('tramiteId es requerido'),
  observacionesRule(),
  handleValidationErrors,
];

/** PATCH /api/solicitudes/:id: el controlador valida el estado y su transición. */
export const validateActualizarEstado = [
  body('estado')
    .isString().withMessage('estado es requerido').bail()
    .trim().notEmpty().withMessage('estado es requerido'),
  observacionesRule(),
  handleValidationErrors,
];
