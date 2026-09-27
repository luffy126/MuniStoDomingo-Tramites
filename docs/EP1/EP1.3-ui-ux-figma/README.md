# EP 1.3 - Bocetos de UI/UX y prototipo en Figma

**Prototipo:** https://www.figma.com/design/PDRMB1YzTolGblTi9Cxy10/MuniSitioDomingo?node-id=0-1

El sistema de diseño (paleta, tipografía, grillas y mapeo de componentes a Ionic) está en
[design-system.md](design-system.md).

> Los mockups fueron elaborados manualmente por el equipo con las funciones convencionales
> de Figma (formas, marcos, componentes, estilos, Auto Layout y conexiones de prototipado),
> sin utilizar el asistente de IA de Figma ni herramientas de IA generativa, según exige el
> enunciado.

## Pantallas prototipadas

Cada pantalla corresponde a una funcionalidad definida en la [EP 1.1](../EP1.1-requerimientos/),
y está prototipada en versión móvil y web.

| # | Pantalla | Rol | Requerimiento | Implementación |
| --- | --- | --- | --- | --- |
| 1 | Inicio de sesión | Ambos | Transversal | `pages/auth/LoginPage.tsx` |
| 2 | Registro | Vecino | Transversal | `pages/auth/RegisterPage.tsx` |
| 3 | Catálogo de trámites | Vecino | RF-01 | `pages/vecino/DashboardPage.tsx` |
| 4 | Detalle de trámite | Vecino | RF-02 | `pages/vecino/TramiteDetailPage.tsx` |
| 5 | Mis trámites | Vecino | RF-04 | `pages/vecino/MisTramitesPage.tsx` |
| 6 | Notificaciones | Vecino | RF-05 | `pages/vecino/NotificacionesPage.tsx` |
| 7 | Perfil | Vecino | RF-06 | `pages/vecino/PerfilPage.tsx` |
| 8 | Bandeja de solicitudes | Funcionario | RF-07 | `pages/funcionario/SolicitudesPage.tsx` |
| 9 | Detalle y resolución | Funcionario | RF-08 | `pages/funcionario/SolicitudDetailPage.tsx` |
| 10 | Reportes | Funcionario | RF-09 | `pages/funcionario/ReportesPage.tsx` |

## Diferencias entre versión móvil y web

| Aspecto | Móvil | Web |
| --- | --- | --- |
| Navegación del vecino | Barra inferior de 3 pestañas y notificaciones arriba | Misma barra, con el contenido centrado, notificaciones abajo y ancho máximo |
| Navegación del funcionario | Menú lateral deslizable con botón de hamburguesa | Menú lateral fijo (`IonSplitPane` a partir de 992 px) |
| Catálogo de trámites | Tarjetas en una columna | Tarjetas en dos columnas desde 768 px |

## Formulario de registro: campos y justificación

Se solicita únicamente la información necesaria para identificar al vecino y comunicarle el
avance de sus trámites. No se piden datos personales adicionales (RUT, dirección o teléfono)
en esta etapa, porque no son necesarios para el funcionamiento de la aplicación.

| Campo | Obligatorio | Formato esperado | Validación | Mensaje de error |
| --- | --- | --- | --- | --- |
| Nombre completo | Sí | Texto, mínimo 3 caracteres | Longitud mínima | "Ingresa tu nombre completo (mínimo 3 caracteres)." |
| Correo electrónico | Sí | `usuario@dominio.cl` | Formato de correo | "Ingresa un correo con formato válido." |
| Contraseña | Sí | Mínimo 8 caracteres, con mayúscula, minúscula y número | Reglas de seguridad (RNF-02) | "Mínimo 8 caracteres, con mayúscula, minúscula y número." |
| Confirmar contraseña | Sí | Idéntica a la anterior | Coincidencia | "Las contraseñas no coinciden." |
| Términos y condiciones | Sí | Casilla marcada | Aceptación explícita | "Debes aceptar los términos y condiciones." |

**Retroalimentación:** los errores se muestran bajo cada campo en color de peligro
(`IonNote`), el requisito de la contraseña se muestra como ayuda antes de escribir, y el
resultado del envío se comunica con un `IonToast`. En el inicio de sesión, unas credenciales
incorrectas producen el mensaje "Correo o contraseña incorrectos."
