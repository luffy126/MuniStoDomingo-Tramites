import { describe, expect, it } from 'vitest';
import {
  LIMITE_DOCUMENTO_BYTES,
  detectarTipoPorFirma,
  nombreSeguroDocumento,
  validarArchivos,
} from './documentos';

const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);
const JPG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const aArrayBuffer = (bytes: Uint8Array): ArrayBuffer =>
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;

const archivo = (bytes: Uint8Array, nombre: string, tipo: string): File =>
  new File([aArrayBuffer(bytes)], nombre, { type: tipo });

describe('validación de documentos del vecino', () => {
  it('detecta la firma real y no la extensión declarada', () => {
    expect(detectarTipoPorFirma(aArrayBuffer(PDF))).toBe('application/pdf');
    expect(detectarTipoPorFirma(aArrayBuffer(JPG))).toBe('image/jpeg');
    expect(detectarTipoPorFirma(aArrayBuffer(PNG))).toBe('image/png');
    expect(detectarTipoPorFirma(aArrayBuffer(new Uint8Array([1, 2, 3])))).toBeNull();
  });

  it('fuerza la extensión según el tipo y elimina caracteres de control', () => {
    expect(nombreSeguroDocumento('factura.html', 'application/pdf')).toBe('factura.pdf');
    expect(nombreSeguroDocumento('foto.png', 'image/jpeg')).toBe('foto.jpg');
    expect(nombreSeguroDocumento('a\u202eb', 'image/png')).toBe('ab.png');
    expect(nombreSeguroDocumento('../salto.pdf', 'application/pdf')).toBe('salto.pdf');
  });

  it('acepta un PDF real con extensión .pdf', async () => {
    const resultado = await validarArchivos([archivo(PDF, 'certificado.pdf', 'application/pdf')], 0);
    expect(resultado.errores).toHaveLength(0);
    expect(resultado.aceptados).toHaveLength(1);
    expect(resultado.aceptados[0].nombre).toBe('certificado.pdf');
  });

  it('rechaza un falso PDF con extensión .pdf', async () => {
    const falso = archivo(new TextEncoder().encode('no soy un pdf'), 'contrato.pdf', 'application/pdf');
    const resultado = await validarArchivos([falso], 0);
    expect(resultado.aceptados).toHaveLength(0);
    expect(resultado.errores[0].mensaje).toContain('contenido no coincide');
  });

  it('rechaza una extensión engañosa aunque el MIME diga PDF', async () => {
    const resultado = await validarArchivos([archivo(PDF, 'contrato.html', 'application/pdf')], 0);
    expect(resultado.aceptados).toHaveLength(0);
    expect(resultado.errores[0].mensaje).toContain('extensión no coincide');
  });

  it('rechaza formatos de cámara no admitidos con un mensaje claro', async () => {
    const resultado = await validarArchivos([
      archivo(new Uint8Array([0, 0, 0, 0, 0x66, 0x74, 0x79, 0x70]), 'foto.heic', 'image/heic'),
    ], 0);
    expect(resultado.aceptados).toHaveLength(0);
    expect(resultado.errores[0].mensaje).toContain('PDF, JPG o PNG');
  });

  it('rechaza archivos vacíos y mayores a 5 MB', async () => {
    const vacio = await validarArchivos([archivo(new Uint8Array(), 'vacio.pdf', 'application/pdf')], 0);
    expect(vacio.errores[0].mensaje).toContain('vacío');

    const grande = archivo(PDF, 'grande.pdf', 'application/pdf');
    Object.defineProperty(grande, 'size', { value: LIMITE_DOCUMENTO_BYTES + 1 });
    const resultado = await validarArchivos([grande], 0);
    expect(resultado.errores[0].mensaje).toContain('5 MB');
  });

  it('respeta el cupo de 10 documentos antes de subir', async () => {
    const lote = Array.from({ length: 11 }, (_, indice) =>
      archivo(PDF, `doc-${indice}.pdf`, 'application/pdf'));
    const resultado = await validarArchivos(lote, 0);
    expect(resultado.aceptados).toHaveLength(10);
    expect(resultado.errores[0].mensaje).toContain('máximo de 10');
  });
});
