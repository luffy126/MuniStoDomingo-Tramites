import { useRef, useState } from 'react';
import { IonCheckbox, IonNote } from '@ionic/react';
import { Link } from 'react-router-dom';
import CampoFormulario from './CampoFormulario';
import BotonCargando from '../common/BotonCargando';
import {
  REQUISITO_PASSWORD,
  validarConfirmacion,
  validarEmail,
  validarNombre,
  validarPassword,
} from '../../utils/validators';
import { enfocarPrimerError } from '../../utils/formulario';
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

type CampoRegistro = Exclude<keyof ErroresRegistro, 'terminos'>;

const RegisterForm: React.FC<RegisterFormProps> = ({ onSubmit, cargando }) => {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [errores, setErrores] = useState<ErroresRegistro>({});
  const [tocados, setTocados] = useState<Record<CampoRegistro, boolean>>({
    nombre: false,
    email: false,
    password: false,
    confirmacion: false,
  });
  const formRef = useRef<HTMLFormElement>(null);

  const validarCampo = (campo: CampoRegistro, valor: string): string | undefined => {
    switch (campo) {
      case 'nombre':
        return validarNombre(valor);
      case 'email':
        return validarEmail(valor);
      case 'password':
        return validarPassword(valor);
      case 'confirmacion':
        return validarConfirmacion(password, valor);
    }
  };

  const valorDe = (campo: CampoRegistro): string => {
    switch (campo) {
      case 'nombre':
        return nombre;
      case 'email':
        return email;
      case 'password':
        return password;
      case 'confirmacion':
        return confirmacion;
    }
  };

  const actualizar = (campo: CampoRegistro, valor: string): void => {
    if (campo === 'nombre') setNombre(valor);
    if (campo === 'email') setEmail(valor);
    if (campo === 'password') setPassword(valor);
    if (campo === 'confirmacion') setConfirmacion(valor);

    if (tocados[campo]) {
      setErrores((previos) => ({ ...previos, [campo]: validarCampo(campo, valor) }));
    }
    if (campo === 'password' && tocados.confirmacion) {
      setErrores((previos) => ({
        ...previos,
        confirmacion: validarConfirmacion(valor, confirmacion),
      }));
    }
  };

  const marcarTocado = (campo: CampoRegistro): void => {
    setTocados((previos) => ({ ...previos, [campo]: true }));
    setErrores((previos) => ({
      ...previos,
      [campo]: validarCampo(campo, valorDe(campo)),
    }));
  };

  const manejarEnvio = async (): Promise<void> => {
    const nuevos: ErroresRegistro = {
      nombre: validarNombre(nombre),
      email: validarEmail(email),
      password: validarPassword(password),
      confirmacion: validarConfirmacion(password, confirmacion),
      terminos: aceptaTerminos ? undefined : 'Debes aceptar los términos y condiciones.',
    };
    setTocados({ nombre: true, email: true, password: true, confirmacion: true });
    setErrores(nuevos);
    if (Object.values(nuevos).some((error) => error !== undefined)) {
      window.setTimeout(() => {
        if (nuevos.terminos !== undefined && formRef.current !== null) {
          formRef.current.querySelector<HTMLElement>('#register-terminos')?.focus();
        } else {
          enfocarPrimerError(formRef.current);
        }
      }, 0);
      return;
    }
    await onSubmit({ nombre: nombre.trim(), email: email.trim(), password, rol: 'vecino' });
  };

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void manejarEnvio();
      }}
    >
      <CampoFormulario
        id="register-nombre"
        label="Nombre completo"
        labelPlacement="floating"
        fill="outline"
        autocomplete="name"
        value={nombre}
        error={errores.nombre}
        onValorChange={(valor) => actualizar('nombre', valor)}
        onIonBlur={() => marcarTocado('nombre')}
      />

      <CampoFormulario
        id="register-email"
        label="Correo electrónico"
        labelPlacement="floating"
        fill="outline"
        type="email"
        inputmode="email"
        autocomplete="email"
        value={email}
        error={errores.email}
        className="ion-margin-top"
        onValorChange={(valor) => actualizar('email', valor)}
        onIonBlur={() => marcarTocado('email')}
      />

      <CampoFormulario
        id="register-password"
        label="Contraseña"
        labelPlacement="floating"
        fill="outline"
        type="password"
        autocomplete="new-password"
        value={password}
        error={errores.password}
        className="ion-margin-top"
        onValorChange={(valor) => actualizar('password', valor)}
        onIonBlur={() => marcarTocado('password')}
      />
      {errores.password === undefined ? (
        <IonNote color="medium" className="mensaje-error">
          {REQUISITO_PASSWORD}
        </IonNote>
      ) : null}

      <CampoFormulario
        id="register-confirmacion"
        label="Confirmar contraseña"
        labelPlacement="floating"
        fill="outline"
        type="password"
        autocomplete="new-password"
        value={confirmacion}
        error={errores.confirmacion}
        className="ion-margin-top"
        onValorChange={(valor) => actualizar('confirmacion', valor)}
        onIonBlur={() => marcarTocado('confirmacion')}
      />

      <IonCheckbox
        id="register-terminos"
        className="ion-margin-top"
        labelPlacement="end"
        justify="start"
        checked={aceptaTerminos}
        aria-invalid={errores.terminos !== undefined}
        aria-describedby={errores.terminos !== undefined ? 'register-terminos-error' : undefined}
        onIonChange={(event) => {
          setAceptaTerminos(event.detail.checked);
          if (event.detail.checked) {
            setErrores((previos) => ({ ...previos, terminos: undefined }));
          }
        }}
      >
        Acepto los términos y condiciones
      </IonCheckbox>
      <IonNote className="mensaje-error">
        <Link to="/terminos">Lee los términos y la política de privacidad</Link>
      </IonNote>
      {errores.terminos !== undefined ? (
        <IonNote id="register-terminos-error" color="danger" className="mensaje-error" role="alert">
          {errores.terminos}
        </IonNote>
      ) : null}

      <BotonCargando
        type="submit"
        expand="block"
        className="ion-margin-top"
        cargando={cargando}
        texto="Registrarse"
        textoCargando="Creando cuenta…"
      />
    </form>
  );
};

export default RegisterForm;
