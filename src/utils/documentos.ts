/** Reglas compartidas por la UI de adjuntos. El backend vuelve a validar todo. */
export const LIMITE_DOCUMENTOS = 10;
export const LIMITE_DOCUMENTO_BYTES = 5 * 1024 * 1024;

const EXTENSIONES_POR_TIPO: Record<string, string[]> = {
  'application/pdf': ['pdf'],
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
};

export const normalizarTipoDocumento = (tipo: string): string => {
  const normalizado = tipo.trim().toLowerCase();
  return normalizado === 'image/jpg' ? 'image/jpeg' : normalizado;
};

/** Firma real del archivo; no confiamos solo en `File.type` ni en la extensión. */
/** jsdom no expone `Blob.arrayBuffer`, así que se mantiene un fallback. */
const leerBytes = (blob: Blob): Promise<ArrayBuffer> => {
  if (typeof blob.arrayBuffer === 'function') return blob.arrayBuffer();
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(lector.result as ArrayBuffer);
    lector.onerror = () => reject(lector.error ?? new Error('No se pudo leer el archivo.'));
    lector.readAsArrayBuffer(blob);
  });
};

export const detectarTipoPorFirma = (buffer: ArrayBuffer): string | null => {
  const bytes = new Uint8Array(buffer);
  if (bytes.length >= 5 && String.fromCharCode(...bytes.subarray(0, 5)) === '%PDF-') {
    return 'application/pdf';
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    bytes.length >= 8 &&
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
      .every((byte, indice) => bytes[indice] === byte)
  ) {
    return 'image/png';
  }
  return null;
};

const esInvisible = (caracter: string): boolean => {
  const codigo = caracter.codePointAt(0) ?? 0;
  return (
    codigo <= 0x1f ||
    codigo === 0x7f ||
    (codigo >= 0x202a && codigo <= 0x202e) ||
    (codigo >= 0x2066 && codigo <= 0x2069)
  );
};

/** Nombre visible seguro: sin rutas, sin controles bidi y con extensión real. */
export const nombreSeguroDocumento = (nombre: string, tipo: string): string => {
  const extension = EXTENSIONES_POR_TIPO[tipo]?.[0] ?? '';
  const sinRutas = nombre.split(/[\\/]/).pop() ?? '';
  const limpio = sinRutas
    .normalize('NFKC')
    .split('')
    .filter((caracter) => !esInvisible(caracter))
    .join('')
    .replace(/[<>:"|?*]/g, '-')
    .trim();
  const ultimoPunto = limpio.lastIndexOf('.');
  const base = ultimoPunto > 0 ? limpio.slice(0, ultimoPunto) : limpio;
  return `${(base || 'documento').slice(0, 240)}${extension ? `.${extension}` : ''}`;
};

export interface ArchivoValidado {
  archivo: File;
  nombre: string;
  tipo: string;
}

export interface ErrorArchivo {
  nombre: string;
  mensaje: string;
}

export interface ResultadoValidacion {
  aceptados: ArchivoValidado[];
  errores: ErrorArchivo[];
}

/**
 * Valida el lote antes de enviarlo: tipo declarado, extensión, firma, tamaño y
 * cupo restante. Es una comodidad para el vecino; la autoridad es el backend.
 */
export const validarArchivos = async (
  archivos: File[],
  cantidadActual: number
): Promise<ResultadoValidacion> => {
  const aceptados: ArchivoValidado[] = [];
  const errores: ErrorArchivo[] = [];

  for (const archivo of archivos) {
    if (cantidadActual + aceptados.length >= LIMITE_DOCUMENTOS) {
      errores.push({
        nombre: archivo.name,
        mensaje: `Llegaste al máximo de ${LIMITE_DOCUMENTOS} documentos por solicitud.`,
      });
      break;
    }

    const tipo = normalizarTipoDocumento(archivo.type);
    const extension = (archivo.name.split('.').pop() ?? '').toLowerCase();
    if (EXTENSIONES_POR_TIPO[tipo] === undefined) {
      errores.push({ nombre: archivo.name, mensaje: 'Solo se admiten archivos PDF, JPG o PNG.' });
      continue;
    }
    if (!EXTENSIONES_POR_TIPO[tipo].includes(extension)) {
      errores.push({
        nombre: archivo.name,
        mensaje: 'La extensión no coincide con el archivo. Guarda el PDF como .pdf o la foto como .jpg/.png.',
      });
      continue;
    }
    if (archivo.size === 0) {
      errores.push({ nombre: archivo.name, mensaje: 'El archivo está vacío.' });
      continue;
    }
    if (archivo.size > LIMITE_DOCUMENTO_BYTES) {
      errores.push({ nombre: archivo.name, mensaje: 'El archivo no puede superar los 5 MB.' });
      continue;
    }

    const tipoReal = detectarTipoPorFirma(await leerBytes(archivo.slice(0, 8)));
    if (tipoReal !== tipo) {
      errores.push({
        nombre: archivo.name,
        mensaje: 'El contenido no coincide con lo que indica su nombre. Revisa el archivo y vuelve a intentarlo.',
      });
      continue;
    }

    aceptados.push({
      archivo,
      nombre: nombreSeguroDocumento(archivo.name, tipo),
      tipo,
    });
  }

  return { aceptados, errores };
};
