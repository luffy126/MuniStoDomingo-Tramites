import { useState } from 'react';
import { IonButton, IonCheckbox, IonInput, IonNote, IonSpinner } from '@ionic/react';
import { REQUISITO_PASSWORD, esEmailValido, esPasswordSegura } from '../../utils/validators';
import type { RegisterData } from '../../services/authService';

interface RegisterFormProps {
  onSubmit: (data: RegisterData) => Promise<void>;
  cargando: boolean;
}

interface ErroresRegistro {
  nombre?: string;
  email?: string;
  password?: string;
  confirmacion?: string;
  terminos?: string;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onSubmit, cargando }) => {
  const [nombre, setNombre] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmacion, setConfirmacion] = useState<string>('');
  const [aceptaTerminos, setAceptaTerminos] = useState<boolean>(false);
  const [errores, setErrores] = useState<ErroresRegistro>({});

  const validar = (): ErroresRegistro => {
    const nuevos: ErroresRegistro = {};
    if (nombre.trim().length < 3) {
      nuevos.nombre = 'Ingresa tu nombre completo (mínimo 3 caracteres).';
    }
    if (!esEmailValido(email)) {
      nuevos.email = 'Ingresa un correo con formato válido.';
    }
    if (!esPasswordSegura(password)) {
      nuevos.password = REQUISITO_PASSWORD;
    }
    if (confirmacion !== password || confirmacion === '') {
      nuevos.confirmacion = 'Las contraseñas no coinciden.';
    }
    if (!aceptaTerminos) {
      nuevos.terminos = 'Debes aceptar los términos y condiciones.';
    }
    return nuevos;
  };

  const manejarEnvio = async (): Promise<void> => {
    const nuevos = validar();
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) {
      return;
    }
    await onSubmit({ nombre: nombre.trim(), email: email.trim(), password, rol: 'vecino' });
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void manejarEnvio();
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

      <IonInput
        label="Contraseña"
        labelPlacement="floating"
        fill="outline"
        type="password"
        autocomplete="new-password"
        value={password}
        className="ion-margin-top"
        onIonInput={(event) => setPassword(event.detail.value ?? '')}
      />
      {errores.password !== undefined ? (
        <IonNote color="danger" className="mensaje-error">
          {errores.password}
        </IonNote>
      ) : (
        <IonNote color="medium" className="mensaje-error">
          {REQUISITO_PASSWORD}
        </IonNote>
      )}

      <IonInput
        label="Confirmar contraseña"
        labelPlacement="floating"
        fill="outline"
        type="password"
        autocomplete="new-password"
        value={confirmacion}
        className="ion-margin-top"
        onIonInput={(event) => setConfirmacion(event.detail.value ?? '')}
      />
      {errores.confirmacion !== undefined ? (
        <IonNote color="danger" className="mensaje-error">
          {errores.confirmacion}
        </IonNote>
      ) : null}

      <IonCheckbox
        className="ion-margin-top"
        labelPlacement="end"
        justify="start"
        checked={aceptaTerminos}
        onIonChange={(event) => setAceptaTerminos(event.detail.checked)}
      >
        Acepto los términos y condiciones
      </IonCheckbox>
      {errores.terminos !== undefined ? (
        <IonNote color="danger" className="mensaje-error">
          {errores.terminos}
        </IonNote>
      ) : null}

      <IonButton type="submit" expand="block" className="ion-margin-top" disabled={cargando}>
        {cargando ? <IonSpinner name="dots" /> : 'Registrarse'}
      </IonButton>
    </form>
  );
};

export default RegisterForm;
