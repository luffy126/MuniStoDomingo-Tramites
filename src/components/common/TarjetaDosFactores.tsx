import { useEffect, useState } from 'react';
import {
  IonBadge, IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonSkeletonText, IonText,
} from '@ionic/react';
import CampoFormulario from '../forms/CampoFormulario';
import BotonCargando from './BotonCargando';
import { useAuth } from '../../hooks/useAuth';
import { getEstadoDosFactores } from '../../services/authService';
import type { ConfirmacionPendiente } from '../../services/authService';

/**
 * Activar o desactivar la verificación en dos pasos por correo. El cambio pide
 * la contraseña actual y cierra las sesiones abiertas en otros dispositivos.
 */
const TarjetaDosFactores: React.FC = () => {
  const { cambiarDosFactores, confirmarDosFactores } = useAuth();
  const [pendiente, setPendiente] = useState<ConfirmacionPendiente | null>(null);
  const [codigo, setCodigo] = useState('');
  const [activo, setActivo] = useState<boolean | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [password, setPassword] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    let cancelado = false;
    void getEstadoDosFactores()
      .then((valor) => { if (!cancelado) setActivo(valor); })
      .catch(() => { if (!cancelado) setError('No se pudo consultar la verificación en dos pasos.'); });
    return () => { cancelado = true; };
  }, []);

  const confirmar = async (): Promise<void> => {
    if (activo === null) return;
    if (password === '') {
      setError('Ingresa tu contraseña actual.');
      return;
    }
    setGuardando(true);
    setError('');
    try {
      const resultado = await cambiarDosFactores(!activo, password);
      setConfirmando(false);
      setPassword('');
      if (resultado) {
        // Activar exige demostrar que el correo es tuyo: falta el código.
        setPendiente(resultado);
        setCodigo('');
        return;
      }
      setActivo(false);
      setAviso('Desactivaste la verificación en dos pasos.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el cambio.');
    } finally {
      setGuardando(false);
    }
  };

  const confirmarCodigo = async (): Promise<void> => {
    if (!pendiente) return;
    if (!/^\d{6}$/.test(codigo)) {
      setError('El código tiene 6 dígitos.');
      return;
    }
    setGuardando(true);
    setError('');
    try {
      await confirmarDosFactores(pendiente.desafio, codigo);
      setPendiente(null);
      setActivo(true);
      setAviso('Listo: al ingresar te pediremos un código enviado a tu correo.');
    } catch (e) {
      const texto = e instanceof Error ? e.message : 'No se pudo confirmar el código.';
      setError(texto);
      if (/venci|vuelve a activar/i.test(texto)) setPendiente(null);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <IonCard>
      <IonCardHeader>
        <IonCardTitle className="titulo-con-estado">
          Verificación en dos pasos
          {activo === null ? null : (
            <IonBadge color={activo ? 'success' : 'medium'}>{activo ? 'Activa' : 'Inactiva'}</IonBadge>
          )}
        </IonCardTitle>
      </IonCardHeader>
      <IonCardContent>
        <IonText>
          <p>
            Además de tu contraseña, al ingresar te pediremos un código de 6 dígitos que enviamos a tu
            correo. Así nadie puede entrar a tu cuenta solo con la contraseña.
          </p>
        </IonText>

        {activo === null && error === '' ? <IonSkeletonText animated style={{ width: '40%', height: 36 }} /> : null}

        {pendiente ? (
          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              void confirmarCodigo();
            }}
          >
            <IonText>
              <p>
                Para confirmar que el correo es tuyo, ingresa el código que enviamos a{' '}
                <strong>{pendiente.destino}</strong>. Vence en 10 minutos.
              </p>
            </IonText>
            <CampoFormulario
              id="dos-factores-codigo"
              label="Código de confirmación"
              labelPlacement="floating"
              fill="outline"
              inputmode="numeric"
              autocomplete="one-time-code"
              maxlength={6}
              value={codigo}
              error={error || undefined}
              className="ion-margin-top"
              onValorChange={(valor) => setCodigo(valor.replace(/\D/g, '').slice(0, 6))}
            />
            <div className="fila-botones">
              <BotonCargando type="submit" cargando={guardando} texto="Confirmar y activar" textoCargando="Confirmando…" />
              <IonButton fill="clear" onClick={() => { setPendiente(null); setError(''); }}>
                Cancelar
              </IonButton>
            </div>
          </form>
        ) : null}

        {activo !== null && !confirmando && !pendiente ? (
          <IonButton
            className="ion-margin-top"
            fill={activo ? 'outline' : 'solid'}
            color={activo ? 'danger' : 'primary'}
            onClick={() => { setConfirmando(true); setAviso(''); setError(''); }}
          >
            {activo ? 'Desactivar' : 'Activar'}
          </IonButton>
        ) : null}

        {confirmando ? (
          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              void confirmar();
            }}
          >
            <CampoFormulario
              id="dos-factores-password"
              label="Contraseña actual"
              labelPlacement="floating"
              fill="outline"
              type="password"
              autocomplete="current-password"
              value={password}
              error={error || undefined}
              className="ion-margin-top"
              onValorChange={setPassword}
            />
            <div className="fila-botones">
              <BotonCargando
                type="submit"
                cargando={guardando}
                texto={activo ? 'Confirmar y desactivar' : 'Enviar código a mi correo'}
                textoCargando="Guardando…"
              />
              <IonButton fill="clear" onClick={() => { setConfirmando(false); setPassword(''); setError(''); }}>
                Cancelar
              </IonButton>
            </div>
          </form>
        ) : null}

        {!confirmando && !pendiente && error ? <IonText color="danger" role="alert"><p>{error}</p></IonText> : null}
        {aviso ? <IonText color="success" role="status"><p>{aviso}</p></IonText> : null}
      </IonCardContent>
    </IonCard>
  );
};

export default TarjetaDosFactores;
