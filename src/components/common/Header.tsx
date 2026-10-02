import { IonBackButton, IonButtons, IonHeader, IonMenuButton, IonTitle, IonToolbar } from '@ionic/react';

interface HeaderProps {
  titulo: string;
  rutaVolver?: string;
  conMenu?: boolean;
}

const Header: React.FC<HeaderProps> = ({ titulo, rutaVolver, conMenu = false }) => (
  <IonHeader>
    <IonToolbar color="primary">
      <IonButtons slot="start">
        {conMenu ? <IonMenuButton /> : null}
        {rutaVolver !== undefined ? <IonBackButton defaultHref={rutaVolver} text="Volver" /> : null}
      </IonButtons>
      <IonTitle>{titulo}</IonTitle>
    </IonToolbar>
  </IonHeader>
);

export default Header;
