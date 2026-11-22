import { useEffect, useState } from 'react';
import { IonIcon, IonText } from '@ionic/react';
import { wifiOutline } from 'ionicons/icons';

/**
 * Aviso global de conectividad. Evita dejar al usuario ante un spinner infinito
 * cuando el fallo es de red: ofrece reintentar y no interactúa con la API.
 */
const AvisoOffline: React.FC = () => {
  const [enLinea, setEnLinea] = useState<boolean>(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );

  useEffect(() => {
    const actualizar = (): void => setEnLinea(navigator.onLine);
    window.addEventListener('online', actualizar);
    window.addEventListener('offline', actualizar);
    return () => {
      window.removeEventListener('online', actualizar);
      window.removeEventListener('offline', actualizar);
    };
  }, []);

  if (enLinea) return null;

  return (
    <div className="aviso-conexion" role="status" aria-live="polite">
      <IonIcon icon={wifiOutline} aria-hidden="true" />
      <IonText>
        <span>Sin conexión. Revisa tu red e inténtalo de nuevo.</span>
      </IonText>
      <button type="button" onClick={() => window.location.reload()}>
        Reintentar
      </button>
    </div>
  );
};

export default AvisoOffline;
