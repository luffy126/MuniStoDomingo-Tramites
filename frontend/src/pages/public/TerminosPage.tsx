import {
  IonContent, IonPage, IonText,
} from '@ionic/react';
import Header from '../../components/common/Header';

const TerminosPage: React.FC = () => (
  <IonPage>
    <Header titulo="Términos y privacidad" rutaVolver="/login" />
    <IonContent>
      <div className="contenedor-pagina">
        <IonText>
          <h2>Términos y condiciones de uso</h2>
          <p>
            Este sitio permite a los vecinos de Santo Domingo presentar solicitudes de
            trámites municipales y revisar su estado. Al crear una cuenta te comprometes a
            entregar información verdadera, completa y actualizada.
          </p>
          <p>
            El folio de cada solicitud es personal. Debes mantener la confidencialidad de tu
            contraseña y avisar al municipio si detectas un uso no autorizado de tu cuenta.
          </p>

          <h2>Datos personales</h2>
          <p>
            La Municipalidad de Santo Domingo trata tus datos (nombre, correo, teléfono y
            dirección) solo para gestionar los trámites que solicitas, enviarte avisos sobre
            su estado y cumplir obligaciones legales. No se usan para publicidad ni se
            venden a terceros.
          </p>
          <p>
            Puedes solicitar la corrección o eliminación de tus datos escribiendo a la
            Oficina de Partes de la Municipalidad. Algunos antecedentes deben conservarse
            mientras el trámite esté vigente o por exigencias legales.
          </p>

          <h2>Uso correcto del sitio</h2>
          <p>
            No está permitido intentar acceder a cuentas ajenas, automatizar envíos masivos,
            subir archivos maliciosos ni interferir con el funcionamiento del servicio. El
            municipio puede suspender el acceso ante un uso abusivo.
          </p>
          <p>
            Las solicitudes quedan sujetas a la revisión de los antecedentes y a la
            normativa municipal aplicable. La respuesta del municipio no constituye una
            aprobación automática del trámite.
          </p>
        </IonText>
      </div>
    </IonContent>
  </IonPage>
);

export default TerminosPage;
