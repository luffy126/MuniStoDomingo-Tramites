import { TemaBoton } from './TemaToggle';
import { IonBackButton, IonButtons, IonHeader, IonMenuButton, IonTitle, IonToolbar } from '@ionic/react';
import { useTituloPagina } from '../../hooks/useTituloPagina';
import MarcaTitulo from './MarcaTitulo';

interface HeaderProps {
  titulo: string;
  rutaVolver?: string;
  conMenu?: boolean;
}

const Header: React.FC<HeaderProps> = ({ titulo, rutaVolver, conMenu = false }) => {
  useTituloPagina(titulo);

  return (
    <IonHeader>
      <IonToolbar color="primary">
        <IonButtons slot="start">
          {conMenu ? <IonMenuButton /> : null}
          {rutaVolver !== undefined ? <IonBackButton defaultHref={rutaVolver} text="Volver" /> : null}
        </IonButtons>
        <IonTitle><MarcaTitulo>{titulo}</MarcaTitulo></IonTitle>
        <h1 className="sr-only" data-page-title>{titulo}</h1>
        <IonButtons slot="end"><TemaBoton /></IonButtons>
      </IonToolbar>
    </IonHeader>
  );
};

export default Header;
