import { useCallback, useState } from 'react';
import {
  IonBadge, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle,
  IonCardTitle, IonContent, IonItem, IonLabel, IonList, IonListHeader,
  IonPage, IonProgressBar, IonSpinner, IonToast,
} from '@ionic/react';
import Header from '../../components/common/Header';
import { COLOR_ESTADO, ETIQUETA_ESTADO, getResumenPorEstado, getSolicitudes, getTramites } from '../../services/tramiteService';
import type { EstadoSolicitud, Solicitud, Tramite } from '../../services/tramiteService';
import { useCargarAlEntrar } from '../../hooks/useCargarAlEntrar';

const ESTADOS: EstadoSolicitud[] = ['pendiente', 'en_revision', 'aprobado', 'rechazado'];

const ReportesPage: React.FC = () => {
  const [resumen, setResumen] = useState<Record<EstadoSolicitud, number>>({ pendiente: 0, en_revision: 0, aprobado: 0, rechazado: 0 });
  const [total, setTotal] = useState(0);
  const [porTramite, setPorTramite] = useState<Array<{ nombre: string; cantidad: number }>>([]);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  const cargar = useCallback((): void => {
    setCargando(true);
    void Promise.all([getResumenPorEstado(), getSolicitudes(), getTramites()])
      .then(([summary, solicitudes, tramites]: [Record<EstadoSolicitud, number>, Solicitud[], Tramite[]]) => {
        setResumen(summary);
        setTotal(Object.values(summary).reduce((sum, value) => sum + value, 0));
        const names = new Map(tramites.map((tramite) => [tramite.id, tramite.nombre]));
        const counts = new Map<string, number>();
        solicitudes.forEach((solicitud) => {
          const name = names.get(solicitud.tramiteId) ?? 'Trámite municipal';
          counts.set(name, (counts.get(name) ?? 0) + 1);
        });
        setPorTramite(Array.from(counts, ([nombre, cantidad]) => ({ nombre, cantidad })).sort((a, b) => b.cantidad - a.cantidad));
      })
      .catch((error: unknown) => setMensaje(error instanceof Error ? error.message : 'No se pudieron cargar los reportes.'))
      .finally(() => setCargando(false));
  }, []);
  useCargarAlEntrar('/funcionario/reportes', cargar);

  return (
    <IonPage>
      <Header titulo="Reportes" conMenu />
      <IonContent>
        <div className="contenedor-pagina">
          {cargando ? <div className="ion-text-center ion-padding"><IonSpinner /><p>Cargando reportes…</p></div> : <>
            <IonCard><IonCardHeader><IonCardSubtitle>Total de solicitudes</IonCardSubtitle><IonCardTitle>{total}</IonCardTitle></IonCardHeader><IonCardContent>Resumen general de la gestión de trámites municipales.</IonCardContent></IonCard>
            <div className="grilla-tarjetas">{ESTADOS.map((estado) => <IonCard key={estado}><IonCardHeader><IonCardSubtitle>{ETIQUETA_ESTADO[estado]}</IonCardSubtitle><IonCardTitle>{resumen[estado]}</IonCardTitle></IonCardHeader><IonCardContent><IonProgressBar color={COLOR_ESTADO[estado]} value={total === 0 ? 0 : resumen[estado] / total} /></IonCardContent></IonCard>)}</div>
            <IonList inset><IonListHeader><IonLabel>Solicitudes por trámite</IonLabel></IonListHeader>{porTramite.map((row) => <IonItem key={row.nombre} lines="full"><IonLabel className="ion-text-wrap">{row.nombre}</IonLabel><IonBadge color="primary" slot="end">{row.cantidad}</IonBadge></IonItem>)}</IonList>
          </>}
        </div>
        <IonToast isOpen={mensaje !== ''} message={mensaje} duration={3500} color="danger" onDidDismiss={() => setMensaje('')} />
      </IonContent>
    </IonPage>
  );
};

export default ReportesPage;
