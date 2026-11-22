import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IonButtons,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonText,
  IonTitle,
  IonToast,
  IonToolbar,
} from '@ionic/react';
import {
  callOutline, locationOutline, logOutOutline, mailOutline, personCircleOutline,
  shieldCheckmarkOutline,
} from 'ionicons/icons';
import { useAuth } from '../../hooks/useAuth';
import { useTituloPagina } from '../../hooks/useTituloPagina';
import MarcaTitulo from '../../components/common/MarcaTitulo';
import TarjetaDosFactores from '../../components/common/TarjetaDosFactores';
import {
  validarDireccion, validarEmail, validarNombre, validarTelefono,
} from '../../utils/validators';
import { enfocarPrimerError } from '../../utils/formulario';
import CampoFormulario from '../../components/forms/CampoFormulario';
import BotonCargando from '../../components/common/BotonCargando';
import { TemaBoton, TemaItem } from '../../components/common/TemaToggle';

interface ErroresPerfil {
  nombre?: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  passwordActual?: string;
}

type CampoPerfil = Exclude<keyof ErroresPerfil, 'passwordActual'>;

const PerfilPage: React.FC = () => {
  useTituloPagina('Mi perfil');
  const { user, logout, actualizarPerfil } = useAuth();
  const navigate = useNavigate();
  const [nombre, setNombre] = useState(user?.nombre ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [telefono, setTelefono] = useState(user?.telefono ?? '');
  const [direccion, setDireccion] = useState(user?.direccion ?? '');
  const [passwordActual, setPasswordActual] = useState('');
  const [errores, setErrores] = useState<ErroresPerfil>({});
  const [tocados, setTocados] = useState<Record<CampoPerfil, boolean>>({
    nombre: false,
    email: false,
    telefono: false,
    direccion: false,
  });
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [tipoMensaje, setTipoMensaje] = useState<'success' | 'danger'>('success');
  const formRef = useRef<HTMLFormElement>(null);

  const cerrarSesion = (): void => {
    logout();
    navigate('/login', { replace: true });
  };

  // Cambiar el email exige confirmar la contraseña actual (lo valida el backend).
  const cambiaEmail = email.trim().toLowerCase() !== (user?.email ?? '').trim().toLowerCase();
  const validarPasswordActual = (valor: string): string | undefined =>
    cambiaEmail && valor === '' ? 'Ingresa tu contraseña actual para cambiar el email' : undefined;

  const sinCambios =
    nombre.trim() === (user?.nombre ?? '') &&
    email.trim().toLowerCase() === (user?.email ?? '').trim().toLowerCase() &&
    telefono.trim() === (user?.telefono ?? '') &&
    direccion.trim() === (user?.direccion ?? '');

  const validar = (): ErroresPerfil => ({
    nombre: validarNombre(nombre),
    email: validarEmail(email),
    telefono: validarTelefono(telefono),
    direccion: validarDireccion(direccion),
    passwordActual: validarPasswordActual(passwordActual),
  });

  // Aviso del navegador si cierra la pestaña con cambios sin guardar.
  useEffect(() => {
    if (sinCambios) return;
    const avisar = (event: BeforeUnloadEvent): void => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', avisar);
    return () => window.removeEventListener('beforeunload', avisar);
  }, [sinCambios]);

  const actualizarCampo = (campo: CampoPerfil, valor: string): void => {
    if (campo === 'nombre') setNombre(valor);
    if (campo === 'email') setEmail(valor);
    if (campo === 'telefono') setTelefono(valor);
    if (campo === 'direccion') setDireccion(valor);
    if (!tocados[campo]) return;

    const validaciones: Record<CampoPerfil, (v: string) => string | undefined> = {
      nombre: validarNombre,
      email: validarEmail,
      telefono: validarTelefono,
      direccion: validarDireccion,
    };
    setErrores((previos) => ({ ...previos, [campo]: validaciones[campo](valor) }));
  };

  const guardarCambios = async (): Promise<void> => {
    const nuevos = validar();
    setTocados({ nombre: true, email: true, telefono: true, direccion: true });
    setErrores(nuevos);
    if (Object.values(nuevos).some((error) => error !== undefined)) {
      window.setTimeout(() => enfocarPrimerError(formRef.current), 0);
      return;
    }

    setGuardando(true);
    try {
      await actualizarPerfil({
        nombre: nombre.trim(),
        email: email.trim(),
        telefono: telefono.trim(),
        direccion: direccion.trim(),
        ...(cambiaEmail ? { passwordActual } : {}),
      });
      setPasswordActual('');
      setErrores((previos) => ({ ...previos, passwordActual: undefined }));
      setTipoMensaje('success');
      setMensaje('Perfil actualizado.');
    } catch (error) {
      setTipoMensaje('danger');
      setMensaje(error instanceof Error ? error.message : 'No se pudo actualizar el perfil.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle><MarcaTitulo>Mi perfil</MarcaTitulo></IonTitle>
        <IonButtons slot="end"><TemaBoton /></IonButtons></IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="contenedor-pagina">
          <h1 className="sr-only" data-page-title>Mi perfil</h1>
          <IonCard>
            <IonCardContent>
              <div className="perfil-encabezado">
                <IonIcon icon={personCircleOutline} color="primary" aria-hidden="true" />
                <IonText>
                  <h2>{user?.nombre ?? 'Vecino'}</h2>
                  <p>Cuenta de vecino de Santo Domingo</p>
                </IonText>
              </div>
            </IonCardContent>
          </IonCard>

          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Editar datos</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <form
                ref={formRef}
                noValidate
                onSubmit={(event) => {
                  event.preventDefault();
                  void guardarCambios();
                }}
              >
                <CampoFormulario
                  id="perfil-nombre"
                  label="Nombre completo"
                  labelPlacement="floating"
                  fill="outline"
                  autocomplete="name"
                  value={nombre}
                  error={errores.nombre}
                  onValorChange={(valor) => actualizarCampo('nombre', valor)}
                  onIonBlur={() => {
                    setTocados((previos) => ({ ...previos, nombre: true }));
                    setErrores((previos) => ({ ...previos, nombre: validarNombre(nombre) }));
                  }}
                />

                <CampoFormulario
                  id="perfil-email"
                  label="Correo electrónico"
                  labelPlacement="floating"
                  fill="outline"
                  type="email"
                  inputmode="email"
                  autocomplete="email"
                  value={email}
                  error={errores.email}
                  className="ion-margin-top"
                  onValorChange={(valor) => actualizarCampo('email', valor)}
                  onIonBlur={() => {
                    setTocados((previos) => ({ ...previos, email: true }));
                    setErrores((previos) => ({ ...previos, email: validarEmail(email) }));
                  }}
                />

                {cambiaEmail ? (
                  <CampoFormulario
                    id="perfil-password-actual"
                    label="Contraseña actual (para cambiar el email)"
                    labelPlacement="floating"
                    fill="outline"
                    type="password"
                    autocomplete="current-password"
                    value={passwordActual}
                    error={errores.passwordActual}
                    className="ion-margin-top"
                    onValorChange={(valor) => {
                      setPasswordActual(valor);
                      if (errores.passwordActual !== undefined) {
                        setErrores((previos) => ({ ...previos, passwordActual: validarPasswordActual(valor) }));
                      }
                    }}
                  />
                ) : null}

                <CampoFormulario
                  id="perfil-telefono"
                  label="Teléfono de contacto (opcional)"
                  labelPlacement="floating"
                  fill="outline"
                  type="tel"
                  inputmode="tel"
                  autocomplete="tel"
                  value={telefono}
                  error={errores.telefono}
                  className="ion-margin-top"
                  onValorChange={(valor) => actualizarCampo('telefono', valor)}
                  onIonBlur={() => {
                    setTocados((previos) => ({ ...previos, telefono: true }));
                    setErrores((previos) => ({ ...previos, telefono: validarTelefono(telefono) }));
                  }}
                />

                <CampoFormulario
                  id="perfil-direccion"
                  label="Dirección (opcional)"
                  labelPlacement="floating"
                  fill="outline"
                  autocomplete="street-address"
                  value={direccion}
                  error={errores.direccion}
                  className="ion-margin-top"
                  onValorChange={(valor) => actualizarCampo('direccion', valor)}
                  onIonBlur={() => {
                    setTocados((previos) => ({ ...previos, direccion: true }));
                    setErrores((previos) => ({ ...previos, direccion: validarDireccion(direccion) }));
                  }}
                />

                <BotonCargando
                  type="submit"
                  expand="block"
                  className="ion-margin-top"
                  cargando={guardando}
                  disabled={sinCambios}
                  texto="Guardar cambios"
                  textoCargando="Guardando…"
                />
              </form>
            </IonCardContent>
          </IonCard>

          <TarjetaDosFactores />

          <IonList inset>
            <IonItem>
              <IonIcon icon={mailOutline} color="primary" slot="start" aria-hidden="true" />
              <IonLabel className="ion-text-wrap">
                <h3>Correo</h3>
                <p>{user?.email ?? '—'}</p>
              </IonLabel>
            </IonItem>
            <IonItem>
              <IonIcon icon={callOutline} color="primary" slot="start" aria-hidden="true" />
              <IonLabel className="ion-text-wrap">
                <h3>Teléfono</h3>
                <p>{user?.telefono ?? 'Sin teléfono registrado'}</p>
              </IonLabel>
            </IonItem>
            <IonItem>
              <IonIcon icon={locationOutline} color="primary" slot="start" aria-hidden="true" />
              <IonLabel className="ion-text-wrap">
                <h3>Dirección</h3>
                <p>{user?.direccion ?? 'Sin dirección registrada'}</p>
              </IonLabel>
            </IonItem>
            <IonItem>
              <IonIcon icon={shieldCheckmarkOutline} color="primary" slot="start" aria-hidden="true" />
              <IonLabel className="ion-text-wrap">
                <h3>Rol</h3>
                <p>{user?.rol === 'funcionario' ? 'Funcionario municipal' : 'Vecino'}</p>
              </IonLabel>
            </IonItem>
            <TemaItem />
          </IonList>

          <IonButton expand="block" color="danger" onClick={cerrarSesion}>
            <IonIcon icon={logOutOutline} slot="start" aria-hidden="true" />
            Cerrar sesión
          </IonButton>
        </div>
        <IonToast isOpen={mensaje !== ''} message={mensaje} duration={3500} color={tipoMensaje} onDidDismiss={() => setMensaje('')} />
      </IonContent>
    </IonPage>
  );
};

export default PerfilPage;
