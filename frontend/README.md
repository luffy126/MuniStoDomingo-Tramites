# 🏛️ MuniStoDomingo: Trámites Municipales

Aplicación móvil y web para que los vecinos de la **Municipalidad de Santo Domingo** realicen y sigan trámites municipales en línea, sin filas ni horarios de oficina.

## Integrantes del equipo

| Nombre | Rol en el proyecto |
| --- | --- |
| Simón Ledezma | Base de datos y servicios |
| Tomás Monge | Servidor y endpoints REST |
| Francisco Espinoza | Autenticación JWT y seguridad |
| Melissa Rojas | Integración frontend y pruebas |

## Distribución de responsabilidades

- **Frontend (Ionic + React):** estructura de vistas, componentes, navegación con React Router.
- **UI/UX y Figma:** prototipos móvil/web, flujo de navegación, jerarquía visual.
- **Backend (Express + MySQL):** API REST, base de datos relacional y autenticación JWT; ver la rama `backend`.
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

| ID | Nombre | Rol | Descripción | Estado EP2 |
| --- | --- | --- | --- | --- |
| RF-01 | Catálogo de trámites | Vecino | Catálogo de trámites con búsqueda y filtros por categoría | Implementado |
| RF-02 | Inicio de trámite | Vecino | Inicio de trámite: selección y envío del formulario correspondiente | Implementado |
| RF-03 | Adjuntar documentos | Vecino | Adjuntar documentos digitales (PDF/imagen) con validación de formato y tamaño | Pendiente (EF) |
| RF-04 | Seguimiento de estado | Vecino | Seguimiento del estado del trámite (Pendiente → En revisión → Aprobado/Rechazado) | Implementado |
| RF-05 | Notificaciones | Vecino | Notificaciones ante cambios de estado o requerimientos de información | Implementado |
| RF-06 | Gestión de perfil | Vecino | Gestión del perfil (nombre, teléfono, dirección) | Nombre y correo (teléfono y dirección pendientes) |
| RF-07 | Gestión de solicitudes | Funcionario | Gestión de solicitudes: listar, filtrar y priorizar | Implementado |
| RF-08 | Resolución de solicitudes | Funcionario | Resolución de solicitudes: aprobar, rechazar o solicitar información, con observaciones | Aprobar, rechazar o poner en revisión con observaciones |
| RF-09 | Reportes | Funcionario | Panel de reportes y estadísticas (cantidad por estado, tiempos, tipos más solicitados) | Cantidad por estado y por trámite (tiempos pendientes) |

Detalle técnico de la API en la rama `backend` (`docs/API.md`).

## Requerimientos no funcionales

| ID | Nombre | Categoría | Descripción |
| --- | --- | --- | --- |
| RNF-01 | Tiempo de carga | Rendimiento | Páginas cargables en menos de 3 s en conexiones 3G (Lighthouse Performance ≥ 70) |
| RNF-02 | Contraseñas y rutas protegidas | Seguridad | Contraseñas de mínimo 8 caracteres (mayúscula, minúscula y número); rutas protegidas por autenticación y rol |
| RNF-03 | Acciones en pocos pasos | Usabilidad | Acciones principales en máximo 3 clics desde el dashboard; errores de formulario en tiempo real |
| RNF-04 | Accesibilidad WCAG AA | Accesibilidad | WCAG 2.1 nivel AA (contraste ≥ 4.5:1, navegación por teclado, etiquetas ARIA) |
| RNF-05 | Multiplataforma | Compatibilidad | Funcionamiento en Chrome, Firefox y Safari, y en móvil vía Capacitor (iOS/Android) |

## Tecnologías y herramientas

**Frontend**
- Ionic + React + TypeScript
- React Router
- Capacitor

**Backend**
- Node.js + Express 5 + TypeScript, MySQL/MariaDB (mysql2), JWT + bcrypt, express-validator

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

## Conexión con el backend

El frontend consume la API de la rama `backend`, que debe ejecutarse por separado con
MySQL/MariaDB disponible y su esquema/datos semilla cargados. En el backend, configura
`FRONTEND_URL=http://localhost:5173` para permitir el origen de Vite.

Por defecto, la app usa `http://localhost:3000`. Para apuntar a otro servidor, crea un
archivo `.env` en la raíz del frontend basándote en `.env.example` y define `VITE_API_URL`.
La URL debe ser el origen del servidor, sin `/api` al final.

En PowerShell puedes instalar e iniciar el frontend con:

```powershell
npm.cmd install
npm.cmd run dev
```

La referencia de endpoints y ejemplos está en [`docs/API.md` de la rama `backend`](https://github.com/luffy126/MuniStoDomingo-Tramites/blob/backend/docs/API.md).
La colección Postman está en la raíz de la rama `backend` (`postman_collection.json`).

## Integración con la API

- **`src/services/apiClient.ts`**: cliente central de `fetch`. Usa `VITE_API_URL` como URL base, envía
  el token Bearer guardado en `localStorage` y espera el sobre `{ success, data, error }`. Un 204 devuelve
  `undefined`. Ante un 401 borra la sesión y dispara el evento `munisd:unauthorized`, que cierra la
  sesión en `AuthContext`. Los errores se lanzan como `ApiError` (con `status` y el mensaje del backend);
  si el servidor no responde, el mensaje explica que no hay conexión.
- **`AuthContext`**: guarda al usuario; al abrir la app recupera la sesión con `GET /api/auth/me`.
  También expone `login`, `register`, `actualizarPerfil` y `logout`.
- **Rutas protegidas**: `PrivateRoute` exige sesión y `RoleRoute` exige el rol (`vecino` o
  `funcionario`); si no coincide, redirige a la pantalla inicial de su rol.
- **`useCargarAlEntrar(ruta, cargar)`** (`src/hooks`): ejecuta la carga de datos cada vez que una vista
  pasa a estar activa. Reemplaza al hook de Ionic para el evento `ionViewWillEnter` porque, con Ionic React
  Router 9.0.4, cambiar de pestaña dentro de `IonTabs` no lo despacha y las páginas de las pestañas
  siguen montadas: sin este hook, "Mis trámites" y "Notificaciones" mostraban la lista vacía. El hook usa
  la ruta activa de React Router, que sí cambia siempre (pestañas, `navigate()` y recarga), y hace una sola
  petición por entrada.

| Pantalla | Qué hace | Endpoint |
| --- | --- | --- |
| Login / Registro | Inicia sesión o crea la cuenta de vecino | `POST /api/auth/login`, `POST /api/auth/register` |
| Catálogo (vecino) | Lista y filtra los trámites | `GET /api/tramites` |
| Detalle del trámite | Muestra requisitos y envía la solicitud | `GET /api/tramites/:id`, `POST /api/solicitudes` |
| Mis trámites | Lista las solicitudes propias y cancela las pendientes | `GET /api/solicitudes`, `DELETE /api/solicitudes/:folio` |
| Notificaciones | Lista los avisos y los marca como leídos | `GET /api/notificaciones`, `PATCH /api/notificaciones/:id` |
| Perfil | Muestra y edita nombre y correo | `GET /api/auth/me`, `PUT /api/auth/me` |
| Solicitudes (funcionario) | Bandeja con filtro por estado | `GET /api/solicitudes` |
| Detalle de solicitud (funcionario) | Aprueba, rechaza o pone en revisión con observaciones | `GET /api/solicitudes/:folio`, `PATCH /api/solicitudes/:folio` |
| Reportes (funcionario) | Totales por estado y por trámite | `GET /api/solicitudes/reportes`, `GET /api/solicitudes` |

## Pruebas

```bash
npx tsc --noEmit    # tipos
npm run lint        # ESLint (admite 1 warning de react-refresh en AuthContext)
npx vitest run      # pruebas unitarias (apiClient y arranque de la app)
npx cypress run     # flujos de punta a punta
```

Cypress necesita el backend corriendo en `:3000` con la base en su semilla (`schema.sql`) y el
frontend en `:5173` (`npm run dev`). Los flujos crean y modifican datos: al terminar, reinicia la base
ejecutando de nuevo `schema.sql` en el backend. Si Electron se cae por la GPU
(`GPU process isn't usable`), ejecuta Cypress con
`ELECTRON_EXTRA_LAUNCH_ARGS='--disable-gpu --no-sandbox --in-process-gpu'` (en PowerShell:
`$env:ELECTRON_EXTRA_LAUNCH_ARGS='--disable-gpu --no-sandbox --in-process-gpu'`).

## Estructura

```
src/
├── App.tsx, main.tsx          Raíz de la app: Ionic, AuthProvider y rutas
├── components/                Componentes reutilizables (common, forms, tramites)
├── context/AuthContext.tsx    Sesión del usuario
├── hooks/                     useCargarAlEntrar
├── pages/                     auth, vecino (pestañas) y funcionario (menú lateral)
├── routes/                    AppRoutes, PrivateRoute, RoleRoute, Redireccion
├── services/                  apiClient, authService y tramiteService
├── theme/                     Variables y estilos globales
└── utils/                     Validadores e íconos
cypress/e2e/                   navegacion.cy.ts y flujos.cy.ts
```

## Diseño y prototipo
- [Prototipo en Figma](https://www.figma.com/design/PDRMB1YzTolGblTi9Cxy10/MuniSitioDomingo?node-id=0-1&t=wjmz0PMK0jp7Rtdt-1)

## Ramas del repositorio

| Rama | Contenido |
| --- | --- |
| `main` | Documentación general del proyecto |
| `frontend` | Código de interfaz (Ionic + React) + requerimientos funcionales/no funcionales |
| `backend` | API REST, conexión a base de datos y script `.sql` |
