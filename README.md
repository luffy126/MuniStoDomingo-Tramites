# MuniStoDomingo-Tramites
Proyecto del ramo Ingeniería Web y Móvil
## Integrantes: Simón Ledezma, Tomás Monge y Francisco Espinoza

# ENTREGA PARCIAL 1 CHECKLIST:

-  1.1: Definición de al menos 7 requerimientos funcionales y al
menos 5 no funcionales (rendimiento, seguridad, usabilidad). Estas
funcionalidades no pueden ser repetitivas. Estas funcionalidades
están fuera de inicio de sesión o registrarse ya que deben estar
inmersas en la propuesta. Dentro de las funcionalidades deben
considerar dos tipos de roles (ejemplo: usuario y admin).

- 1.2. Justificación del problema y caracterización de
los usuarios objetivo. El equipo deberá describir y justificar
el problema que abordará la aplicación, explicando su contexto,
relevancia y las consecuencias asociadas a su falta de solución. Debido a que durante esta etapa no se realizará contacto directo con
usuarios, la caracterización de los usuarios objetivo deberá elaborarse mediante investigación documental y análisis de soluciones
existentes. Para ello, podrán utilizarse fuentes académicas, informes, estadísticas públicas, sitios institucionales, normativas, casos
de estudio y aplicaciones similares. La entrega deberá incluir:

  - definici´on del grupo o grupos de usuarios a los cuales estar´a
dirigida la aplicaci´on;
  - descripci´on general de sus caracter´ısticas, necesidades y posibles dificultades;
  - contexto en el que utilizar´ıan la aplicaci´on;
  - objetivos o tareas que realizar´ıan dentro del sistema;
  - nivel estimado de experiencia tecnol´ogica;
  - necesidades de accesibilidad, seguridad o privacidad, cuando
corresponda;
  - identificaci´on de los roles considerados en el sistema;
  - elaboraci´on de, al menos, dos perfiles de usuario hipot´eticos


  - proto-personas;
  - identificaci´on de los supuestos utilizados para construir dichos
perfiles.
Cada proto-persona deber´a incluir, como m´ınimo:
  - tipo de usuario o rol;
  - caracter´ısticas generales;
  - necesidades principales;
  - objetivos de uso;
  - dificultades o puntos de frustraci´on;
  - funcionalidades de la aplicaci´on que utilizar´ıa;
  - dispositivo y contexto probable de acceso.
Los perfiles construidos no deber´an presentarse como resultados
obtenidos de usuarios reales. El equipo deber´a indicar claramente que corresponden a una caracterizaci´on preliminar basada en
fuentes secundarias y supuestos razonados.

- EP 1.3: Bocetos de UI/UX y prototipo en Figma de al menos 7 mockups o pantallas distintas, cada una correspondiente
a una funcionalidad previamente definida en los requerimientos
del proyecto. Cada pantalla deber´a presentar un dise˜no diferenciado, coherente con el flujo de navegaci´on y la jerarqu´ıa de informaci´on. Las interfaces deber´as ser prototipadas considerando
expl´ıcitamente: versi´on m´ovil y web.

  - El formulario de registro deber´a incluir los campos necesarios para
identificar y registrar adecuadamente a los usuarios de la aplicaci´on. La selecci´on de estos campos deber´a ajustarse al problema
abordado, a las caracter´ısticas de los usuarios objetivo y a los
requerimientos definidos por cada equipo. Los equipos deber´an
justificar brevemente la informaci´on solicitada, evitando incorporar datos personales que no sean necesarios para el funcionamiento de la aplicaci´on. El formulario podr´a considerar, por ejemplo,
nombre de usuario, correo electr´onico, contrase˜na, confirmaci´on de
contrase˜na, aceptaci´on de t´erminos y condiciones u otros campos
pertinentes para la propuesta. Los formularios de inicio de sesi´on
y registro deber´an representar visualmente:
    - campos obligatorios y opcionales;
    - formato esperado de los datos;
    - validaciones de entrada;
    - mensajes de error claros;
    - retroalimentaci´on ante el env´ıo del formulario;
    - condiciones de seguridad aplicables a las contrase˜nas
    - una experiencia de uso coherente con los usuarios objetivo.
   
- 1.4: Definici´on de Arquitectura de Navegaci´on y Experiencia
del Usuario. El equipo deber´a definir la arquitectura de navegaci´on de la aplicaci´on, describiendo la estructura de rutas, jerarqu´ıa de vistas, y flujo de interacci´on entre pantallas. La entrega
deber´a incluir:
  - (a) Rutas principales y secundarias;
  - (b) Relaciones
jer´arquicas entre vistas;
  - (c) Flujo de navegaci´on entre funcionalidades;
  - (d) diferenciaci´on de acceso seg´un roles (por ejemplo: usuario /administrador);
  - (e) flujo de principales tareas (task flow),
  - (f) puntos cr´ıticos de interacci´on;
  - (g) coherencia de experiencia entre dispositivos;
  - (h) breve justificaci´on t´ecnica de las decisiones adoptadas, considerando usabilidad, eficiencia de interacci´on, claridad estructural y escalabilidad de la arquitectura frontend.

- 1.5: Creaci´on del proyecto en Ionic con React, considerando:
  - (a) Uso de react router;
  - (b) Rutas p´ublicas y rutas protegidas;
  - (c) Redirecciones (ejemplo: login obligatorio);
  - (d) Estructura modular de vistas.
Los equipos podr´an apoyarse en asistentes de inteligencia artificial,
complementos de Figma o herramientas de generaci´on de c´odigo
para orientar la implementaci´on de las interfaces. Sin embargo,
deber´an considerar que el c´odigo generado autom´aticamente puede corresponder a React convencional y no necesariamente ser
compatible con la estructura, los componentes y los patrones de
navegaci´on propios de Ionic. Por lo tanto, el equipo ser´a responsable de revisar, comprender, corregir y adaptar el c´odigo generado
para integrarlo adecuadamente en una aplicaci´on desarrollada con
Ionic y React. La implementaci´on final deber´a:
  - utilizar componentes propios de Ionic, tales como IonPage,
IonHeader, IonContent, IonMenu, IonTabs, IonInput e IonButton;
  - integrarse correctamente con la estructura de rutas de la aplicaci´on;
  - mantener una organizaci´on modular y comprensible del c´odigo;
  - funcionar adecuadamente en versiones m´ovil y web;
  - respetar el dise˜no y los flujos definidos en el prototipo de Figma;
  - evitar c´odigo innecesario, duplicado o que el equipo no pueda explicar;
  - cumplir con los requerimientos funcionales y no funcionales
definidos para el proyecto.
El uso de estas herramientas se considerar´a solamente un mecanismo de apoyo. No se aceptar´a como implementaci´on final la copia
directa de c´odigo generado autom´aticamente sin revisi´on, adaptaci´on, integraci´on y validaci´on por parte del equipo.

- EP 1.6: Dise˜no de pantallas principales e incorporando una estructura de navegaci´on funcional y coherente con la arquitectura
previamente definida en ionic-react (al menos 4).
  - Uso de componentes propios de Ionic (IonPage, IonHeader, IonContent, IonTabs, IonMenu, etc).
  - Separaci´on estructural del c´odigo en carpetas
(pages, components, routes, services).
