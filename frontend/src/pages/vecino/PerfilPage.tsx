import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonPage,
  IonSpinner,
  IonText,
  IonTitle,
  IonToast,
  IonToolbar,
} from '@ionic/react';
import { logOutOutline, mailOutline, personCircleOutline, shieldCheckmarkOutline } from 'ionicons/icons';
import { useAuth } from '../../context/AuthContext';
import { esEmailValido } from '../../utils/validators';

interface ErroresPerfil {
  nombre?: string;
  email?: string;
}

const PerfilPage: React.FC = () => {
  const { user, logout, actualizarPerfil } = useAuth();
  const navigate = useNavigate();
  const [nombre, setNombre] = useState(user?.nombre ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [errores, setErrores] = useState<ErroresPerfil>({});
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [tipoMensaje, setTipoMensaje] = useState<'success' | 'danger'>('success');

  const cerrarSesion = (): void => {
    logout();
    navigate('/login', { replace: true });
  };

  const sinCambios = nombre.trim() === (user?.nombre ?? '') && email.trim().toLowerCase() === (user?.email ?? '');

  const validar = (): ErroresPerfil => {
    const nuevos: ErroresPerfil = {};
    const largo = nombre.trim().length;
    if (largo < 2 || largo > 120) {
      nuevos.nombre = 'El nombre debe tener entre 2 y 120 caracteres.';
    }
    if (!esEmailValido(email)) {
      nuevos.email = 'Ingresa un correo con formato válido.';
    } else if (email.trim().length > 160) {
      nuevos.email = 'El correo no puede superar los 160 caracteres.';
    }
    return nuevos;
  };

  const guardarCambios = async (): Promise<void> => {
    const nuevos = validar();
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) return;

    setGuardando(true);
    try {
      await actualizarPerfil({ nombre, email });
      setTipoMensaje('success');
      setMensaje('Perfil actualizado.');
    } catch (error) {
      setTipoMensaje('danger');
      setMensaje(error instanceof Error ? error.message : 'No se pudo actualizar el perfil.');
    } finally {
      setGuardando(false);
    }
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

          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Editar datos</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void guardarCambios();
                }}
              >
                <IonInput
                  label="Nombre completo"
                  labelPlacement="floating"
                  fill="outline"
                  autocomplete="name"
                  value={nombre}
                  onIonInput={(event) => setNombre(event.detail.value ?? '')}
                />
                {errores.nombre !== undefined ? (
                  <IonNote color="danger" className="mensaje-error">
                    {errores.nombre}
                  </IonNote>
                ) : null}

                <IonInput
                  label="Correo electrónico"
                  labelPlacement="floating"
                  fill="outline"
                  type="email"
                  inputmode="email"
                  autocomplete="email"
                  value={email}
                  className="ion-margin-top"
                  onIonInput={(event) => setEmail(event.detail.value ?? '')}
                />
                {errores.email !== undefined ? (
                  <IonNote color="danger" className="mensaje-error">
                    {errores.email}
                  </IonNote>
                ) : null}

                <IonButton type="submit" expand="block" className="ion-margin-top" disabled={guardando || sinCambios}>
                  {guardando ? <IonSpinner name="dots" /> : 'Guardar cambios'}
                </IonButton>
              </form>
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
        <IonToast isOpen={mensaje !== ''} message={mensaje} duration={3500} color={tipoMensaje} onDidDismiss={() => setMensaje('')} />
      </IonContent>
    </IonPage>
  );
};

export default PerfilPage;
