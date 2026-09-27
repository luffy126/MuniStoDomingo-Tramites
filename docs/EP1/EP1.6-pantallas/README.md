# EP 1.6 - Diseño de las pantallas principales

Se implementaron diez pantallas navegables coherentes con la arquitectura definida en la [EP 1.4](../EP1.4-arquitectura-navegacion/).

## Pantallas del vecino

| Pantalla | Qué permite | Componentes Ionic |
| --- | --- | --- |
| **Inicio de sesión** | Ingresar con correo y contraseña; errores de credenciales con aviso emergente | `IonPage`, `IonInput`, `IonButton`, `IonToast`, `IonCard` |
| **Registro** | Crear una cuenta con validación de cada campo y aceptación de términos | `IonInput`, `IonCheckbox`, `IonNote`, `IonButton` |
| **Catálogo de trámites** | Buscar y filtrar los trámites disponibles | `IonSearchbar`, `IonChip`, `IonCard`, `IonIcon` |
| **Detalle del trámite** | Revisar requisitos e iniciar la solicitud | `IonList`, `IonItem`, `IonTextarea`, `IonButton` |
| **Mis trámites** | Seguir el estado de las solicitudes propias | `IonList`, `IonItem`, `IonBadge` |
| **Notificaciones** | Revisar los avisos recibidos | `IonList`, `IonItem`, `IonIcon`, `IonBadge` |
| **Perfil** | Consultar los datos de la cuenta y cerrar sesión | `IonCard`, `IonList`, `IonButton` |

La navegación entre las cuatro vistas principales es una barra inferior de pestañas
(`IonTabs`, `IonTabBar`, `IonTabButton`): Trámites, Mis Trámites, Notificaciones y Perfil.

## Pantallas del funcionario

| Pantalla | Qué permite | Componentes Ionic |
| --- | --- | --- |
| **Bandeja de solicitudes** | Listar y filtrar por estado | `IonSegment`, `IonList`, `IonItem`, `IonBadge` |
| **Detalle y resolución** | Aprobar, rechazar o dejar en revisión con observaciones | `IonCard`, `IonTextarea`, `IonButton`, `IonToast` |
| **Reportes** | Ver totales por estado y trámites más solicitados | `IonCard`, `IonProgressBar`, `IonBadge` |

La navegación es un menú lateral (`IonMenu`) dentro de un `IonSplitPane`: deslizable en
móvil y fijo desde 992 px.

## Códigos de estado

Los estados de una solicitud se distinguen por color en toda la aplicación:

| Estado | Color |
| --- | --- |
| Pendiente | Amarillo (`warning`) |
| En revisión | Azul claro (`secondary`) |
| Aprobado | Verde (`success`) |
| Rechazado | Rojo (`danger`) |

## Separación estructural del código

| Carpeta | Contenido |
| --- | --- |
| `pages/` | Una carpeta por rol: `auth`, `vecino`, `funcionario` |
| `components/` | Piezas reutilizables: `common`, `forms`, `tramites` |
| `routes/` | Definición de rutas y guards de acceso |
| `services/` | Datos y autenticación simulados |

## Comportamiento responsive

- El catálogo muestra una columna en móvil y dos desde 768 px.
- El menú del funcionario pasa de deslizable a fijo desde 992 px.
- Los contenedores tienen ancho máximo y quedan centrados en pantallas grandes.
- La paleta municipal está definida en `theme/variables.css` y funciona en modo claro y
  oscuro según la preferencia del sistema.
