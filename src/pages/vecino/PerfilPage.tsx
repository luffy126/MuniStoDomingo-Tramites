import { useNavigate } from 'react-router-dom';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { logOutOutline, mailOutline, personCircleOutline, shieldCheckmarkOutline } from 'ionicons/icons';
import { useAuth } from '../../context/AuthContext';

const PerfilPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const cerrarSesion = (): void => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>Mi perfil</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="contenedor-pagina">
          <IonCard>
            <IonCardContent>
              <div className="perfil-encabezado">
                <IonIcon icon={personCircleOutline} color="primary" />
                <IonText>
                  <h2>{user?.nombre ?? 'Vecino'}</h2>
                  <p>Cuenta de vecino de Santo Domingo</p>
                </IonText>
              </div>
            </IonCardContent>
          </IonCard>

          <IonList inset>
            <IonItem>
              <IonIcon icon={mailOutline} color="primary" slot="start" />
              <IonLabel className="ion-text-wrap">
                <h3>Correo</h3>
                <p>{user?.email ?? '—'}</p>
              </IonLabel>
            </IonItem>
            <IonItem>
              <IonIcon icon={shieldCheckmarkOutline} color="primary" slot="start" />
              <IonLabel className="ion-text-wrap">
                <h3>Rol</h3>
                <p>{user?.rol === 'funcionario' ? 'Funcionario municipal' : 'Vecino'}</p>
              </IonLabel>
            </IonItem>
          </IonList>

          <IonButton expand="block" color="danger" onClick={cerrarSesion}>
            <IonIcon icon={logOutOutline} slot="start" />
            Cerrar sesión
          </IonButton>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default PerfilPage;
