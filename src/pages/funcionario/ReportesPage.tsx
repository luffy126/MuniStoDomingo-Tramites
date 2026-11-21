import { useCallback, useState } from 'react';
import {
  IonBadge, IonButton, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle,
  IonCardTitle, IonContent, IonIcon, IonInput, IonItem, IonLabel, IonList, IonListHeader,
  IonPage, IonProgressBar, IonText, IonToast,
} from '@ionic/react';
import { downloadOutline, openOutline } from 'ionicons/icons';
import Header from '../../components/common/Header';
import EstadoError from '../../components/common/EstadoError';
import EsqueletoLista from '../../components/common/EsqueletoLista';
import {
  COLOR_ESTADO, COLOR_PRIORIDAD, ETIQUETA_ESTADO, ETIQUETA_PRIORIDAD,
  getReporte,
} from '../../services/tramiteService';
import type {
  EstadoSolicitud, FiltrosReporte, GrupoReporte, PrioridadSolicitud, ReporteSolicitudes,
} from '../../services/tramiteService';
import { useCargarAlEntrar } from '../../hooks/useCargarAlEntrar';
import { useTituloPagina } from '../../hooks/useTituloPagina';

const ESTADOS: EstadoSolicitud[] = ['pendiente', 'en_revision', 'aprobado', 'rechazado'];
const PRIORIDADES: PrioridadSolicitud[] = ['urgente', 'alta', 'media', 'baja'];

const REPORTE_VACIO: ReporteSolicitudes = {
  desde: null,
  hasta: null,
  total: 0,
  porEstado: {
    pendiente: 0,
    en_revision: 0,
    aprobado: 0,
    rechazado: 0,
    vencidas: 0,
    promedioResolucionDias: null,
  },
  porTramite: [],
  porPrioridad: [],
  vencidas: 0,
  promedioResolucionDias: null,
};

const celdaCsv = (valor: string | number): string =>
  `"${String(valor).replace(/"/g, '""')}"`;

const ReportesPage: React.FC = () => {
  useTituloPagina('Reportes');
  const [reporte, setReporte] = useState<ReporteSolicitudes>(REPORTE_VACIO);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [filtros, setFiltros] = useState<FiltrosReporte>({});
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const cargar = useCallback((): void => {
    setCargando(true);
    setError('');
    void getReporte(filtros)
      .then(setReporte)
      .catch((e: unknown) => setError(
        e instanceof Error ? e.message : 'No se pudieron cargar los reportes.',
      ))
      .finally(() => setCargando(false));
  }, [filtros]);
  useCargarAlEntrar('/funcionario/reportes', cargar);

  const aplicarFiltros = (): void => {
    if (desde !== '' && hasta !== '' && desde > hasta) {
      setMensaje('La fecha "desde" no puede ser posterior a "hasta".');
      return;
    }
    setFiltros({
      ...(desde !== '' ? { desde } : {}),
      ...(hasta !== '' ? { hasta } : {}),
    });
  };

  const limpiar = (): void => {
    setDesde('');
    setHasta('');
    setFiltros({});
  };

  const exportarCsv = (): void => {
    const filas: Array<Array<string | number>> = [
      ['Reporte de solicitudes'],
      ['Desde', reporte.desde ?? 'Sin límite'],
      ['Hasta', reporte.hasta ?? 'Sin límite'],
      ['Total', reporte.total],
      ['Vencidas abiertas', reporte.vencidas],
      ['Promedio de resolución (días)', reporte.promedioResolucionDias ?? 'Sin datos'],
      [],
      ['Por estado', 'Total'],
      ...ESTADOS.map((estado) => [ETIQUETA_ESTADO[estado], reporte.porEstado[estado]]),
      [],
      ['Por prioridad', 'Total'],
      ...reporte.porPrioridad.map((grupo) => [
        ETIQUETA_PRIORIDAD[grupo.clave as PrioridadSolicitud] ?? grupo.etiqueta,
        grupo.total,
      ]),
      [],
      ['Por trámite', 'Total'],
      ...reporte.porTramite.map((grupo) => [grupo.etiqueta, grupo.total]),
    ];
    const contenido = filas.map((fila) => fila.map(celdaCsv).join(';')).join('\r\n');
    const blob = new Blob([`\uFEFF${contenido}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `reporte-solicitudes-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
    URL.revokeObjectURL(url);
  };

  const porcentaje = (total: number): number =>
    reporte.total === 0 ? 0 : total / reporte.total;

  const filaGrupo = (
    grupo: GrupoReporte,
    etiqueta: string,
    color: string,
  ): React.ReactElement => (
    <IonItem key={grupo.clave} lines="full">
      <IonLabel className="ion-text-wrap">
        <h3>{etiqueta}</h3>
        <IonProgressBar
          color={color}
          value={porcentaje(grupo.total)}
          aria-label={`${etiqueta}: ${grupo.total} de ${reporte.total}`}
        />
      </IonLabel>
      <IonBadge color={color} slot="end">{grupo.total}</IonBadge>
    </IonItem>
  );

  return (
    <IonPage>
      <Header titulo="Reportes" conMenu />
      <IonContent>
        <div className="contenedor-pagina">
          <IonCard>
            <IonCardHeader><IonCardTitle>Periodo del reporte</IonCardTitle></IonCardHeader>
            <IonCardContent>
              <div className="fila-campos">
                <IonInput
                  label="Desde"
                  labelPlacement="floating"
                  fill="outline"
                  type="date"
                  value={desde}
                  onIonInput={(event) => setDesde(event.detail.value ?? '')}
                />
                <IonInput
                  label="Hasta"
                  labelPlacement="floating"
                  fill="outline"
                  type="date"
                  value={hasta}
                  onIonInput={(event) => setHasta(event.detail.value ?? '')}
                />
              </div>
              <div className="fila-botones ion-margin-top">
                <IonButton onClick={aplicarFiltros} disabled={cargando}>Aplicar periodo</IonButton>
                <IonButton fill="clear" color="medium" onClick={limpiar} disabled={cargando}>
                  Limpiar
                </IonButton>
                <IonButton fill="outline" onClick={exportarCsv} disabled={cargando}>
                  <IonIcon icon={downloadOutline} slot="start" aria-hidden="true" />
                  Exportar CSV
                </IonButton>
              </div>
            </IonCardContent>
          </IonCard>

          {cargando ? (
            <EsqueletoLista mensaje="Cargando reportes…" filas={3} />
          ) : error !== '' ? (
            <EstadoError mensaje={error} onReintentar={cargar} />
          ) : (
            <>
              <div className="grilla-tarjetas">
                <IonCard>
                  <IonCardHeader>
                    <IonCardSubtitle>Total de solicitudes</IonCardSubtitle>
                    <IonCardTitle>{reporte.total}</IonCardTitle>
                  </IonCardHeader>
                  <IonCardContent>
                    {reporte.desde || reporte.hasta
                      ? `Periodo: ${reporte.desde ?? 'inicio'} a ${reporte.hasta ?? 'hoy'}.`
                      : 'Todo el historial registrado.'}
                  </IonCardContent>
                </IonCard>
                <IonCard color={reporte.vencidas > 0 ? 'danger' : undefined}>
                  <IonCardHeader>
                    <IonCardSubtitle>Solicitudes vencidas abiertas</IonCardSubtitle>
                    <IonCardTitle>{reporte.vencidas}</IonCardTitle>
                  </IonCardHeader>
                  <IonCardContent>
                    Con fecha límite pasada y aún pendientes o en revisión.
                  </IonCardContent>
                </IonCard>
                <IonCard>
                  <IonCardHeader>
                    <IonCardSubtitle>Tiempo promedio de resolución</IonCardSubtitle>
                    <IonCardTitle>
                      {reporte.promedioResolucionDias === null
                        ? 'Sin datos'
                        : `${reporte.promedioResolucionDias} días`}
                    </IonCardTitle>
                  </IonCardHeader>
                  <IonCardContent>Calculado sobre las solicitudes ya resueltas.</IonCardContent>
                </IonCard>
              </div>

              <div className="grilla-tarjetas">
                {ESTADOS.map((estado) => (
                  <IonCard key={estado}>
                    <IonCardHeader>
                      <IonCardSubtitle>{ETIQUETA_ESTADO[estado]}</IonCardSubtitle>
                      <IonCardTitle>{reporte.porEstado[estado]}</IonCardTitle>
                    </IonCardHeader>
                    <IonCardContent>
                      <IonProgressBar
                        color={COLOR_ESTADO[estado]}
                        value={porcentaje(reporte.porEstado[estado])}
                        aria-label={`${ETIQUETA_ESTADO[estado]}: ${reporte.porEstado[estado]} de ${reporte.total}`}
                      />
                    </IonCardContent>
                  </IonCard>
                ))}
              </div>

              <IonList inset>
                <IonListHeader>
                  <IonLabel>Solicitudes por trámite</IonLabel>
                </IonListHeader>
                {reporte.porTramite.length === 0 ? (
                  <IonItem lines="none">
                    <IonLabel className="ion-text-wrap">
                      <p>No hay solicitudes en el periodo seleccionado.</p>
                    </IonLabel>
                  </IonItem>
                ) : (
                  reporte.porTramite.map((grupo) => filaGrupo(grupo, grupo.etiqueta, 'primary'))
                )}
              </IonList>

              <IonList inset>
                <IonListHeader>
                  <IonLabel>Solicitudes por prioridad</IonLabel>
                </IonListHeader>
                {PRIORIDADES.map((prioridad) => {
                  const grupo = reporte.porPrioridad.find((item) => item.clave === prioridad) ?? {
                    clave: prioridad,
                    etiqueta: ETIQUETA_PRIORIDAD[prioridad],
                    total: 0,
                  };
                  return filaGrupo(grupo, ETIQUETA_PRIORIDAD[prioridad], COLOR_PRIORIDAD[prioridad]);
                })}
              </IonList>

              <div className="fila-botones">
                <IonButton fill="outline" routerLink="/funcionario/solicitudes">
                  <IonIcon icon={openOutline} slot="start" aria-hidden="true" />
                  Ir a la bandeja
                </IonButton>
              </div>

              {reporte.total === 0 ? (
                <IonText color="medium">
                  <p>No hay solicitudes que coincidan con el periodo seleccionado.</p>
                </IonText>
              ) : null}
            </>
          )}
        </div>
        <IonToast
          isOpen={mensaje !== ''}
          message={mensaje}
          duration={3500}
          color="danger"
          onDidDismiss={() => setMensaje('')}
        />
      </IonContent>
    </IonPage>
  );
};

export default ReportesPage;
