const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const esEmailValido = (email: string): boolean => EMAIL_REGEX.test(email.trim());

export const esPasswordSegura = (password: string): boolean =>
  password.length >= 8 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password);

export const REQUISITO_PASSWORD =
  'Mínimo 8 caracteres, con mayúscula, minúscula y número.';
