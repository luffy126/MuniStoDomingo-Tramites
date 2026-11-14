# EP 1.2 — Justificación del problema y caracterización de usuarios

> **Nota:** Esta caracterización es preliminar, elaborada mediante investigación documental y análisis de soluciones existentes. Los perfiles de usuario presentados no corresponden a resultados obtenidos de usuarios reales, sino a una construcción hipotética basada en fuentes secundarias y supuestos razonados.

---

## 1. Descripción y justificación del problema

### 1.1 Contexto

En Chile, los municipios constituyen la unidad administrativa más cercana a la ciudadanía. La Municipalidad de Santo Domingo (Región de Valparaíso) atiende una comuna con características predominantemente rurales y costeras, con una población cercana a los 10.000 habitantes según el Censo 2017, cifra que se multiplica durante la temporada estival por el turismo.

<!-- TODO: verificar cifra exacta del Censo y agregar fuente -->

### 1.2 Problema identificado

Actualmente, los vecinos que necesitan realizar un trámite municipal (certificado de residencia, permiso de circulación, reclamos, solicitudes varias) deben:

- Asistir presencialmente a las oficinas municipales en horario laboral (lunes a viernes, 08:30–14:00 aprox.).
- Desconocer con anticipación los requisitos documentales de cada trámite, lo que genera múltiples visitas.
- Enfrentar filas y tiempos de espera sin garantía de atención.
- No contar con un canal para consultar el estado de su solicitud una vez ingresada.

Desde la perspectiva institucional, la municipalidad carece de trazabilidad centralizada sobre las solicitudes en curso, lo que dificulta la gestión de cargas de trabajo, la priorización y la generación de reportes.

### 1.3 Relevancia

- **Marco legal:** La Ley 21.180 de Transformación Digital del Estado (vigente gradualmente desde 2020) exige que los órganos de la administración pongan a disposición procedimientos administrativos electrónicos. La Ley 19.880 de Procedimientos Administrativos establece principios de transparencia y expedición.
- **Brecha digital municipal:** Según datos de la Subdere y la AMUCH, un porcentaje significativo de municipios pequeños aún no cuenta con plataformas de trámites en línea.
- **Impacto en la ciudadanía:** La falta de un canal digital excluye a vecinos que trabajan en horarios incompatibles, residen en sectores alejados del centro comunal, o tienen movilidad reducida.

<!-- TODO: agregar cifras concretas de la Subdere o AMUCH si se encuentran, o citar el informe de Gobierno Digital -->

### 1.4 Consecuencias de la falta de solución

- Exclusión de vecinos que no pueden asistir presencialmente.
- Ineficiencia operativa: funcionarios destinan tiempo a consultas de estado que podrían ser automáticas.
- Falta de datos para la toma de decisiones (tiempos promedio, tipos de trámite más demandados, cuellos de botella).
- Incumplimiento progresivo del marco legal de transformación digital.

---

## 2. Caracterización de los usuarios objetivo

### 2.1 Grupos de usuarios

La aplicación considera dos roles principales:

| Rol | Descripción |
|-----|-------------|
| **Vecino** | Habitante de la comuna de Santo Domingo que necesita realizar, consultar o dar seguimiento a trámites municipales. |
| **Funcionario municipal** | Empleado de la municipalidad encargado de recibir, revisar y resolver las solicitudes ingresadas por los vecinos. |

### 2.2 Características generales de los usuarios

**Vecinos:**
- Rango etario amplio (18–75 años), con mayor concentración entre 30–60 años.
- Nivel de experiencia tecnológica heterogéneo: desde usuarios frecuentes de smartphones hasta personas con alfabetización digital básica.
- Dispositivo principal de acceso: teléfono móvil (Android predominante en segmentos de menor ingreso).
- Contexto de uso: desde el hogar, el lugar de trabajo o en movilidad; conexión a internet variable (3G/4G en zonas rurales).
- Necesidades de accesibilidad: contraste adecuado, tamaños de texto legibles, navegación simple.

**Funcionarios municipales:**
- Rango etario predominante: 30–55 años.
- Nivel de experiencia tecnológica medio; familiarizados con herramientas ofimáticas pero no necesariamente con aplicaciones web modernas.
- Dispositivo de acceso: computador de escritorio en oficina municipal.
- Contexto de uso: jornada laboral, con conexión a internet estable.

### 2.3 Necesidades y dificultades identificadas

**Vecinos:**
- Conocer los requisitos antes de iniciar un trámite.
- Enviar documentos sin desplazarse.
- Saber en qué estado está su solicitud en todo momento.
- Recibir notificaciones ante cambios.
- Frustración principal: la incertidumbre y la pérdida de tiempo por visitas infructuosas.

**Funcionarios:**
- Visualizar todas las solicitudes pendientes con filtros y prioridades.
- Resolver solicitudes de forma ágil (aprobar, rechazar, pedir información adicional).
- Acceder a reportes de carga de trabajo y tiempos de respuesta.
- Frustración principal: atender consultas repetitivas de estado y no tener métricas claras.

### 2.4 Objetivos y tareas dentro del sistema

| Rol | Objetivos | Tareas principales |
|-----|-----------|-------------------|
| Vecino | Realizar trámites remotamente y con transparencia | Buscar trámite → ver requisitos → llenar formulario → adjuntar documentos → enviar → consultar estado → recibir notificación |
| Funcionario | Gestionar solicitudes eficientemente | Listar solicitudes → filtrar/priorizar → revisar documentos → aprobar/rechazar/solicitar info → ver reportes |

### 2.5 Necesidades de accesibilidad, seguridad y privacidad

- **Accesibilidad:** WCAG 2.1 nivel AA (contraste ≥ 4.5:1, navegación por teclado, etiquetas ARIA). Interfaz intuitiva para usuarios con baja experiencia digital.
- **Seguridad:** Contraseñas robustas (mín. 8 caracteres, mayúscula, minúscula, número). Rutas protegidas por autenticación y rol. Datos personales transmitidos sobre HTTPS.
- **Privacidad:** Minimización de datos personales solicitados. Solo se piden los campos necesarios para identificar al vecino y gestionar su trámite.

---

## 3. Proto-personas

> Los siguientes perfiles son construcciones hipotéticas basadas en datos demográficos públicos (INE, Censo 2017), informes de Gobierno Digital y el análisis de plataformas municipales existentes (e.g., portal de trámites de la Municipalidad de Providencia, ChileAtiende). No representan usuarios reales entrevistados.

### Proto-persona 1: María González (Vecina)

| Campo | Detalle |
|-------|---------|
| **Tipo de usuario / Rol** | Vecina |
| **Edad** | 42 años |
| **Características generales** | Dueña de casa y trabajadora part-time en el comercio local. Vive en el sector rural de Santo Domingo. Usa smartphone Android con plan de datos limitado. Familiarizada con WhatsApp y redes sociales, pero poco habituada a realizar gestiones en línea. |
| **Necesidades principales** | Solicitar un certificado de residencia sin tener que viajar al centro de la comuna (30 min en bus). Saber qué documentos necesita antes de iniciar. Recibir una notificación cuando esté listo. |
| **Objetivos de uso** | Completar el trámite desde su celular, idealmente en una sola sesión, y poder revisarlo después si necesita. |
| **Dificultades / Frustraciones** | Ha perdido mañanas completas esperando en la municipalidad. Una vez le pidieron un documento que no sabía que era requisito y tuvo que volver otro día. Le frustra no saber si su solicitud "quedó" o si la están revisando. |
| **Funcionalidades que utilizaría** | Catálogo de trámites (RF-01), inicio de trámite (RF-02), adjuntar documentos (RF-03), seguimiento de estado (RF-04), notificaciones (RF-05). |
| **Dispositivo y contexto** | Smartphone Android, conexión 4G intermitente, desde su hogar o en el bus. |

#### Supuestos utilizados
- El perfil demográfico se basa en datos del Censo 2017 para la comuna de Santo Domingo (predominancia de hogares con jefatura femenina en sectores rurales).
- La experiencia tecnológica se infiere del informe de Subtel sobre penetración de internet móvil en comunas rurales de la Región de Valparaíso.
- Las frustraciones se derivan de reportes de satisfacción ciudadana publicados por la AMUCH.

<!-- TODO: verificar que las fuentes citadas existan y sean accesibles; ajustar si se encuentran datos más precisos -->

---

### Proto-persona 2: Carlos Muñoz (Funcionario municipal)

| Campo | Detalle |
|-------|---------|
| **Tipo de usuario / Rol** | Funcionario municipal |
| **Edad** | 38 años |
| **Características generales** | Empleado de la Dirección de Obras de la municipalidad hace 6 años. Trabaja en computador de escritorio con Windows. Maneja planillas Excel y correo institucional. No tiene formación técnica en informática. |
| **Necesidades principales** | Ver las solicitudes que le corresponden filtradas por tipo y prioridad. Poder aprobar o rechazar con observaciones. Acceder a un resumen semanal de cuántas solicitudes resolvió. |
| **Objetivos de uso** | Reducir el tiempo que dedica a responder consultas de estado por teléfono y ventanilla. Tener un registro digital de las resoluciones que emite. |
| **Dificultades / Frustraciones** | Pierde tiempo atendiendo vecinos que solo preguntan "¿en qué va mi trámite?". No tiene forma fácil de saber cuántas solicitudes lleva resueltas en el mes. A veces pierde papeles o no recuerda si ya respondió una solicitud. |
| **Funcionalidades que utilizaría** | Gestión de solicitudes (RF-07), resolución con observaciones (RF-08), panel de reportes (RF-09). |
| **Dispositivo y contexto** | PC de escritorio, navegador Chrome, red LAN municipal, jornada de oficina (08:30–17:30). |

#### Supuestos utilizados
- El perfil se construye a partir de la estructura organizacional tipo de municipios pequeños descrita en informes de la Subdere.
- El nivel tecnológico se infiere del diagnóstico de competencias digitales del sector público (informe Gobierno Digital Chile 2023).
- Las frustraciones provienen de entrevistas a funcionarios municipales publicadas en estudios de la AMUCH sobre gestión de trámites.

<!-- TODO: verificar las fuentes; si alguna no es localizable, ajustar la redacción a "se estima a partir de..." -->

---

## 4. Fuentes consultadas

<!-- Completar con las fuentes reales que se utilicen -->

1. INE Chile — Censo de Población y Vivienda 2017. Resultados por comuna.
2. Ley 21.180 — Transformación Digital del Estado. Biblioteca del Congreso Nacional.
3. Ley 19.880 — Bases de los Procedimientos Administrativos. BCN.
4. Subtel — Informe de penetración de internet por comunas (2023).
5. AMUCH — Diagnóstico de gestión municipal en comunas rurales.
6. División de Gobierno Digital — Índice de Gobierno Digital Municipal.
7. Municipalidad de Providencia — Portal de trámites en línea (referencia de solución existente).
8. ChileAtiende — Plataforma de trámites del Estado.
