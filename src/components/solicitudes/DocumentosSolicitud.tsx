import { useCallback, useEffect, useRef, useState } from 'react';
import {
  IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonIcon,
  IonItem, IonLabel, IonList, IonProgressBar, IonText, IonToast, useIonAlert,
} from '@ionic/react';
import {
  attachOutline, closeOutline, documentOutline, downloadOutline,
  refreshOutline, trashOutline,
} from 'ionicons/icons';
import {
  LIMITE_DOCUMENTOS, descargarDocumento, eliminarDocumento,
  getDocumentos, subirDocumento,
} from '../../services/tramiteService';
import type { DocumentoSolicitud } from '../../services/tramiteService';
import {
  validarArchivos,
  type ArchivoValidado,
  type ErrorArchivo,
} from '../../utils/documentos';
import { formatearFechaHora } from '../../utils/fechas';

interface DocumentosSolicitudProps {
  folio: string;
  puedeSubir: boolean;
}

interface ArchivoPendiente extends ArchivoValidado {
  id: string;
  progreso: number;
  estado: 'listo' | 'subiendo' | 'error';
  error?: string;
}

const formatearTamano = (bytes: number): string =>
  bytes < 1024
    ? `${bytes} B`
    : bytes < 1024 * 1024
      ? `${Math.round(bytes / 1024)} KB`
      : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

const nuevoId = (): string =>
  globalThis.crypto?.randomUUID?.() ?? `archivo-${Date.now()}-${Math.random()}`;

const mensajeDe = (error: unknown, respaldo: string): string =>
  error instanceof Error ? error.message : respaldo;

/** Descarga un Blob con el nombre visible del documento. */
const guardarBlob = (blob: Blob, nombre: string): void => {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  // Safari cancela la descarga si el object URL se libera en el mismo tick.
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
};

const DocumentosSolicitud: React.FC<DocumentosSolicitudProps> = ({ folio, puedeSubir }) => {
  const entradaArchivo = useRef<HTMLInputElement>(null);
  const [presentarAlerta] = useIonAlert();
  const [documentos, setDocumentos] = useState<DocumentoSolicitud[]>([]);
  const [pendientes, setPendientes] = useState<ArchivoPendiente[]>([]);
  const [erroresSeleccion, setErroresSeleccion] = useState<ErrorArchivo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const cargar = useCallback((): void => {
    setCargando(true);
    setError('');
    setDocumentos([]);
    setPendientes([]);
    setErroresSeleccion([]);
    void getDocumentos(folio)
      .then(setDocumentos)
      .catch((e: unknown) => setError(mensajeDe(e, 'No se pudieron cargar los documentos.')))
      .finally(() => setCargando(false));
  }, [folio]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const subirUno = async (pendiente: ArchivoPendiente): Promise<void> => {
    setPendientes((previos) => previos.map((item) =>
      item.id === pendiente.id
        ? { ...item, progreso: 0, estado: 'subiendo', error: undefined }
        : item));
    try {
      const documento = await subirDocumento(folio, pendiente.archivo, (porcentaje) => {
        setPendientes((previos) => previos.map((item) =>
          item.id === pendiente.id ? { ...item, progreso: porcentaje } : item));
      });
      setDocumentos((previos) => [...previos, documento]);
      setPendientes((previos) => previos.filter((item) => item.id !== pendiente.id));
      setMensaje(`Se adjuntó "${documento.nombre}".`);
    } catch (e) {
      setPendientes((previos) => previos.map((item) =>
        item.id === pendiente.id
          ? {
            ...item,
            estado: 'error',
            error: mensajeDe(e, 'No se pudo adjuntar el documento.'),
          }
          : item));
    }
  };

  const seleccionarArchivos = (files: FileList | null): void => {
    const archivos = Array.from(files ?? []);
    if (archivos.length === 0) return;
    setError('');
    setErroresSeleccion([]);

    void validarArchivos(archivos, documentos.length + pendientes.length)
      .then(({ aceptados, errores }) => {
        setErroresSeleccion(errores);
        // Se prepara el lote, pero nada sale del navegador hasta confirmar.
        aceptados.forEach((item) => {
          const pendiente: ArchivoPendiente = {
            ...item, id: nuevoId(), progreso: 0, estado: 'listo',
          };
          setPendientes((previos) => [...previos, pendiente]);
        });
      });
  };

  const subirTodos = (): void => {
    pendientes
      .filter((pendiente) => pendiente.estado === 'listo')
      .forEach((pendiente) => void subirUno(pendiente));
  };

  const descargar = (documento: DocumentoSolicitud): void => {
    setError('');
    void descargarDocumento(folio, documento.id)
      .then((blob) => guardarBlob(blob, documento.nombre))
      .catch((e: unknown) => setError(mensajeDe(e, 'No se pudo descargar el documento.')));
  };

  const confirmarEliminacion = (documento: DocumentoSolicitud): void => {
    void presentarAlerta({
      header: 'Quitar documento',
      message: `¿Quieres quitar "${documento.nombre}" de esta solicitud? Podrás adjuntarlo de nuevo.`,
      buttons: [
        { text: 'Conservar', role: 'cancel' },
        {
          text: 'Sí, quitar',
          role: 'destructive',
          handler: () => {
            void eliminarDocumento(folio, documento.id)
              .then(() => {
                setDocumentos((previos) => previos.filter((item) => item.id !== documento.id));
                setMensaje(`Se quitó "${documento.nombre}".`);
              })
              .catch((e: unknown) => setError(mensajeDe(e, 'No se pudo quitar el documento.')));
          },
        },
      ],
    });
  };

  const descartarPendiente = (id: string): void => {
    setPendientes((previos) => previos.filter((item) => item.id !== id));
  };

  const total = documentos.length + pendientes.length;
  const listos = pendientes.filter((pendiente) => pendiente.estado === 'listo');
  const subiendo = pendientes.some((pendiente) => pendiente.estado === 'subiendo');

  return (
    <IonCard>
      <IonCardHeader>
        <IonCardTitle>Documentos adjuntos</IonCardTitle>
      </IonCardHeader>
      <IonCardContent>
        {puedeSubir ? (
          <>
            <input
              ref={entradaArchivo}
              id="documentos-entrada"
              type="file"
              multiple
              hidden
              tabIndex={-1}
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              aria-describedby="documentos-ayuda documentos-error"
              onChange={(event) => {
                seleccionarArchivos(event.target.files);
                event.target.value = '';
              }}
            />
            <IonButton
              fill="outline"
              disabled={cargando || total >= LIMITE_DOCUMENTOS}
              aria-busy={subiendo}
              aria-describedby="documentos-ayuda documentos-error"
              aria-invalid={error !== '' || erroresSeleccion.length > 0}
              onClick={() => entradaArchivo.current?.click()}
            >
              <IonIcon icon={attachOutline} slot="start" aria-hidden="true" />
              {total >= LIMITE_DOCUMENTOS
                ? `Máximo de ${LIMITE_DOCUMENTOS} documentos`
                : 'Adjuntar documentos'}
            </IonButton>
            <IonText color="medium">
              <p id="documentos-ayuda">
                PDF, JPG o PNG · Hasta 5 MB por archivo · Máximo {LIMITE_DOCUMENTOS} documentos.
                Revisa el nombre y el tamaño: puedes quitarlo antes de subirlo o después.
              </p>
            </IonText>
            {listos.length > 0 ? (
              <IonButton
                expand="block"
                disabled={subiendo}
                aria-busy={subiendo}
                onClick={subirTodos}
              >
                Subir {listos.length} {listos.length === 1 ? 'documento' : 'documentos'}
              </IonButton>
            ) : null}
          </>
        ) : (
          <IonText color="medium">
            <p id="documentos-ayuda">Los documentos ya no se pueden modificar.</p>
          </IonText>
        )}

        {error !== '' ? (
          <IonText color="danger"><p id="documentos-error" role="alert">{error}</p></IonText>
        ) : <span id="documentos-error" />}
        {erroresSeleccion.map((fallo) => (
          <IonItem key={`${fallo.nombre}-${fallo.mensaje}`} className="documento-error">
            <IonLabel className="ion-text-wrap">
              <h3>{fallo.nombre}</h3>
              <p role="alert">{fallo.mensaje}</p>
            </IonLabel>
            <IonButton
              fill="clear"
              slot="end"
              aria-label={`Descartar aviso de ${fallo.nombre}`}
              onClick={() => setErroresSeleccion((previos) => previos.filter((item) => item !== fallo))}
            >
              <IonIcon icon={closeOutline} aria-hidden="true" />
            </IonButton>
          </IonItem>
        ))}

        {pendientes.map((pendiente) => (
          <IonItem key={pendiente.id} className="documento-pendiente">
            <IonIcon icon={documentOutline} slot="start" aria-hidden="true" />
            <IonLabel className="ion-text-wrap">
              <h3 className="documento-nombre">{pendiente.nombre}</h3>
              {pendiente.estado === 'listo' ? (
                <p>Listo para subir · {formatearTamano(pendiente.archivo.size)}</p>
              ) : pendiente.estado === 'subiendo' ? (
                <>
                  <p>Subiendo… {pendiente.progreso}%</p>
                  <IonProgressBar
                    value={pendiente.progreso / 100}
                    aria-label={`Subiendo ${pendiente.nombre}`}
                  />
                </>
              ) : (
                <p role="alert">{pendiente.error}</p>
              )}
            </IonLabel>
            {pendiente.estado === 'listo' ? (
              <IonButton
                fill="clear"
                slot="end"
                aria-label={`Quitar ${pendiente.nombre} antes de subirlo`}
                onClick={() => descartarPendiente(pendiente.id)}
              >
                <IonIcon icon={closeOutline} aria-hidden="true" />
              </IonButton>
            ) : pendiente.estado === 'error' ? (
              <>
                <IonButton
                  fill="clear"
                  slot="end"
                  aria-label={`Reintentar ${pendiente.nombre}`}
                  onClick={() => void subirUno(pendiente)}
                >
                  <IonIcon icon={refreshOutline} aria-hidden="true" />
                </IonButton>
                <IonButton
                  fill="clear"
                  slot="end"
                  aria-label={`Descartar ${pendiente.nombre}`}
                  onClick={() => descartarPendiente(pendiente.id)}
                >
                  <IonIcon icon={closeOutline} aria-hidden="true" />
                </IonButton>
              </>
            ) : null}
          </IonItem>
        ))}

        {cargando ? (
          <p role="status">Cargando documentos…</p>
        ) : documentos.length === 0 && pendientes.length === 0 ? (
          <IonText color="medium"><p>No hay documentos adjuntos.</p></IonText>
        ) : (
          <IonList lines="full" aria-label="Documentos ya adjuntados">
            {documentos.map((documento) => (
              <IonItem key={documento.id}>
                <IonIcon icon={documentOutline} slot="start" aria-hidden="true" />
                <IonLabel className="ion-text-wrap">
                  <h3 className="documento-nombre">{documento.nombre}</h3>
                  {documento.requisito ? <p className="documento-requisito">{documento.requisito}</p> : null}
                  <p>
                    {formatearTamano(documento.tamano)} · {formatearFechaHora(documento.fecha)}
                    {documento.subidoPor ? ` · ${documento.subidoPor}` : ''}
                  </p>
                </IonLabel>
                <IonButton
                  fill="clear"
                  slot="end"
                  aria-label={`Descargar ${documento.nombre}`}
                  onClick={() => descargar(documento)}
                >
                  <IonIcon icon={downloadOutline} aria-hidden="true" />
                </IonButton>
                {puedeSubir ? (
                  <IonButton
                    fill="clear"
                    slot="end"
                    color="danger"
                    aria-label={`Quitar ${documento.nombre}`}
                    onClick={() => confirmarEliminacion(documento)}
                  >
                    <IonIcon icon={trashOutline} aria-hidden="true" />
                  </IonButton>
                ) : null}
              </IonItem>
            ))}
          </IonList>
        )}
      </IonCardContent>
      <div className="sr-only" role="status" aria-live="polite">{mensaje}</div>
      <IonToast
        isOpen={mensaje !== ''}
        message={mensaje}
        duration={3000}
        color="success"
        onDidDismiss={() => setMensaje('')}
      />
    </IonCard>
  );
};

export default DocumentosSolicitud;
