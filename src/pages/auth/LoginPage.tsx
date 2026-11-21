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
  IonToolbar,
} from '@ionic/react';
import LoginForm from '../../components/forms/LoginForm';
import CampoFormulario from '../../components/forms/CampoFormulario';
import BotonCargando from '../../components/common/BotonCargando';
import { useAuth } from '../../hooks/useAuth';
import { TemaBoton } from '../../components/common/TemaToggle';
import { useTituloPagina } from '../../hooks/useTituloPagina';
import MarcaTitulo from '../../components/common/MarcaTitulo';

const LoginPage: React.FC = () => {
  useTituloPagina('Ingresar');
  const { login, verificarCodigo } = useAuth();
  const navigate = useNavigate();
  const [cargando, setCargando] = useState<boolean>(false);
  const [mensaje, setMensaje] = useState<string>('');
  // Con 2FA activa, tras la contraseña se pide el código enviado por correo.
  const [desafio, setDesafio] = useState<{ desafio: string; destino: string } | null>(null);
  const [codigo, setCodigo] = useState('');

  const manejarLogin = async (email: string, password: string): Promise<void> => {
    setCargando(true);
    setMensaje('');
    try {
      const resultado = await login(email, password);
      if (resultado.tipo === '2fa') {
        setDesafio({ desafio: resultado.desafio, destino: resultado.destino });
        setCodigo('');
        return;
      }
      // Directo a la ruta final: un salto intermedio por / dejaba a Ionic mostrando "Redirigiendo…".
      navigate(rutaInicialPorRol(resultado.user.rol), { replace: true });
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : 'No se pudo iniciar sesión.');
    } finally {
      setCargando(false);
    }
  };

  const manejarCodigo = async (): Promise<void> => {
    if (!desafio) return;
    if (!/^\d{6}$/.test(codigo)) {
      setMensaje('El código tiene 6 dígitos.');
      return;
    }
    setCargando(true);
    setMensaje('');
    try {
      const usuario = await verificarCodigo(desafio.desafio, codigo);
      navigate(rutaInicialPorRol(usuario.rol), { replace: true });
    } catch (error) {
      const texto = error instanceof Error ? error.message : 'No se pudo verificar el código.';
      setMensaje(texto);
      // Si el desafío venció o se agotaron los intentos, se vuelve a la contraseña.
      if (/venci|vuelve a ingresar/i.test(texto)) setDesafio(null);
    } finally {
      setCargando(false);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle><MarcaTitulo>Municipalidad de Santo Domingo</MarcaTitulo></IonTitle>
          <IonButtons slot="end">
            <TemaBoton />
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <div className="contenedor-auth">
          <div className="logo-municipal">
            <div className="logo-municipal__marca">
              <img
                src="/logo-municipal.png"
                width="70"
                height="113"
                alt="Municipalidad de Santo Domingo, Comuna Parque"
              />
            </div>
            <IonText>
              <h1 data-page-title>Trámites en línea</h1>
              <p>Ingresa con tu cuenta para realizar y seguir tus trámites municipales.</p>
            </IonText>
          </div>

          <IonCard>
            <IonCardContent>
              {desafio === null ? (
                <LoginForm onSubmit={manejarLogin} cargando={cargando} />
              ) : (
                <form
                  noValidate
                  onSubmit={(event) => {
                    event.preventDefault();
                    void manejarCodigo();
                  }}
                >
                  <IonText>
                    <h2 className="titulo-2fa">Verificación en dos pasos</h2>
                    <p>Te enviamos un código de 6 dígitos a <strong>{desafio.destino}</strong>. Vence en 10 minutos.</p>
                  </IonText>
                  <CampoFormulario
                    id="login-codigo"
                    label="Código de acceso"
                    labelPlacement="floating"
                    fill="outline"
                    inputmode="numeric"
                    autocomplete="one-time-code"
                    maxlength={6}
                    value={codigo}
                    className="ion-margin-top"
                    onValorChange={(valor) => setCodigo(valor.replace(/\D/g, '').slice(0, 6))}
                  />
                  <BotonCargando
                    type="submit"
                    expand="block"
                    className="ion-margin-top"
                    cargando={cargando}
                    texto="Verificar e ingresar"
                    textoCargando="Verificando…"
                  />
                  <IonButton fill="clear" expand="block" size="small" onClick={() => { setDesafio(null); setMensaje(''); }}>
                    Volver a ingresar la contraseña (envía un código nuevo)
                  </IonButton>
                </form>
              )}

              {mensaje !== '' ? (
                <IonText color="danger" role="alert" className="error-login">
                  <p>{mensaje}</p>
                </IonText>
              ) : null}

              <IonButton fill="clear" expand="block" size="small" routerLink="/recuperar-password">
                ¿Olvidaste tu contraseña?
              </IonButton>
              <IonButton fill="clear" expand="block" size="small" routerLink="/register">
                ¿No tienes cuenta? Regístrate
              </IonButton>
            </IonCardContent>
          </IonCard>

          {import.meta.env.DEV ? (
            <IonText color="medium" className="ayuda-credenciales">
              <p>Cuentas de prueba: vecino@test.com / funcionario@test.com — contraseña Test1234</p>
            </IonText>
          ) : null}
        </div>


      </IonContent>
    </IonPage>
  );
};

export default LoginPage;
