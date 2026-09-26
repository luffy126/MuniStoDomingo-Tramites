import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonText,
  IonTitle,
  IonToast,
  IonToolbar,
} from '@ionic/react';
import { businessOutline } from 'ionicons/icons';
import LoginForm from '../../components/forms/LoginForm';
import { useAuth } from '../../context/AuthContext';

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [cargando, setCargando] = useState<boolean>(false);
  const [mensaje, setMensaje] = useState<string>('');

  const manejarLogin = async (email: string, password: string): Promise<void> => {
    setCargando(true);
    const exito = await login(email, password);
    setCargando(false);
    if (!exito) {
      setMensaje('Correo o contraseña incorrectos.');
      return;
    }
    navigate('/', { replace: true });
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>Municipalidad de Santo Domingo</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <div className="contenedor-auth">
          <div className="logo-municipal">
            <IonIcon icon={businessOutline} color="primary" />
            <IonText>
              <h1>Trámites en línea</h1>
              <p>Ingresa con tu cuenta para realizar y seguir tus trámites municipales.</p>
            </IonText>
          </div>

          <IonCard>
            <IonCardContent>
              <LoginForm onSubmit={manejarLogin} cargando={cargando} />

              <IonButton
                fill="clear"
                expand="block"
                size="small"
                onClick={() => setMensaje('Recuperación de contraseña disponible próximamente.')}
              >
                ¿Olvidaste tu contraseña?
              </IonButton>
              <IonButton fill="clear" expand="block" size="small" routerLink="/register">
                ¿No tienes cuenta? Regístrate
              </IonButton>
            </IonCardContent>
          </IonCard>

          <IonText color="medium" className="ayuda-credenciales">
            <p>Cuentas de prueba: vecino@test.com / funcionario@test.com — contraseña Test1234</p>
          </IonText>
        </div>

        <IonToast
          isOpen={mensaje !== ''}
          message={mensaje}
          duration={2500}
          color="danger"
          onDidDismiss={() => setMensaje('')}
        />
      </IonContent>
    </IonPage>
  );
};

export default LoginPage;
