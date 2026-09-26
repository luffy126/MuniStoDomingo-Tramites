import { useState } from 'react';
import { IonButton, IonInput, IonNote, IonSpinner } from '@ionic/react';
import { esEmailValido } from '../../utils/validators';

interface LoginFormProps {
  onSubmit: (email: string, password: string) => Promise<void>;
  cargando: boolean;
}

interface ErroresLogin {
  email?: string;
  password?: string;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSubmit, cargando }) => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [errores, setErrores] = useState<ErroresLogin>({});

  const validar = (): ErroresLogin => {
    const nuevos: ErroresLogin = {};
    if (email.trim() === '') {
      nuevos.email = 'El correo es obligatorio.';
    } else if (!esEmailValido(email)) {
      nuevos.email = 'Ingresa un correo con formato válido.';
    }
    if (password === '') {
      nuevos.password = 'La contraseña es obligatoria.';
    }
    return nuevos;
  };

  const manejarEnvio = async (): Promise<void> => {
    const nuevos = validar();
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) {
      return;
    }
    await onSubmit(email.trim(), password);
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void manejarEnvio();
      }}
    >
      <IonInput
        label="Correo electrónico"
        labelPlacement="floating"
        fill="outline"
        type="email"
        inputmode="email"
        autocomplete="email"
        placeholder="vecino@test.com"
        value={email}
        className="ion-margin-bottom"
        onIonInput={(event) => setEmail(event.detail.value ?? '')}
      />
      {errores.email !== undefined ? (
        <IonNote color="danger" className="mensaje-error">
          {errores.email}
        </IonNote>
      ) : null}

      <IonInput
        label="Contraseña"
        labelPlacement="floating"
        fill="outline"
        type="password"
        autocomplete="current-password"
        value={password}
        className="ion-margin-top ion-margin-bottom"
        onIonInput={(event) => setPassword(event.detail.value ?? '')}
      />
      {errores.password !== undefined ? (
        <IonNote color="danger" className="mensaje-error">
          {errores.password}
        </IonNote>
      ) : null}

      <IonButton type="submit" expand="block" className="ion-margin-top" disabled={cargando}>
        {cargando ? <IonSpinner name="dots" /> : 'Ingresar'}
      </IonButton>
    </form>
  );
};

export default LoginForm;
