/**
 * Lleva el foco al primer campo marcado con aria-invalid="true".
 * Ionic expone setFocus() en el host del input; si no, se usa focus() nativo.
 */
export const enfocarPrimerError = (contenedor: HTMLElement | null): void => {
  if (contenedor === null) return;
  const campo = contenedor.querySelector<HTMLElement>('[aria-invalid="true"]');
  if (campo === null) return;
  const conIonic = campo as HTMLElement & { setFocus?: () => Promise<void> };
  if (typeof conIonic.setFocus === 'function') {
    void conIonic.setFocus();
    return;
  }
  campo.focus();
};
