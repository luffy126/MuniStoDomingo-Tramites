import type { ComponentProps } from 'react';
import { IonButton, IonSpinner } from '@ionic/react';

type BotonProps = Omit<ComponentProps<typeof IonButton>, 'children'>;

interface BotonCargandoProps extends BotonProps {
  cargando: boolean;
  texto: string;
  textoCargando?: string;
}

/**
 * Botón que conserva un nombre accesible mientras carga.
 * No reemplaza el texto por un spinner suelto: agrega el spinner y mantiene la etiqueta.
 */
const BotonCargando: React.FC<BotonCargandoProps> = ({
  cargando,
  texto,
  textoCargando,
  disabled,
  ...props
}) => (
  <IonButton {...props} disabled={disabled === true || cargando} aria-busy={cargando}>
    {cargando ? <IonSpinner name="dots" aria-hidden="true" /> : null}
    {cargando ? textoCargando ?? texto : texto}
  </IonButton>
);

export default BotonCargando;
