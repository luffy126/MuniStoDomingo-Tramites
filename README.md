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

### Arranque y fuentes

- Las tipografías Montserrat y Poppins se sirven desde `public/fonts` como WOFF2, con
  `font-display: swap` y preload. No hay peticiones bloqueantes a Google Fonts.
- `index.html` pinta un shell municipal inmediato mientras descarga el bundle; React lo reemplaza
  en el primer render. El tema claro es el defecto: el modo oscuro solo se activa si el usuario
  lo elige a mano (botón del header o interruptor de Perfil/menú), nunca por la configuración
  del sistema. La elección se guarda en `muni-tema` y el shell la respeta antes del primer
  paint; también se respeta `prefers-reduced-motion`.
- El service worker usa `munisd-shell-v2` y precarga también las fuentes. `/api/` sigue siendo
  network-only: no se cachean respuestas autenticadas.
- `App.tsx` importa solo las utilidades CSS de Ionic usadas (`padding` y `text-alignment`);
  las de float, flex, display y text-transform se omiten para no pagarlas en cada carga.

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
MySQL/MariaDB disponible y su esquema/datos semilla cargados.

Por defecto la app usa rutas **same-origin** que empiezan con `/api`. En desarrollo, Vite
(`npm run dev`, puerto 5173) y `vite preview` (puerto 4173) proxian `/api` a
`http://localhost:3000`. El destino se puede cambiar con la variable `BACKEND_URL` del proceso
que inicia Vite; el navegador sigue hablando solo con el frontend.

Si el backend está en otro origen, define `VITE_API_URL` en un `.env` del frontend (basado en
`.env.example`) y habilita CORS en el backend con `FRONTEND_URL`. La URL debe ser el origen del
servidor, sin `/api` al final.

En PowerShell puedes instalar e iniciar el frontend con:

```powershell
npm.cmd install
npm.cmd run dev
```

Para probar el build de producción contra la misma API:

```powershell
npm.cmd run build
npm.cmd run preview
```

La referencia de endpoints y ejemplos está en [`docs/API.md` de la rama `backend`](https://github.com/luffy126/MuniStoDomingo-Tramites/blob/backend/docs/API.md).
La colección Postman está en la raíz de la rama `backend` (`postman_collection.json`).

## Integración con la API

- **`src/services/apiClient.ts`**: cliente central de `fetch`. Por defecto usa la URL base vacía
  (rutas `/api` same-origin) y solo antepone `VITE_API_URL` si se configuró un backend externo.
  Envía el token Bearer guardado en `localStorage` y espera el sobre `{ success, data, error }`. Un
  204 devuelve `undefined`. Ante un 401 borra la sesión y dispara el evento
  `munisd:unauthorized`, que cierra la sesión en `AuthContext`. Los errores se lanzan como
  `ApiError` (con `status` y el mensaje del backend); si el servidor no responde, el mensaje
  explica que no hay conexión.
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
| Recuperar contraseña | Solicita un enlace y define una contraseña nueva | `POST /api/auth/forgot-password`, `POST /api/auth/reset-password` |
| Catálogo (vecino) | Lista y filtra los trámites | `GET /api/tramites` |
| Detalle del trámite | Muestra requisitos y envía la solicitud | `GET /api/tramites/:id`, `POST /api/solicitudes` |
| Mis trámites | Lista las solicitudes propias y cancela las pendientes | `GET /api/solicitudes`, `DELETE /api/solicitudes/:folio` |
| Detalle de mi solicitud | Muestra estado, historial, documentos y permite cancelar | `GET /api/solicitudes/:folio`, endpoints de documentos |
| Notificaciones | Lista los avisos, los marca como leídos y enlaza al detalle | `GET /api/notificaciones`, `PATCH /api/notificaciones/leidas`, `PATCH /api/notificaciones/:id` |
| Perfil | Muestra y edita nombre, correo, teléfono y dirección | `GET /api/auth/me`, `PUT /api/auth/me` |
| Solicitudes (funcionario) | Bandeja con búsqueda, filtros, orden y persistencia | `GET /api/solicitudes` |
| Detalle de solicitud (funcionario) | Resuelve con confirmación, ajusta prioridad/plazo, ve historial y documentos | `GET /api/solicitudes/:folio`, `PATCH /api/solicitudes/:folio`, `PATCH /api/solicitudes/:folio/prioridad` |
| Reportes (funcionario) | Agregados por estado, trámite y prioridad; exportación CSV | `GET /api/solicitudes/reportes` |

## Pruebas

```bash
npm run verify      # typecheck + ESLint + 77 pruebas unitarias
npm run build       # verifica el build de producción
npm run test.e2e    # Cypress: documentos, flujos, navegación y responsive
```

Cypress necesita el backend corriendo en `:3000` con la base en su semilla (`schema.sql`) y el
frontend en `:5173` (`npm run dev`). Los flujos crean y modifican datos: al terminar, reinicia la
base ejecutando de nuevo `schema.sql` en el backend. En PowerShell, fija `$OutputEncoding` antes
de redirigir el archivo para que los acentos de la semilla no se conviertan en `??`:

```powershell
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
Get-Content back/schema.sql -Encoding UTF8 -Raw |
  & "C:\xampp\mysql\bin\mysql.exe" -u root --default-character-set=utf8mb4
```

La suite completa hace varios inicios de sesión y más de 100 peticiones en menos de un minuto.
Para desarrollo se pueden subir los límites del backend sin cambiar los valores seguros de
producción:

```bash
# en back/.env, solo para ejecutar E2E
AUTH_RATE_LIMIT_MAX=50
GENERAL_RATE_LIMIT_MAX=1000
```

El spec de capturas visuales es una herramienta manual y no forma parte de `npm run test.e2e`:

```bash
npx cypress run --spec cypress/visual/capturas-rediseno.cy.ts \
  --config baseUrl=http://localhost:5173,screenshotsFolder=capturas/cypress
```

Si Electron se cae por la GPU (`GPU process isn't usable`), ejecuta Cypress con
`ELECTRON_EXTRA_LAUNCH_ARGS='--disable-gpu --no-sandbox --in-process-gpu'` (en PowerShell:
`$env:ELECTRON_EXTRA_LAUNCH_ARGS='--disable-gpu --no-sandbox --in-process-gpu'`).

## Estructura

```
src/
├── App.tsx, main.tsx          Raíz de la app: Ionic, AuthProvider y rutas
├── components/                Componentes reutilizables (common, forms, tramites)
├── context/AuthContext.tsx    Sesión del usuario
├── hooks/                     useAuth, useCargarAlEntrar, useListaPaginada, useTema
├── pages/                     auth, vecino (pestañas) y funcionario (menú lateral)
├── routes/                    AppRoutes, PrivateRoute, RoleRoute, Redireccion
├── services/                  apiClient, authService, storageService y tramiteService
├── theme/                     Variables y estilos globales
└── utils/                     Validadores, fechas, texto e íconos
cypress/e2e/                   documentos, flujos, navegacion, rendimiento y responsive
cypress/visual/                capturas manuales del rediseño
```

## Carga perezosa y estabilidad de navegación

Las páginas siguen siendo `React.lazy`, pero cada ruta tiene su propio `Suspense` con
`fallback={null}`; el `IonRouterOutlet` continúa siendo hijo directo de `IonTabs` o
`IonSplitPane`. Así, al abrir una pestaña no se desmonta la barra inferior ni se monta
una página de carga que Ionic dejaría invisible. Los layouts (`VecinoTabs` y
`FuncionarioLayout`) se importan directo porque son el cascarón de la sesión.

El catálogo de trámites se precarga al entrar y se mantiene en caché de memoria
5 minutos con dedupe de petición. Es público; nunca se cachean datos personales ni
respuestas autenticadas. Al volver a una pestaña ya visitada, `useCargarAlEntrar`
usa la recarga silenciosa del listado en lugar de mostrar el esqueleto otra vez.

`cypress/e2e/rendimiento.cy.ts` verifica este comportamiento: el chunk de `PerfilPage`
no se pide al entrar al dashboard, se pide al abrir Perfil, y `ion-tab-bar` conserva
el mismo nodo DOM durante todos los cambios de pestaña.

## Diseño y prototipo
- [Prototipo en Figma](https://www.figma.com/design/PDRMB1YzTolGblTi9Cxy10/MuniSitioDomingo?node-id=0-1&t=wjmz0PMK0jp7Rtdt-1)

## Ramas del repositorio

| Rama | Contenido |
| --- | --- |
| `main` | Documentación general del proyecto |
| `frontend` | Código de interfaz (Ionic + React) + requerimientos funcionales/no funcionales |
| `backend` | API REST, conexión a base de datos y script `.sql` |
