# 🏛️ MuniStoDomingo: Trámites Municipales

Aplicación móvil y web para que los vecinos de la **Municipalidad de Santo Domingo** realicen y sigan trámites municipales en línea, sin filas ni horarios de oficina.

> **Esta rama (`docker`) contiene el proyecto completo listo para montar:** base de datos, API y frontend con un solo comando, sin instalar Node, MariaDB ni XAMPP. **¿Primera vez en un computador nuevo? Sigue [`INSTALAR.md`](INSTALAR.md)** (paso a paso, con doble clic en `iniciar.bat`).

## Integrantes del equipo

| Nombre | Rol en el proyecto |
| --- | --- |
| Simón Ledezma | Frontend + organización |
| Tomás Monge | Setup proyecto + Figma Movil |
| Francisco Espinoza | Figma Web + Debugging |
| Melissa Rojas | QA Analyst + Postman en APIs |

## Distribución de responsabilidades

- **Frontend (Ionic + React):** vistas, componentes, navegación con React Router, tema "Comuna Parque" y zonas de carga de documentos.
- **UI/UX y Figma:** prototipos móvil/web, flujo de navegación, jerarquía visual.
- **Backend (Express + MariaDB):** API REST, base de datos relacional, autenticación JWT, verificación en dos pasos por correo y adjuntos.
- **Calidad:** pruebas automatizadas de la API y colección de Postman con evidencia de validación.
- **Documentación y gestión:** README, ramas, control de versiones, evidencia de avance.

## Descripción general

MuniStoDomingo es una plataforma que permite a los vecinos consultar el catálogo de trámites disponibles, iniciar una solicitud, adjuntar los documentos que cada trámite exige y hacer seguimiento del estado. Incluye un rol de **Funcionario municipal** encargado de gestionar las solicitudes: revisarlas, aprobarlas, rechazarlas o pedir más información, además de visualizar reportes y estadísticas del servicio.

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
| RF-03 | Vecino | Adjuntar documentos digitales (PDF/JPG/PNG, hasta 5 MB) con validación de formato y tamaño; cada requisito tiene su zona de carga antes de iniciar el trámite |
| RF-04 | Vecino | Seguimiento del estado del trámite (Pendiente > En revisión > Aprobado/Rechazado) con su historial |
| RF-05 | Vecino | Notificaciones ante cambios de estado o requerimientos de información, también por correo |
| RF-06 | Vecino | Gestión del perfil (nombre, correo, teléfono, dirección) y verificación en dos pasos por correo |
| RF-07 | Funcionario | Gestión de solicitudes: listar, filtrar y priorizar |
| RF-08 | Funcionario | Resolución de solicitudes: aprobar, rechazar o solicitar información, con observaciones |
| RF-09 | Funcionario | Panel de reportes y estadísticas (cantidad por estado, tiempos, tipos más solicitados) |

Además: registro, recuperación de contraseña por correo y cancelación de solicitudes pendientes.

## Requerimientos no funcionales

| ID | Categoría | Descripción |
| --- | --- | --- |
| RNF-01 | Rendimiento | Páginas cargables en menos de 3 s en conexiones 3G (Lighthouse Performance ≥ 70) |
| RNF-02 | Seguridad | Contraseñas de mínimo 8 caracteres (mayúscula, minúscula y número); rutas protegidas por autenticación y rol; sesiones revocables, límites de peticiones y cabeceras de seguridad |
| RNF-03 | Usabilidad | Acciones principales en máximo 3 clics desde el dashboard; errores de formulario en tiempo real |
| RNF-04 | Accesibilidad | WCAG 2.1 nivel AA (contraste ≥ 4.5:1, navegación por teclado, etiquetas ARIA) |
| RNF-05 | Compatibilidad | Funcionamiento en Chrome, Firefox y Safari, y en móvil vía Capacitor (iOS/Android) |

## Tecnologías y herramientas

**Frontend**
- Ionic 9 + React 19 + TypeScript, con Vite
- React Router
- Capacitor
- Pruebas: Vitest y Cypress

**Backend**
- Node.js + Express 5 + TypeScript
- MariaDB / MySQL (driver `mysql2`)
- JWT + bcrypt, helmet, express-rate-limit y express-validator
- Resend para los correos (2FA, recuperación de contraseña y avisos de estado)
- Pruebas con el runner de Node (`node:test`)

**Despliegue y herramientas**
- Docker + Docker Compose (MariaDB, API y Nginx)
- Figma (prototipado UI/UX)
- Git / GitHub
- Postman / Insomnia

## Puesta en marcha con Docker

Solo necesitas **Docker Desktop** (Docker con Compose v2). No hace falta instalar Node, npm, MariaDB ni XAMPP. La guía completa para humanos, con instalación de Docker y solución de problemas, está en [`INSTALAR.md`](INSTALAR.md).

```bash
# Clonar la rama docker
git clone -b docker https://github.com/luffy126/MuniStoDomingo-Tramites.git
cd MuniStoDomingo-Tramites
```

Luego, en Windows, doble clic en **`iniciar.bat`** (en macOS/Linux: `./iniciar.sh`). Para detener, `detener.bat` / `./detener.sh`. Es lo mismo que:

```bash
docker compose --env-file .env.docker up -d --build --wait
```

La primera vez tarda unos minutos. Cuando el script dice "Listo":

| Qué | URL |
| --- | --- |
| Aplicación | http://localhost:8080 |
| API (vía Nginx) | http://localhost:8080/api/health |
| API (directo, solo desde tu equipo) | http://localhost:3000/api/health |

**Usuarios de prueba** (contraseña `Test1234`): `vecino@test.com` y `funcionario@test.com`.

Sin clave de Resend, los correos (incluido el código de 6 dígitos de la verificación en dos pasos) aparecen en los logs: `docker compose logs -f backend`. El detalle de variables, volúmenes, claves y problemas comunes está en [`DOCKER.md`](DOCKER.md).

### Solo la base de datos (en lugar de XAMPP)

Si prefieres correr el backend y el frontend en tu equipo con `npm run dev`, levanta únicamente MariaDB en Docker; la base se crea y se llena con la semilla sola. Las instrucciones están en la sección "Solo la base de datos" de [`DOCKER.md`](DOCKER.md).

## Estructura de esta rama

```
.
├── INSTALAR.md          Guía paso a paso para montarlo en otro computador
├── iniciar.bat / .sh    Inicia todo con un doble clic (Windows) o ./iniciar.sh
├── detener.bat / .sh    Detiene todo conservando los datos
├── docker-compose.yml   Orquestación: db + backend + frontend
├── .env.docker          Variables de ejemplo para docker compose
├── DOCKER.md            Referencia técnica del despliegue con Docker
├── Crear BD.md          Manual (para un agente de IA) para crear la base con Docker
├── sync.sh              Trae el código de las ramas backend y frontend
├── backend/             API Express (copia de la rama backend + Dockerfile)
├── frontend/            App Ionic/React (copia de la rama frontend + Dockerfile y nginx.conf)
└── docs/EP1/            Documentación de la entrega parcial 1
```

`backend/` y `frontend/` son copias de las ramas `backend` y `frontend`: el código se edita en esas ramas y aquí se actualiza con `./sync.sh`.

## Diseño y prototipo
- [Prototipo en Figma](#): https://www.figma.com/design/PDRMB1YzTolGblTi9Cxy10/MuniSitioDomingo?node-id=0-1&t=wjmz0PMK0jp7Rtdt-1
- Link Prototipo Aplicación (front): https://ingweb.simonholic.sbs/ (nota: solo esta activa cuando tengo el pc encendido (casi siempre (24/7 (puse muchos paréntesis?))))

## Documentación de la entrega parcial 1

La documentación de cada punto de la EP 1 está centralizada en [`docs/EP1/`](docs/EP1/):

| Punto | Contenido |
| --- | --- |
| [EP 1.1](docs/EP1/EP1.1-requerimientos/) | Requerimientos funcionales y no funcionales |
| [EP 1.2](docs/EP1/EP1.2-usuarios/) | Justificación del problema y caracterización de usuarios |
| [EP 1.3](docs/EP1/EP1.3-ui-ux-figma/) | Bocetos de UI/UX, prototipo en Figma y sistema de diseño |
| [EP 1.4](docs/EP1/EP1.4-arquitectura-navegacion/) | Arquitectura de navegación y experiencia de usuario |
| [EP 1.5](docs/EP1/EP1.5-proyecto-ionic/) | Creación del proyecto en Ionic con React |
| [EP 1.6](docs/EP1/EP1.6-pantallas/) | Diseño de las pantallas principales |

La referencia de la API está en [`backend/docs/API.md`](backend/docs/API.md) y las medidas de seguridad en [`backend/docs/SEGURIDAD.md`](backend/docs/SEGURIDAD.md).

## Ramas del repositorio

| Rama | Contenido |
| --- | --- |
| `main` | Documentación general del proyecto |
| `frontend` | Código de interfaz (Ionic + React) |
| `backend` | API REST, conexión a base de datos, esquema `.sql` y migraciones |
| `docker` | Proyecto completo listo para montar con `docker compose` |
