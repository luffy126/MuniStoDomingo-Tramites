import { IonButton, IonIcon, IonItem, IonLabel, IonToggle } from '@ionic/react';
import { moonOutline, sunnyOutline } from 'ionicons/icons';
import { cambiarTema, useTema } from '../../hooks/useTema';

/** Botón de ícono para las barras de encabezado. */
export const TemaBoton: React.FC = () => {
  const tema = useTema();
  const oscuro = tema === 'oscuro';

  return (
    <IonButton
      aria-label={oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      onClick={() => cambiarTema(oscuro ? 'claro' : 'oscuro')}
    >
      <IonIcon slot="icon-only" aria-hidden="true" icon={oscuro ? sunnyOutline : moonOutline} />
      {/* Nombre por contenido: el aria-label de ion-button no siempre llega al DOM. */}
      <span className="sr-only">{oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}</span>
    </IonButton>
  );
};

/** Fila con interruptor para listas (perfil y menú del funcionario). */
export const TemaItem: React.FC<{ lines?: 'full' | 'inset' | 'none' }> = ({ lines }) => {
  const tema = useTema();

  return (
    <IonItem lines={lines}>
      <IonIcon icon={tema === 'oscuro' ? moonOutline : sunnyOutline} color="primary" slot="start" aria-hidden="true" />
      <IonLabel>Modo oscuro</IonLabel>
      <IonToggle
        slot="end"
        aria-label="Modo oscuro"
        checked={tema === 'oscuro'}
        onIonChange={(event) => cambiarTema(event.detail.checked ? 'oscuro' : 'claro')}
      />
    </IonItem>
  );
};
