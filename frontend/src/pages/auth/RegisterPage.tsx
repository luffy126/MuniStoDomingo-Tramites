import { TemaBoton } from '../../components/common/TemaToggle';
import { rutaInicialPorRol } from '../../services/authService';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IonBackButton,
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
import RegisterForm from '../../components/forms/RegisterForm';
import { useAuth } from '../../hooks/useAuth';
import { useTituloPagina } from '../../hooks/useTituloPagina';
import MarcaTitulo from '../../components/common/MarcaTitulo';
import type { RegisterData } from '../../services/authService';

const RegisterPage: React.FC = () => {
  useTituloPagina('Crear cuenta');
  const { register } = useAuth();
  const navigate = useNavigate();
  const [cargando, setCargando] = useState<boolean>(false);
  const [mensaje, setMensaje] = useState<string>('');

  const manejarRegistro = async (data: RegisterData): Promise<void> => {
    setCargando(true);
    try {
      const usuario = await register(data);
      // Directo a la ruta final: un salto intermedio por / dejaba a Ionic mostrando "Redirigiendo…".
      navigate(rutaInicialPorRol(usuario.rol), { replace: true });
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : 'No se pudo crear la cuenta.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/login" text="Volver" />
          </IonButtons>
          <IonTitle><MarcaTitulo>Crear cuenta</MarcaTitulo></IonTitle>
        <IonButtons slot="end"><TemaBoton /></IonButtons></IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <div className="contenedor-auth">
          <IonText>
            <h1 data-page-title>Regístrate como vecino</h1>
            <p>Con tu cuenta podrás iniciar trámites y hacer seguimiento en línea.</p>
          </IonText>

          <IonCard>
            <IonCardContent>
              <RegisterForm onSubmit={manejarRegistro} cargando={cargando} />
              <IonButton fill="clear" expand="block" size="small" routerLink="/login">
                ¿Ya tienes cuenta? Inicia sesión
              </IonButton>
            </IonCardContent>
          </IonCard>
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

export default RegisterPage;
