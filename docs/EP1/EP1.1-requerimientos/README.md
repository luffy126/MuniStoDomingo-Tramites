# EP 1.1 - Requerimientos del sistema

Cada requerimiento se identifica con un código, un nombre y una descripción. Los
requerimientos funcionales corresponden a acciones que el sistema permite realizar; los no
funcionales describen condiciones de calidad.

Los roles considerados son dos: **vecino** (usuario que realiza trámites) y **funcionario**
(usuario municipal que los gestiona). Ninguno de los requerimientos corresponde a inicio de
sesión o registro, ya que esas funciones son transversales a la propuesta.

## Requerimientos funcionales

| ID | Nombre | Rol | Descripción |
| --- | --- | --- | --- |
| RF-01 | Catálogo de trámites | Vecino | Consultar los trámites disponibles, con búsqueda por texto y filtro por categoría (certificados, permisos, reclamos, solicitudes). |
| RF-02 | Inicio de trámite | Vecino | Seleccionar un trámite, revisar sus requisitos y enviar la solicitud correspondiente. |
| RF-03 | Adjuntar documentación | Vecino | Incorporar documentos digitales (PDF o imagen) a una solicitud, con validación de formato y tamaño. |
| RF-04 | Seguimiento de trámites | Vecino | Consultar el estado de las solicitudes propias en el flujo Pendiente > En revisión > Aprobado/Rechazado. |
| RF-05 | Notificaciones | Vecino | Recibir avisos ante cambios de estado o requerimientos de información adicional. |
| RF-06 | Gestión de perfil | Vecino | Consultar y actualizar los datos personales asociados a la cuenta. |
| RF-07 | Gestión de solicitudes | Funcionario | Listar, filtrar por estado y priorizar las solicitudes ingresadas por los vecinos. |
| RF-08 | Resolución de solicitudes | Funcionario | Aprobar, rechazar o dejar en revisión una solicitud, registrando observaciones para el vecino. |
| RF-09 | Panel de reportes | Funcionario | Consultar estadísticas de gestión: cantidad de solicitudes por estado y trámites más solicitados. |

## Requerimientos no funcionales

| ID | Nombre | Categoría | Descripción |
| --- | --- | --- | --- |
| RNF-01 | Tiempo de carga | Rendimiento | Las páginas deben cargar en menos de 3 s en conexiones 3G, con puntaje Lighthouse de rendimiento ≥ 70. |
| RNF-02 | Control de acceso | Seguridad | Contraseñas de mínimo 8 caracteres con mayúscula, minúscula y número; rutas protegidas por autenticación y por rol. |
| RNF-03 | Economía de interacción | Usabilidad | Las acciones principales deben alcanzarse en un máximo de 3 clics desde el inicio, con validación de formularios en tiempo real. |
| RNF-04 | Accesibilidad | Accesibilidad | Cumplimiento de WCAG 2.1 nivel AA: contraste ≥ 4.5:1, navegación por teclado y etiquetas ARIA. |
| RNF-05 | Compatibilidad | Compatibilidad | Funcionamiento en Chrome, Firefox y Safari, y en dispositivos móviles mediante Capacitor (iOS/Android). |

## Trazabilidad con la implementación

| Requerimiento | Estado en la EP 1 | Dónde |
| --- | --- | --- |
| RF-01 | Implementado con datos de prueba | `src/pages/vecino/DashboardPage.tsx` |
| RF-02 | Implementado con datos de prueba | `src/pages/vecino/TramiteDetailPage.tsx` |
| RF-03 | Pendiente (requiere backend) | - |
| RF-04 | Implementado con datos de prueba | `src/pages/vecino/MisTramitesPage.tsx` |
| RF-05 | Implementado con datos de prueba | `src/pages/vecino/NotificacionesPage.tsx` |
| RF-06 | Implementado con datos de prueba | `src/pages/vecino/PerfilPage.tsx` |
| RF-07 | Implementado con datos de prueba | `src/pages/funcionario/SolicitudesPage.tsx` |
| RF-08 | Implementado con datos de prueba | `src/pages/funcionario/SolicitudDetailPage.tsx` |
| RF-09 | Implementado con datos de prueba | `src/pages/funcionario/ReportesPage.tsx` |

Los datos provienen de `src/services/tramiteService.ts`; la conexión con la base de datos
corresponde a la Entrega Parcial 2.
