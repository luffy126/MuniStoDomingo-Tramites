import { useRef, useState } from 'react';
import type { DragEvent, KeyboardEvent } from 'react';
import { IonBadge, IonButton, IonIcon, IonSpinner } from '@ionic/react';
import {
  alertCircleOutline, checkmarkCircle, cloudUploadOutline, documentOutline,
} from 'ionicons/icons';
import { validarArchivos } from '../../utils/documentos';
import type { RequisitoDetalle } from '../../services/tramiteService';

export interface ArchivoRequisito {
  archivo: File;
  nombre: string;
}

interface RequisitoArchivoProps {
  requisito: RequisitoDetalle;
  valor: ArchivoRequisito | null;
  onCambio: (valor: ArchivoRequisito | null) => void;
  deshabilitado?: boolean;
  /** Progreso de subida (0–100) mientras se envía la solicitud. */
  progreso?: number;
}

const formatearTamano = (bytes: number): string =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

/**
 * Zona para soltar (o elegir) el archivo de un requisito antes de iniciar el
 * trámite. Valida en el navegador tipo, extensión, firma real y tamaño, para
 * que el vecino corrija el archivo antes de enviar; el backend vuelve a validar.
 */
const RequisitoArchivo: React.FC<RequisitoArchivoProps> = ({
  requisito, valor, onCambio, deshabilitado = false, progreso,
}) => {
  const entrada = useRef<HTMLInputElement>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [validando, setValidando] = useState(false);
  const [error, setError] = useState('');
  const idBase = `requisito-${requisito.id}`;

  const revisar = async (archivos: File[]): Promise<void> => {
    if (archivos.length === 0 || deshabilitado) return;
    if (archivos.length > 1) {
      setError('Suelta un solo archivo para este requisito.');
      return;
    }
    setValidando(true);
    try {
      const { aceptados, errores } = await validarArchivos(archivos, 0);
      if (aceptados.length === 1) {
        setError('');
        onCambio({ archivo: aceptados[0].archivo, nombre: aceptados[0].nombre });
      } else {
        setError(errores[0]?.mensaje ?? 'No se pudo usar este archivo.');
      }
    } finally {
      setValidando(false);
    }
  };

  const alSoltar = (evento: DragEvent<HTMLDivElement>): void => {
    evento.preventDefault();
    setArrastrando(false);
    void revisar(Array.from(evento.dataTransfer.files));
  };

  const alTeclear = (evento: KeyboardEvent<HTMLDivElement>): void => {
    if (evento.key === 'Enter' || evento.key === ' ') {
      evento.preventDefault();
      entrada.current?.click();
    }
  };

  const clases = [
    'requisito-archivo__zona',
    arrastrando ? 'requisito-archivo__zona--arrastrando' : '',
    error ? 'requisito-archivo__zona--error' : '',
    valor ? 'requisito-archivo__zona--lista' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className="requisito-archivo">
      <div className="requisito-archivo__titulo">
        <span id={`${idBase}-titulo`}>{requisito.descripcion}</span>
        <IonBadge color={requisito.obligatorio ? 'primary' : 'medium'}>
          {requisito.obligatorio ? 'Obligatorio' : 'Opcional'}
        </IonBadge>
      </div>

      {valor ? (
        <div className={clases}>
          <IonIcon icon={progreso === 100 ? checkmarkCircle : documentOutline} color="success" aria-hidden="true" />
          <div className="requisito-archivo__detalle">
            <strong>{valor.nombre}</strong>
            <span>
              {formatearTamano(valor.archivo.size)}
              {progreso !== undefined ? ` · ${progreso < 100 ? `subiendo ${progreso}%` : 'adjuntado'}` : ' · listo para enviar'}
            </span>
          </div>
          {!deshabilitado ? (
            <IonButton fill="clear" size="small" onClick={() => { onCambio(null); setError(''); }}>
              Quitar
            </IonButton>
          ) : null}
        </div>
      ) : (
        <div
          className={clases}
          role="button"
          tabIndex={deshabilitado ? -1 : 0}
          aria-labelledby={`${idBase}-titulo`}
          aria-describedby={`${idBase}-ayuda${error ? ` ${idBase}-error` : ''}`}
          aria-disabled={deshabilitado}
          onClick={() => !deshabilitado && entrada.current?.click()}
          onKeyDown={alTeclear}
          onDragOver={(evento) => { evento.preventDefault(); if (!deshabilitado) setArrastrando(true); }}
          onDragLeave={() => setArrastrando(false)}
          onDrop={alSoltar}
        >
          {validando ? <IonSpinner name="dots" /> : <IonIcon icon={cloudUploadOutline} aria-hidden="true" />}
          <span id={`${idBase}-ayuda`}>
            {validando ? 'Revisando archivo…' : 'Arrastra el archivo aquí o toca para elegirlo (PDF, JPG o PNG, hasta 5 MB)'}
          </span>
        </div>
      )}

      {error ? (
        <p id={`${idBase}-error`} className="requisito-archivo__error" role="alert">
          <IonIcon icon={alertCircleOutline} aria-hidden="true" /> {error}
        </p>
      ) : null}

      <input
        ref={entrada}
        type="file"
        accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
        hidden
        onChange={(evento) => {
          void revisar(Array.from(evento.target.files ?? []));
          evento.target.value = '';
        }}
      />
    </div>
  );
};

export default RequisitoArchivo;
