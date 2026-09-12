# MuniStoDomingo-Tramites

Proyecto del ramo Ingeniería Web y Móvil.

**Link tema proyecto:** https://docs.google.com/spreadsheets/d/1Mfr8R9WWUvdBTjp0MgDnQqwdNZQ0ddDiAtGmlMuQYts/edit?pli=1&gid=2073481615#gid=2073481615

## Integrantes

- Simón Ledezma
- Tomás Monge
- Francisco Espinoza

---

# Entrega Parcial 1 — Checklist

## EP 1.1: Requerimientos

Definición de al menos 7 requerimientos funcionales y al menos 5 no funcionales (rendimiento, seguridad, usabilidad). Estas funcionalidades no pueden ser repetitivas. Estas funcionalidades están fuera de inicio de sesión o registrarse, ya que deben estar inmersas en la propuesta. Dentro de las funcionalidades deben considerar dos tipos de roles (ejemplo: usuario y admin).

## EP 1.2: Justificación del problema y caracterización de usuarios

El equipo deberá describir y justificar el problema que abordará la aplicación, explicando su contexto, relevancia y las consecuencias asociadas a su falta de solución.

Debido a que durante esta etapa no se realizará contacto directo con usuarios, la caracterización de los usuarios objetivo deberá elaborarse mediante investigación documental y análisis de soluciones existentes. Para ello, podrán utilizarse fuentes académicas, informes, estadísticas públicas, sitios institucionales, normativas, casos de estudio y aplicaciones similares.

La entrega deberá incluir:

- Definición del grupo o grupos de usuarios a los cuales estará dirigida la aplicación.
- Descripción general de sus características, necesidades y posibles dificultades.
- Contexto en el que utilizarían la aplicación.
- Objetivos o tareas que realizarían dentro del sistema.
- Nivel estimado de experiencia tecnológica.
- Necesidades de accesibilidad, seguridad o privacidad, cuando corresponda.
- Identificación de los roles considerados en el sistema.
- Elaboración de, al menos, dos perfiles de usuario hipotéticos (proto-personas).
- Identificación de los supuestos utilizados para construir dichos perfiles.

Cada proto-persona deberá incluir, como mínimo:

- Tipo de usuario o rol.
- Características generales.
- Necesidades principales.
- Objetivos de uso.
- Dificultades o puntos de frustración.
- Funcionalidades de la aplicación que utilizaría.
- Dispositivo y contexto probable de acceso.

Los perfiles construidos no deberán presentarse como resultados obtenidos de usuarios reales. El equipo deberá indicar claramente que corresponden a una caracterización preliminar basada en fuentes secundarias y supuestos razonados.

## EP 1.3: Bocetos de UI/UX y prototipo en Figma

Al menos 7 mockups o pantallas distintas, cada una correspondiente a una funcionalidad previamente definida en los requerimientos del proyecto. Cada pantalla deberá presentar un diseño diferenciado, coherente con el flujo de navegación y la jerarquía de información. Las interfaces deberán ser prototipadas considerando explícitamente: versión móvil y web.

El formulario de registro deberá incluir los campos necesarios para identificar y registrar adecuadamente a los usuarios de la aplicación. La selección de estos campos deberá ajustarse al problema abordado, a las características de los usuarios objetivo y a los requerimientos definidos por cada equipo. Los equipos deberán justificar brevemente la información solicitada, evitando incorporar datos personales que no sean necesarios para el funcionamiento de la aplicación. El formulario podrá considerar, por ejemplo, nombre de usuario, correo electrónico, contraseña, confirmación de contraseña, aceptación de términos y condiciones u otros campos pertinentes para la propuesta.

Los formularios de inicio de sesión y registro deberán representar visualmente:

- Campos obligatorios y opcionales.
- Formato esperado de los datos.
- Validaciones de entrada.
- Mensajes de error claros.
- Retroalimentación ante el envío del formulario.
- Condiciones de seguridad aplicables a las contraseñas.
- Una experiencia de uso coherente con los usuarios objetivo.

## EP 1.4: Arquitectura de navegación y experiencia del usuario

El equipo deberá definir la arquitectura de navegación de la aplicación, describiendo la estructura de rutas, jerarquía de vistas y flujo de interacción entre pantallas.

La entrega deberá incluir:

- (a) Rutas principales y secundarias.
- (b) Relaciones jerárquicas entre vistas.
- (c) Flujo de navegación entre funcionalidades.
- (d) Diferenciación de acceso según roles (por ejemplo: usuario / administrador).
- (e) Flujo de las principales tareas (task flow).
- (f) Puntos críticos de interacción.
- (g) Coherencia de experiencia entre dispositivos.
- (h) Breve justificación técnica de las decisiones adoptadas, considerando usabilidad, eficiencia de interacción, claridad estructural y escalabilidad de la arquitectura frontend.

## EP 1.5: Creación del proyecto en Ionic con React

Considerando:

- (a) Uso de React Router.
- (b) Rutas públicas y rutas protegidas.
- (c) Redirecciones (ejemplo: login obligatorio).
- (d) Estructura modular de vistas.

Los equipos podrán apoyarse en asistentes de inteligencia artificial, complementos de Figma o herramientas de generación de código para orientar la implementación de las interfaces. Sin embargo, deberán considerar que el código generado automáticamente puede corresponder a React convencional y no necesariamente ser compatible con la estructura, los componentes y los patrones de navegación propios de Ionic. Por lo tanto, el equipo será responsable de revisar, comprender, corregir y adaptar el código generado para integrarlo adecuadamente en una aplicación desarrollada con Ionic y React.

La implementación final deberá:

- Utilizar componentes propios de Ionic, tales como `IonPage`, `IonHeader`, `IonContent`, `IonMenu`, `IonTabs`, `IonInput` e `IonButton`.
- Integrarse correctamente con la estructura de rutas de la aplicación.
- Mantener una organización modular y comprensible del código.
- Funcionar adecuadamente en versiones móvil y web.
- Respetar el diseño y los flujos definidos en el prototipo de Figma.
- Evitar código innecesario, duplicado o que el equipo no pueda explicar.
- Cumplir con los requerimientos funcionales y no funcionales definidos para el proyecto.

El uso de estas herramientas se considerará solamente un mecanismo de apoyo. No se aceptará como implementación final la copia directa de código generado automáticamente sin revisión, adaptación, integración y validación por parte del equipo.

## EP 1.6: Diseño de pantallas principales

Diseño de pantallas principales incorporando una estructura de navegación funcional y coherente con la arquitectura previamente definida en Ionic-React (al menos 4).

- Uso de componentes propios de Ionic (`IonPage`, `IonHeader`, `IonContent`, `IonTabs`, `IonMenu`, etc.).
- Separación estructural del código en carpetas (`pages`, `components`, `routes`, `services`).
