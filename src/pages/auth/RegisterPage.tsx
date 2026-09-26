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
import { useAuth } from '../../context/AuthContext';
import type { RegisterData } from '../../services/authService';

const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [cargando, setCargando] = useState<boolean>(false);
  const [mensaje, setMensaje] = useState<string>('');

  const manejarRegistro = async (data: RegisterData): Promise<void> => {
    setCargando(true);
    const exito = await register(data);
    setCargando(false);
    if (!exito) {
      setMensaje('Ya existe una cuenta registrada con ese correo.');
      return;
    }
    navigate('/', { replace: true });
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/login" text="Volver" />
          </IonButtons>
          <IonTitle>Crear cuenta</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <div className="contenedor-auth">
          <IonText>
            <h2>Regístrate como vecino</h2>
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
