# 🏛️ MuniStoDomingo: Trámites Municipales

Aplicación móvil y web para que los vecinos de la **Municipalidad de Santo Domingo** realicen y sigan trámites municipales en línea, sin filas ni horarios de oficina.

## Integrantes del equipo

| Nombre | Rol en el proyecto |
| --- | --- |
| Simón Ledezma | CEO del Repo (por definir) |
| Tomás Monge | Levantando el proyecto con un terremoto (por definir) |
| Francisco Espinoza | Experto en Antigravity 2.0 (por definir) |

## Distribución de responsabilidades

- **Frontend (Ionic + React):** estructura de vistas, componentes, navegación con React Router.
- **UI/UX y Figma:** mockups móvil/web, flujo de navegación, jerarquía visual.
- **Backend (a desarrollar en EP2):** API REST, base de datos relacional, autenticación JWT.
- **Documentación y gestión:** README, ramas, control de versiones, evidencia de avance.

## Descripción general

MuniStoDomingo es una plataforma que permite a los vecinos consultar el catálogo de trámites disponibles, iniciar una solicitud, adjuntar documentos digitales y hacer seguimiento del estado en tiempo real. Incluye un rol de **Funcionario municipal** encargado de gestionar las solicitudes: revisarlas, aprobarlas, rechazarlas o solicitar información adicional, además de visualizar reportes y estadísticas del servicio.

## Problema que aborda

Hoy un vecino que necesita un trámite (certificado de residencia, permiso de circulación, un reclamo) debe asistir presencialmente a la municipalidad en horario de oficina, sin claridad sobre los requisitos, enfrentando filas y múltiples visitas si falta algún documento. No existe un canal simple para saber **en qué va** su solicitud. La institución, por su parte, no cuenta con trazabilidad ni métricas de su carga de trabajo.

La aplicación responde a este contexto y a los principios de transformación digital de la **Ley 21.180** y de los procedimientos administrativos de la **Ley 19.880**, para ofrecer un trámite remoto, con requisitos visibles, seguimiento del estado y notificaciones automáticas.

## Objetivos del proyecto

- Permitir a los vecinos consultar, iniciar y seguir trámites municipales de forma digital.
- Centralizar la carga y validación de documentos requeridos por cada trámite.
- Dar al funcionario herramientas de gestión, resolución y reportes sobre las solicitudes.
- Entregar una experiencia responsiva y accesible entre móvil (Ionic) y web.

## Funcionalidades principales

| ID | Rol | Funcionalidad |
| --- | --- | --- |
| RF-01 | Vecino | Catálogo de trámites con búsqueda y filtros por categoría |
| RF-02 | Vecino | Inicio de trámite: selección y envío del formulario correspondiente |
| RF-03 | Vecino | Adjuntar documentos digitales (PDF/imagen) con validación de formato y tamaño |
| RF-04 | Vecino | Seguimiento del estado del trámite (Pendiente → En revisión → Aprobado/Rechazado) |
| RF-05 | Vecino | Notificaciones ante cambios de estado o requerimientos de información |
| RF-06 | Vecino | Gestión del perfil (nombre, teléfono, dirección) |
| RF-07 | Funcionario | Gestión de solicitudes: listar, filtrar y priorizar |
| RF-08 | Funcionario | Resolución de solicitudes: aprobar, rechazar o solicitar información, con observaciones |
| RF-09 | Funcionario | Panel de reportes y estadísticas (cantidad por estado, tiempos, tipos más solicitados) |

El detalle completo de requerimientos funcionales y no funcionales está en el [`README.md` de la rama `frontend`](../../tree/frontend).

## Requerimientos no funcionales

| ID | Categoría | Descripción |
| --- | --- | --- |
| RNF-01 | Rendimiento | Páginas cargables en menos de 3 s en conexiones 3G (Lighthouse Performance ≥ 70) |
| RNF-02 | Seguridad | Contraseñas de mínimo 8 caracteres (mayúscula, minúscula y número); rutas protegidas por autenticación y rol |
| RNF-03 | Usabilidad | Acciones principales en máximo 3 clics desde el dashboard; errores de formulario en tiempo real |
| RNF-04 | Accesibilidad | WCAG 2.1 nivel AA (contraste ≥ 4.5:1, navegación por teclado, etiquetas ARIA) |
| RNF-05 | Compatibilidad | Funcionamiento en Chrome, Firefox y Safari, y en móvil vía Capacitor (iOS/Android) |

## Tecnologías y herramientas

**Frontend**
- Ionic + React + TypeScript
- React Router
- Capacitor

**Backend** *(Entrega Parcial 2)*
- Node.js + Express
- PostgreSQL / MySQL
- JWT + bcrypt

**Herramientas**
- Figma (prototipado UI/UX)
- Git / GitHub
- Postman / Insomnia

## Instrucciones de instalación

```bash
# Clonar el repositorio
git clone https://github.com/luffy126/MuniStoDomingo-Tramites.git
cd MuniStoDomingo-Tramites

# Cambiar a la rama frontend
git checkout frontend

# Instalar dependencias
npm install
```

## Instrucciones de ejecución

```bash
# Levantar la app en modo desarrollo (web)
npm run dev

# Alternativa con Ionic CLI
npx ionic serve

# Compilar para producción
npm run build

# Ejecutar en emulador Android/iOS
npx ionic capacitor run android
npx ionic capacitor run ios
```

## Diseño y prototipo

- [Prototipo en Figma](#): reemplazar por el link público.
- [Tablero / gestión del proyecto](#) (opcional).

## Ramas del repositorio

| Rama | Contenido |
| --- | --- |
| `main` | Documentación general del proyecto |
| `frontend` | Código de interfaz (Ionic + React) + requerimientos funcionales/no funcionales |
| `backend` | API REST, conexión a base de datos y script `.sql` |