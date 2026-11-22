import { IonRefresher, IonRefresherContent } from '@ionic/react';
import type { RefresherEventDetail } from '@ionic/react';

interface RecargarAlTirarProps {
  /** Vuelve a pedir los datos. Puede fallar: la página muestra su propio aviso de error. */
  onRecargar: () => Promise<unknown>;
}

/**
 * Gesto de tirar hacia abajo para recargar. Va como primer hijo de <IonContent>.
 * Cierra el indicador siempre, también si la recarga falla: si no, quedaría girando.
 */
const RecargarAlTirar: React.FC<RecargarAlTirarProps> = ({ onRecargar }) => {
  const recargar = (evento: CustomEvent<RefresherEventDetail>): void => {
    void onRecargar()
      .catch(() => undefined)
      .finally(() => evento.detail.complete());
  };

  return (
    <IonRefresher slot="fixed" onIonRefresh={recargar}>
      <IonRefresherContent pullingText="Desliza para actualizar" refreshingSpinner="crescent" refreshingText="Actualizando…" />
    </IonRefresher>
  );
};

export default RecargarAlTirar;
