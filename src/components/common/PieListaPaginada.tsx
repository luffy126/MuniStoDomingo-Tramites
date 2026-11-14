import { IonButton, IonSpinner, IonText } from '@ionic/react';
import type { Paginacion } from '../../services/apiClient';

interface Props {
  pagination: Paginacion | null;
  cargados: number;
  cargandoMas: boolean;
  onCargarMas: () => void;
}

/** Pie de un listado paginado: cuántos se muestran del total y el botón "Cargar más". */
const PieListaPaginada: React.FC<Props> = ({ pagination, cargados, cargandoMas, onCargarMas }) => {
  if (!pagination || cargados === 0) return null;
  return (
    <div className="ion-text-center ion-padding">
      <IonText color="medium"><p>Mostrando {cargados} de {pagination.total}</p></IonText>
      {pagination.hasNext ? (
        <IonButton fill="outline" disabled={cargandoMas} onClick={onCargarMas}>
          {cargandoMas ? <IonSpinner name="dots" /> : 'Cargar más'}
        </IonButton>
      ) : null}
    </div>
  );
};

export default PieListaPaginada;
