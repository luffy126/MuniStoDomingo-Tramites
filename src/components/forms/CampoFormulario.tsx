import type { ComponentProps } from 'react';
import { IonInput, IonNote } from '@ionic/react';

type IonInputProps = ComponentProps<typeof IonInput>;

interface CampoFormularioProps
  extends Omit<IonInputProps, 'value' | 'onIonInput' | 'id'> {
  id: string;
  value: string;
  error?: string;
  onValorChange: (valor: string) => void;
}

/**
 * Input de formulario con label, error asociado y atributos ARIA.
 * El error se anuncia con role="alert" y queda vinculado por aria-describedby.
 */
const CampoFormulario: React.FC<CampoFormularioProps> = ({
  id,
  value,
  error,
  onValorChange,
  ...props
}) => {
  const idError = `${id}-error`;
  return (
    <>
      <IonInput
        {...props}
        id={id}
        value={value}
        aria-invalid={error !== undefined}
        aria-describedby={error !== undefined ? idError : undefined}
        onIonInput={(event) => onValorChange(event.detail.value ?? '')}
      />
      {error !== undefined ? (
        <IonNote id={idError} color="danger" className="mensaje-error" role="alert">
          {error}
        </IonNote>
      ) : null}
    </>
  );
};

export default CampoFormulario;
