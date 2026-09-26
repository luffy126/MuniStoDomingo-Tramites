import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonPage,
  IonText,
  IonTextarea,
  IonToast,
} from '@ionic/react';
import { checkmarkCircleOutline } from 'ionicons/icons';
import Header from '../../components/common/Header';
import { useAuth } from '../../context/AuthContext';
import { ETIQUETA_CATEGORIA, crearSolicitud, getTramiteById } from '../../services/tramiteService';
import { getIcono } from '../../utils/iconos';

const TramiteDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [observaciones, setObservaciones] = useState<string>('');
  const [mensaje, setMensaje] = useState<string>('');

  const tramite = id !== undefined ? getTramiteById(id) : undefined;

  if (tramite === undefined) {
    return (
      <IonPage>
        <Header titulo="Trámite no encontrado" rutaVolver="/vecino/dashboard" />
        <IonContent className="ion-padding">
          <IonText color="medium">
            <p>El trámite solicitado no está disponible en el catálogo.</p>
          </IonText>
          <IonButton expand="block" routerLink="/vecino/dashboard">
            Volver al catálogo
          </IonButton>
        </IonContent>
      </IonPage>
    );
  }

  const iniciarTramite = (): void => {
    crearSolicitud({
      tramiteId: tramite.id,
      vecinoNombre: user?.nombre ?? 'Vecino Demo',
      observaciones: observaciones.trim() === '' ? undefined : observaciones.trim(),
    });
    setMensaje('Solicitud enviada correctamente.');
    setObservaciones('');
    window.setTimeout(() => navigate('/vecino/mis-tramites'), 1200);
  };

  return (
    <IonPage>
      <Header titulo={tramite.nombre} rutaVolver="/vecino/dashboard" />
      <IonContent>
        <div className="contenedor-pagina">
          <IonCard>
            <IonCardHeader>
              <div className="tramite-card__encabezado">
                <IonIcon icon={getIcono(tramite.icono)} color="primary" className="tramite-card__icono" />
                <div>
                  <IonCardTitle>{tramite.nombre}</IonCardTitle>
                  <IonBadge color="secondary">{ETIQUETA_CATEGORIA[tramite.categoria]}</IonBadge>
                </div>
              </div>
            </IonCardHeader>
            <IonCardContent>{tramite.descripcion}</IonCardContent>
          </IonCard>

          <IonList inset>
            <IonListHeader>
              <IonLabel>Requisitos</IonLabel>
            </IonListHeader>
            {tramite.requisitos.map((requisito) => (
              <IonItem key={requisito}>
                <IonIcon icon={checkmarkCircleOutline} color="success" slot="start" />
                <IonLabel className="ion-text-wrap">{requisito}</IonLabel>
              </IonItem>
            ))}
          </IonList>

          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Iniciar trámite</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonTextarea
                label="Observaciones (opcional)"
                labelPlacement="floating"
                fill="outline"
                autoGrow
                rows={3}
                value={observaciones}
                onIonInput={(event) => setObservaciones(event.detail.value ?? '')}
              />
              <IonButton expand="block" className="ion-margin-top" onClick={iniciarTramite}>
                Enviar solicitud
              </IonButton>
            </IonCardContent>
          </IonCard>
        </div>

        <IonToast
          isOpen={mensaje !== ''}
          message={mensaje}
          duration={1500}
          color="success"
          onDidDismiss={() => setMensaje('')}
        />
      </IonContent>
    </IonPage>
  );
};

export default TramiteDetailPage;
