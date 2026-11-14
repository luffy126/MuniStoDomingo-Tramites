import {
  bulbOutline,
  constructOutline,
  documentTextOutline,
  homeOutline,
  megaphoneOutline,
  trashBinOutline,
} from 'ionicons/icons';

const ICONOS: Record<string, string> = {
  bulbOutline,
  constructOutline,
  documentTextOutline,
  homeOutline,
  megaphoneOutline,
  trashBinOutline,
};

export const getIcono = (nombre: string): string => ICONOS[nombre] ?? documentTextOutline;
