import { body, validationResult } from 'express-validator';
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

const emailRule = () => body('email')
  .isString().withMessage('El email es obligatorio').bail()
  .trim().notEmpty().withMessage('El email es obligatorio').bail()
  .isEmail().withMessage('El formato del email no es válido')
  .toLowerCase();

const passwordRule = () => body('password')
  .isString().withMessage('La contraseña es obligatoria').bail()
  .notEmpty().withMessage('La contraseña es obligatoria').bail();

export const validateRegister = [
  body('nombre').isString().withMessage('El nombre es obligatorio').bail()
    .trim().notEmpty().withMessage('El nombre es obligatorio').bail()
    .isLength({ min: 2, max: 120 }).withMessage('El nombre debe tener entre 2 y 120 caracteres'),
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
