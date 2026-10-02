import { useCallback, useState } from 'react';
import {
  IonBadge,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonPage,
  IonProgressBar,
  useIonViewWillEnter,
} from '@ionic/react';
import Header from '../../components/common/Header';
import {
  COLOR_ESTADO,
  ETIQUETA_ESTADO,
  getResumenPorEstado,
  getSolicitudes,
  getTramiteById,
} from '../../services/tramiteService';
import type { EstadoSolicitud } from '../../services/tramiteService';

const ESTADOS: EstadoSolicitud[] = ['pendiente', 'en_revision', 'aprobado', 'rechazado'];

const ReportesPage: React.FC = () => {
  const [resumen, setResumen] = useState<Record<EstadoSolicitud, number>>(getResumenPorEstado());
  const [total, setTotal] = useState<number>(0);
  const [porTramite, setPorTramite] = useState<Array<{ nombre: string; cantidad: number }>>([]);

  const cargar = useCallback((): void => {
    const solicitudes = getSolicitudes();
    setResumen(getResumenPorEstado());
    setTotal(solicitudes.length);

    const conteo = new Map<string, number>();
    solicitudes.forEach((solicitud) => {
      const nombre = getTramiteById(solicitud.tramiteId)?.nombre ?? 'Trámite municipal';
      conteo.set(nombre, (conteo.get(nombre) ?? 0) + 1);
    });
    setPorTramite(
      Array.from(conteo, ([nombre, cantidad]) => ({ nombre, cantidad })).sort(
        (a, b) => b.cantidad - a.cantidad
      )
    );
  }, []);

  useIonViewWillEnter(cargar);

  return (
    <IonPage>
      <Header titulo="Reportes" conMenu />
      <IonContent>
        <div className="contenedor-pagina">
          <IonCard>
            <IonCardHeader>
              <IonCardSubtitle>Total de solicitudes</IonCardSubtitle>
              <IonCardTitle>{total}</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>Resumen general de la gestión de trámites municipales.</IonCardContent>
          </IonCard>

          <div className="grilla-tarjetas">
            {ESTADOS.map((estado) => (
              <IonCard key={estado}>
                <IonCardHeader>
                  <IonCardSubtitle>{ETIQUETA_ESTADO[estado]}</IonCardSubtitle>
                  <IonCardTitle>{resumen[estado]}</IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  <IonProgressBar
                    color={COLOR_ESTADO[estado]}
                    value={total === 0 ? 0 : resumen[estado] / total}
                  />
                </IonCardContent>
              </IonCard>
            ))}
          </div>

          <IonList inset>
            <IonListHeader>
              <IonLabel>Solicitudes por trámite</IonLabel>
            </IonListHeader>
            {porTramite.map((fila) => (
              <IonItem key={fila.nombre} lines="full">
                <IonLabel className="ion-text-wrap">{fila.nombre}</IonLabel>
                <IonBadge color="primary" slot="end">
                  {fila.cantidad}
                </IonBadge>
              </IonItem>
            ))}
          </IonList>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default ReportesPage;
