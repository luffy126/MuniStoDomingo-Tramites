import { useRef, useState } from 'react';
import CampoFormulario from './CampoFormulario';
import BotonCargando from '../common/BotonCargando';
import { validarEmail } from '../../utils/validators';
import { enfocarPrimerError } from '../../utils/formulario';

interface LoginFormProps {
  onSubmit: (email: string, password: string) => Promise<void>;
  cargando: boolean;
}

interface ErroresLogin {
  email?: string;
  password?: string;
}

type CampoLogin = keyof ErroresLogin;

const LoginForm: React.FC<LoginFormProps> = ({ onSubmit, cargando }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errores, setErrores] = useState<ErroresLogin>({});
  const [tocados, setTocados] = useState<Record<CampoLogin, boolean>>({
    email: false,
    password: false,
  });
  const formRef = useRef<HTMLFormElement>(null);

  const validarCampo = (campo: CampoLogin, valor: string): string | undefined => {
    if (campo === 'email') return validarEmail(valor);
    return valor === '' ? 'La contraseña es obligatoria.' : undefined;
  };

  const actualizar = (campo: CampoLogin, valor: string): void => {
    if (campo === 'email') setEmail(valor);
    else setPassword(valor);
    if (tocados[campo]) {
      setErrores((previos) => ({ ...previos, [campo]: validarCampo(campo, valor) }));
    }
  };

  const marcarTocado = (campo: CampoLogin): void => {
    setTocados((previos) => ({ ...previos, [campo]: true }));
    setErrores((previos) => ({
      ...previos,
      [campo]: validarCampo(campo, campo === 'email' ? email : password),
    }));
  };

  const manejarEnvio = async (): Promise<void> => {
    const nuevos: ErroresLogin = {
      email: validarCampo('email', email),
      password: validarCampo('password', password),
    };
    setTocados({ email: true, password: true });
    setErrores(nuevos);
    if (nuevos.email !== undefined || nuevos.password !== undefined) {
      window.setTimeout(() => enfocarPrimerError(formRef.current), 0);
      return;
    }
    await onSubmit(email.trim(), password);
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
        id="login-email"
        label="Correo electrónico"
        labelPlacement="floating"
        fill="outline"
        type="email"
        inputmode="email"
        autocomplete="email"
        placeholder="vecino@test.com"
        value={email}
        error={errores.email}
        className="ion-margin-bottom"
        onValorChange={(valor) => actualizar('email', valor)}
        onIonBlur={() => marcarTocado('email')}
      />

      <CampoFormulario
        id="login-password"
        label="Contraseña"
        labelPlacement="floating"
        fill="outline"
        type="password"
        autocomplete="current-password"
        value={password}
        error={errores.password}
        className="ion-margin-top ion-margin-bottom"
        onValorChange={(valor) => actualizar('password', valor)}
        onIonBlur={() => marcarTocado('password')}
      />

      <BotonCargando
        type="submit"
        expand="block"
        className="ion-margin-top"
        cargando={cargando}
        texto="Ingresar"
        textoCargando="Ingresando…"
      />
    </form>
  );
};

export default LoginForm;
