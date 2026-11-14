import { rutaInicialPorRol } from '../../services/authService';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonPage,
  IonText,
  IonTitle,
  IonToast,
  IonToolbar,
} from '@ionic/react';
import LoginForm from '../../components/forms/LoginForm';
import { useAuth } from '../../context/AuthContext';
import { TemaBoton } from '../../components/common/TemaToggle';

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [cargando, setCargando] = useState<boolean>(false);
  const [mensaje, setMensaje] = useState<string>('');

  const manejarLogin = async (email: string, password: string): Promise<void> => {
    setCargando(true);
    try {
      const usuario = await login(email, password);
      // Directo a la ruta final: un salto intermedio por / dejaba a Ionic mostrando "Redirigiendo…".
      navigate(rutaInicialPorRol(usuario.rol), { replace: true });
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : 'No se pudo iniciar sesión.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>Municipalidad de Santo Domingo</IonTitle>
          <IonButtons slot="end">
            <TemaBoton />
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <div className="contenedor-auth">
          <div className="logo-municipal">
            <img src="/logo-municipal.png" alt="Municipalidad de Santo Domingo, Comuna Parque" />
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
