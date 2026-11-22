import { useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  IonBackButton, IonButton, IonButtons, IonCard, IonCardContent, IonCardHeader, IonCardTitle,
  IonContent, IonHeader, IonPage, IonText, IonTitle, IonToolbar,
} from '@ionic/react';
import CampoFormulario from '../../components/forms/CampoFormulario';
import BotonCargando from '../../components/common/BotonCargando';
import { useTituloPagina } from '../../hooks/useTituloPagina';
import MarcaTitulo from '../../components/common/MarcaTitulo';
import { enfocarPrimerError } from '../../utils/formulario';
import { validarConfirmacion, validarEmail, validarPassword } from '../../utils/validators';
import { restablecerPassword, solicitarRecuperacion } from '../../services/authService';

const TOKEN_VALIDO = /^[a-f0-9]{64}$/i;

const RecuperarPasswordPage: React.FC = () => {
  useTituloPagina('Recuperar contraseña');
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const modoNueva = token !== '';
  const formRef = useRef<HTMLFormElement>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [errores, setErrores] = useState<{ email?: string; password?: string; confirmacion?: string }>({});
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [tipoMensaje, setTipoMensaje] = useState<'success' | 'danger'>('danger');

  const solicitar = async (): Promise<void> => {
    const errorEmail = validarEmail(email);
    setErrores({ email: errorEmail });
    if (errorEmail !== undefined) {
      window.setTimeout(() => enfocarPrimerError(formRef.current), 0);
      return;
    }
    setEnviando(true);
    try {
      await solicitarRecuperacion(email);
      setTipoMensaje('success');
      setMensaje('Si el correo está registrado, recibirás un enlace para restablecer tu contraseña. Revisa también la carpeta de spam.');
    } catch (error) {
      setTipoMensaje('danger');
      setMensaje(error instanceof Error ? error.message : 'No pudimos enviar el enlace. Inténtalo de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  const restablecer = async (): Promise<void> => {
    const nuevos = {
      password: validarPassword(password),
      confirmacion: validarConfirmacion(password, confirmacion),
    };
    setErrores(nuevos);
    if (nuevos.password !== undefined || nuevos.confirmacion !== undefined) {
      window.setTimeout(() => enfocarPrimerError(formRef.current), 0);
      return;
    }
    setEnviando(true);
    try {
      await restablecerPassword(token, password);
      setTipoMensaje('success');
      setMensaje('Tu contraseña se actualizó. Ya puedes ingresar con la nueva.');
      setPassword('');
      setConfirmacion('');
    } catch (error) {
      setTipoMensaje('danger');
      setMensaje(error instanceof Error ? error.message : 'No pudimos cambiar la contraseña. Solicita un enlace nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  const tokenInvalido = modoNueva && !TOKEN_VALIDO.test(token);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/login" text="Volver" />
          </IonButtons>
          <IonTitle><MarcaTitulo>Recuperar contraseña</MarcaTitulo></IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="contenedor-auth">
          <h1 data-page-title>Recuperar contraseña</h1>
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>
                {tokenInvalido ? 'Enlace no válido' : modoNueva ? 'Crea una contraseña nueva' : 'Te enviaremos un enlace'}
              </IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              {tokenInvalido ? (
                <IonText color="danger" role="alert">
                  <p>El enlace está incompleto o no es válido. Solicita uno nuevo desde el inicio de sesión.</p>
                </IonText>
              ) : (
                <form
                  ref={formRef}
                  noValidate
                  onSubmit={(event) => {
                    event.preventDefault();
                    void (modoNueva ? restablecer() : solicitar());
                  }}
                >
                  {modoNueva ? (
                    <>
                      <CampoFormulario
                        id="recuperar-password"
                        label="Nueva contraseña"
                        labelPlacement="floating"
                        fill="outline"
                        type="password"
                        autocomplete="new-password"
                        value={password}
                        error={errores.password}
                        onValorChange={setPassword}
                      />
                      <CampoFormulario
                        id="recuperar-confirmacion"
                        label="Confirmar contraseña"
                        labelPlacement="floating"
                        fill="outline"
                        type="password"
                        autocomplete="new-password"
                        value={confirmacion}
                        error={errores.confirmacion}
                        className="ion-margin-top"
                        onValorChange={setConfirmacion}
                      />
                    </>
                  ) : (
                    <CampoFormulario
                      id="recuperar-email"
                      label="Correo electrónico"
                      labelPlacement="floating"
                      fill="outline"
                      type="email"
                      inputmode="email"
                      autocomplete="email"
                      value={email}
                      error={errores.email}
                      onValorChange={setEmail}
                    />
                  )}

                  <BotonCargando
                    type="submit"
                    expand="block"
                    className="ion-margin-top"
                    cargando={enviando}
                    texto={modoNueva ? 'Cambiar contraseña' : 'Enviar enlace'}
                    textoCargando={modoNueva ? 'Cambiando…' : 'Enviando…'}
                  />
                </form>
              )}

              {mensaje !== '' ? (
                <IonText color={tipoMensaje} role="alert">
                  <p className="ion-margin-top">{mensaje}</p>
                </IonText>
              ) : null}

              <IonButton fill="clear" expand="block" className="ion-margin-top" routerLink="/login">
                Volver a ingresar
              </IonButton>
            </IonCardContent>
          </IonCard>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default RecuperarPasswordPage;
