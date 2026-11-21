import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  IonBadge, IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle,
  IonContent, IonIcon, IonItem, IonLabel, IonList, IonListHeader, IonPage,
  IonSpinner, IonText, IonTextarea, IonToast,
} from '@ionic/react';
import { checkmarkCircleOutline, createOutline, documentAttachOutline, warningOutline } from 'ionicons/icons';
import Header from '../../components/common/Header';
import BotonCargando from '../../components/common/BotonCargando';
import RequisitoArchivo from '../../components/tramites/RequisitoArchivo';
import type { ArchivoRequisito } from '../../components/tramites/RequisitoArchivo';
import {
  ETIQUETA_CATEGORIA, crearSolicitud, getTramiteById, subirDocumento,
} from '../../services/tramiteService';
import type { Solicitud, Tramite } from '../../services/tramiteService';
import { getIcono } from '../../utils/iconos';

const TramiteDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [tramite, setTramite] = useState<Tramite>();
  const [cargando, setCargando] = useState(true);
  const [observaciones, setObservaciones] = useState('');
  const [archivos, setArchivos] = useState<Record<string, ArchivoRequisito | null>>({});
  const [progreso, setProgreso] = useState<Record<string, number>>({});
  const [intentoEnvio, setIntentoEnvio] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [tipoMensaje, setTipoMensaje] = useState<'success' | 'danger'>('success');
  const [enviando, setEnviando] = useState(false);
  const [solicitudCreada, setSolicitudCreada] = useState<Solicitud | null>(null);
  const [fallidos, setFallidos] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    setCargando(true);
    if (!id) {
      setTramite(undefined);
      setCargando(false);
      return () => { cancelled = true; };
    }
    void getTramiteById(id)
      .then((item) => { if (!cancelled) setTramite(item); })
      .catch((error: unknown) => { if (!cancelled) setMensaje(error instanceof Error ? error.message : 'No se pudo cargar el trámite.'); })
      .finally(() => { if (!cancelled) setCargando(false); });
    return () => { cancelled = true; };
  }, [id]);

  const documentos = useMemo(
    () => tramite?.requisitosDetalle.filter((r) => r.tipo === 'documento') ?? [],
    [tramite],
  );
  const datos = useMemo(
    () => tramite?.requisitosDetalle.filter((r) => r.tipo === 'dato') ?? [],
    [tramite],
  );

  // Verificación previa: no se crea la solicitud si falta un documento obligatorio
  // o si el trámite pide datos y las observaciones están vacías.
  const faltantes = documentos.filter((r) => r.obligatorio && !archivos[r.id]);
  const faltanDatos = datos.some((r) => r.obligatorio) && observaciones.trim() === '';
  const listo = faltantes.length === 0 && !faltanDatos;

  const iniciarTramite = async (): Promise<void> => {
    if (!tramite) return;
    setIntentoEnvio(true);
    if (!listo) {
      setTipoMensaje('danger');
      setMensaje(faltantes.length > 0
        ? `Falta adjuntar: ${faltantes.map((r) => r.descripcion).join(', ')}.`
        : 'Completa las observaciones con los datos que pide el trámite.');
      return;
    }

    setEnviando(true);
    try {
      const creada = await crearSolicitud({
        tramiteId: tramite.id,
        observaciones: observaciones.trim() || undefined,
      });

      // La solicitud ya existe: los archivos se suben uno a uno y, si alguno
      // falla, se avisa para adjuntarlo desde el detalle sin perder el resto.
      const noSubidos: string[] = [];
      for (const requisito of documentos) {
        const elegido = archivos[requisito.id];
        if (!elegido) continue;
        try {
          await subirDocumento(
            creada.id,
            elegido.archivo,
            (porcentaje) => setProgreso((previo) => ({ ...previo, [requisito.id]: porcentaje })),
            requisito.id,
          );
          setProgreso((previo) => ({ ...previo, [requisito.id]: 100 }));
        } catch {
          noSubidos.push(requisito.descripcion);
        }
      }

      setFallidos(noSubidos);
      setSolicitudCreada(creada);
      setObservaciones('');
      setTipoMensaje(noSubidos.length === 0 ? 'success' : 'danger');
      setMensaje(noSubidos.length === 0
        ? 'Solicitud enviada con sus documentos.'
        : 'La solicitud se creó, pero faltó adjuntar algunos documentos.');
    } catch (error) {
      setTipoMensaje('danger');
      setMensaje(error instanceof Error ? error.message : 'No se pudo enviar la solicitud.');
    } finally {
      setEnviando(false);
    }
  };

  if (cargando) return <IonPage><Header titulo="Cargando trámite…" rutaVolver="/vecino/dashboard" /><IonContent className="ion-text-center ion-padding"><IonSpinner /></IonContent></IonPage>;
  if (!tramite) return (
    <IonPage>
      <Header titulo="Trámite no encontrado" rutaVolver="/vecino/dashboard" />
      <IonContent className="ion-padding"><IonText color="medium"><p>El trámite solicitado no está disponible en el catálogo.</p></IonText><IonButton expand="block" routerLink="/vecino/dashboard">Volver al catálogo</IonButton><IonToast isOpen={mensaje !== ''} message={mensaje} duration={3500} color="danger" onDidDismiss={() => setMensaje('')} /></IonContent>
    </IonPage>
  );

  return (
    <IonPage>
      <Header titulo={tramite.nombre} rutaVolver="/vecino/dashboard" />
      <IonContent>
        <div className="contenedor-pagina">
          <IonCard><IonCardHeader><div className="tramite-card__encabezado"><IonIcon icon={getIcono(tramite.icono)} color="primary" className="tramite-card__icono" aria-hidden="true" /><div><IonCardTitle>{tramite.nombre}</IonCardTitle><IonBadge color="secondary">{ETIQUETA_CATEGORIA[tramite.categoria]}</IonBadge></div></div></IonCardHeader><IonCardContent>{tramite.descripcion}</IonCardContent></IonCard>

          <IonList inset>
            <IonListHeader><IonLabel>Requisitos</IonLabel></IonListHeader>
            {(tramite.requisitosDetalle.length > 0
              ? tramite.requisitosDetalle
              : tramite.requisitos.map((descripcion, i) => ({ id: String(i), descripcion, tipo: 'dato' as const, obligatorio: true }))
            ).map((requisito) => (
              <IonItem key={requisito.id}>
                <IonIcon
                  icon={requisito.tipo === 'documento' ? documentAttachOutline : createOutline}
                  color={requisito.tipo === 'documento' && archivos[requisito.id] ? 'success' : 'primary'}
                  slot="start"
                  aria-hidden="true"
                />
                <IonLabel className="ion-text-wrap">
                  {requisito.descripcion}
                  <p>{requisito.tipo === 'documento' ? 'Se adjunta como archivo' : 'Indícalo en las observaciones'}</p>
                </IonLabel>
              </IonItem>
            ))}
          </IonList>

          {solicitudCreada !== null ? (
            <IonCard className="solicitud-creada">
              <IonCardHeader>
                <IonCardTitle>Solicitud enviada</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <IonIcon
                  icon={fallidos.length === 0 ? checkmarkCircleOutline : warningOutline}
                  color={fallidos.length === 0 ? 'success' : 'warning'}
                  className="icono-exito"
                  aria-hidden="true"
                />
                <IonText>
                  <h2>Tu solicitud quedó registrada</h2>
                  <p>
                    Folio <strong>{solicitudCreada.id}</strong>.{' '}
                    {fallidos.length === 0
                      ? 'Los documentos quedaron adjuntos. El municipio te avisará en Notificaciones cuando haya novedades.'
                      : `No se pudo adjuntar: ${fallidos.join(', ')}. Adjúntalo desde el detalle de la solicitud.`}
                  </p>
                </IonText>
                <div className="fila-botones">
                  <IonButton routerLink={`/vecino/mis-tramites/${solicitudCreada.id}`}>
                    {fallidos.length === 0 ? 'Ver solicitud' : 'Adjuntar documentos'}
                  </IonButton>
                  <IonButton fill="outline" routerLink="/vecino/mis-tramites">
                    Ver mis trámites
                  </IonButton>
                  <IonButton fill="clear" routerLink="/vecino/dashboard">
                    Volver al catálogo
                  </IonButton>
                </div>
              </IonCardContent>
            </IonCard>
          ) : (
            <IonCard>
              <IonCardHeader>
                <IonCardTitle>Iniciar trámite</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                {documentos.length > 0 ? (
                  <div className="requisitos-archivos">
                    <IonText color="medium">
                      <p>Adjunta los documentos antes de enviar. Revisamos cada archivo al soltarlo.</p>
                    </IonText>
                    {documentos.map((requisito) => (
                      <RequisitoArchivo
                        key={requisito.id}
                        requisito={requisito}
                        valor={archivos[requisito.id] ?? null}
                        deshabilitado={enviando}
                        progreso={progreso[requisito.id]}
                        onCambio={(valor) => setArchivos((previo) => ({ ...previo, [requisito.id]: valor }))}
                      />
                    ))}
                  </div>
                ) : null}

                <IonTextarea
                  label={datos.some((r) => r.obligatorio)
                    ? `Observaciones: ${datos.map((r) => r.descripcion.toLowerCase()).join(' y ')}`
                    : 'Observaciones (opcional)'}
                  labelPlacement="floating"
                  fill="outline"
                  autoGrow
                  rows={3}
                  className="ion-margin-top"
                  value={observaciones}
                  disabled={enviando}
                  onIonInput={(event) => setObservaciones(event.detail.value ?? '')}
                />
                {intentoEnvio && !listo ? (
                  <IonText color="danger" role="alert">
                    <p className="requisito-archivo__error">
                      {faltantes.length > 0
                        ? `Falta adjuntar: ${faltantes.map((r) => r.descripcion).join(', ')}.`
                        : 'Completa las observaciones con los datos que pide el trámite.'}
                    </p>
                  </IonText>
                ) : null}

                <BotonCargando
                  expand="block"
                  className="ion-margin-top"
                  onClick={() => void iniciarTramite()}
                  cargando={enviando}
                  texto={listo ? 'Enviar solicitud' : `Enviar solicitud (${faltantes.length > 0 ? faltantes.length === 1 ? 'falta 1 documento' : `faltan ${faltantes.length} documentos` : 'faltan datos'})`}
                  textoCargando="Enviando solicitud y documentos…"
                />
              </IonCardContent>
            </IonCard>
          )}
        </div>
        <IonToast isOpen={mensaje !== ''} message={mensaje} duration={3000} color={tipoMensaje} onDidDismiss={() => setMensaje('')} />
      </IonContent>
    </IonPage>
  );
};

export default TramiteDetailPage;
