const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const esEmailValido = (email: string): boolean => EMAIL_REGEX.test(email.trim());

export const esPasswordSegura = (password: string): boolean =>
  password.length >= 8 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password);

export const REQUISITO_PASSWORD =
  'Mínimo 8 caracteres, con mayúscula, minúscula y número.';

/**
 * Reglas de nombre compartidas por registro y perfil.
 *
 * Antes el registro exigía 3 caracteres y el perfil 2. Se unifica en 3 para no
 * aceptar un dato que el otro formulario rechazaría.
 */
export const validarNombre = (nombre: string): string | undefined => {
  const limpio = nombre.trim();
  if (limpio.length < 3) return 'Ingresa tu nombre completo (mínimo 3 caracteres).';
  if (limpio.length > 120) return 'El nombre no puede superar los 120 caracteres.';
  return undefined;
};

export const validarEmail = (email: string): string | undefined => {
  const limpio = email.trim();
  if (limpio === '') return 'El correo es obligatorio.';
  if (!esEmailValido(limpio)) return 'Ingresa un correo con formato válido.';
  if (limpio.length > 160) return 'El correo no puede superar los 160 caracteres.';
  return undefined;
};

/** Teléfono de contacto opcional: números, espacios, +, paréntesis y guiones. */
export const validarTelefono = (telefono: string): string | undefined => {
  const limpio = telefono.trim();
  if (limpio === '') return undefined;
  if (limpio.length > 30) return 'El teléfono no puede superar los 30 caracteres.';
  if (!/^[0-9+() -]+$/.test(limpio)) {
    return 'Usa solo números, espacios, +, paréntesis y guiones.';
  }
  return undefined;
};

/** Dirección opcional para el perfil. */
export const validarDireccion = (direccion: string): string | undefined => {
  const limpio = direccion.trim();
  if (limpio.length > 255) return 'La dirección no puede superar los 255 caracteres.';
  return undefined;
};

export const validarPassword = (password: string): string | undefined => {
  if (password === '') return 'La contraseña es obligatoria.';
  if (!esPasswordSegura(password)) return REQUISITO_PASSWORD;
  return undefined;
};

export const validarConfirmacion = (
  password: string,
  confirmacion: string,
): string | undefined => {
  if (confirmacion === '') return 'Confirma tu contraseña.';
  if (confirmacion !== password) return 'Las contraseñas no coinciden.';
  return undefined;
};
