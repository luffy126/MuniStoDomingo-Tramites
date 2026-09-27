# EP 1.4 - Arquitectura de navegación y experiencia del usuario

Documenta la estructura de rutas, la jerarquía de vistas y el flujo de interacción de la
aplicación. Corresponde a lo implementado en la rama `frontend` (`src/routes/`).

## (a) Rutas principales y secundarias

### Públicas

| Ruta | Vista | Acceso |
| --- | --- | --- |
| `/login` | Inicio de sesión | Cualquier visitante |
| `/register` | Registro de vecino | Cualquier visitante |

### Vecino (requieren sesión y rol `vecino`)

| Ruta | Vista | Tipo |
| --- | --- | --- |
| `/vecino/dashboard` | Catálogo de trámites | Principal |
| `/vecino/tramite/:id` | Detalle e inicio de trámite | Secundaria |
| `/vecino/mis-tramites` | Seguimiento de solicitudes | Principal |
| `/vecino/notificaciones` | Bandeja de avisos | Principal |
| `/vecino/perfil` | Datos de la cuenta | Principal |

### Funcionario (requieren sesión y rol `funcionario`)

| Ruta | Vista | Tipo |
| --- | --- | --- |
| `/funcionario/solicitudes` | Bandeja de solicitudes | Principal |
| `/funcionario/solicitud/:id` | Detalle y resolución | Secundaria |
| `/funcionario/reportes` | Panel de estadísticas | Principal |

## (b) Relaciones jerárquicas entre vistas

```
/ (redirección según sesión y rol)
├── /login
├── /register
├── /vecino/*          > layout de pestañas (IonTabs)
│   ├── dashboard      > tramite/:id
│   ├── mis-tramites
│   ├── notificaciones
│   └── perfil
└── /funcionario/*     > layout de menú lateral (IonMenu + IonSplitPane)
    ├── solicitudes    > solicitud/:id
    └── reportes
```

Cada sección tiene su propio `IonRouterOutlet` anidado, de modo que las vistas secundarias
se apilan sobre la principal conservando el historial y el gesto de volver.

## (c) Flujo de navegación entre funcionalidades

- Desde el **catálogo**, tocar una tarjeta abre el **detalle del trámite**; al enviar la
  solicitud se redirige a **Mis trámites**, donde aparece con estado *Pendiente*.
- Desde la **bandeja del funcionario**, tocar una solicitud abre el **detalle**; al
  resolverla se vuelve a la bandeja con el estado actualizado.
- Las cuatro vistas principales del vecino son accesibles en todo momento desde la barra de
  pestañas; las del funcionario, desde el menú lateral.

## (d) Diferenciación de acceso según roles

Tres componentes controlan el acceso:

| Componente | Responsabilidad |
| --- | --- |
| `PrivateRoute` | Exige sesión iniciada; si no hay, envía a `/login`. |
| `RoleRoute` | Exige un rol concreto; si no coincide, envía al inicio del rol que sí tiene. |
| `Redireccion` | Ejecuta la redirección mostrando una página de transición, para no romper el stack de Ionic. |

Reglas de redirección:

| Situación | Destino |
| --- | --- |
| Visitante sin sesión en una ruta protegida | `/login` |
| Sesión de vecino en `/` | `/vecino/dashboard` |
| Sesión de funcionario en `/` | `/funcionario/solicitudes` |
| Vecino intentando entrar a `/funcionario/*` | `/vecino/dashboard` |
| Funcionario intentando entrar a `/vecino/*` | `/funcionario/solicitudes` |
| Ruta inexistente | `/` y desde ahí según el caso |

## (e) Flujo de las tareas principales

**Tarea 1 - El vecino inicia un trámite (RF-01, RF-02)**

```
Login > Catálogo > (buscar o filtrar por categoría) > Tarjeta del trámite
      > Detalle: revisar requisitos > Observaciones (opcional)
      > Enviar solicitud > Mis trámites (estado: Pendiente)
```
Cuatro toques desde el catálogo hasta la solicitud enviada.

**Tarea 2 - El funcionario resuelve una solicitud (RF-07, RF-08)**

```
Login > Bandeja de solicitudes > (filtrar por estado) > Solicitud
      > Detalle: datos del solicitante > Observaciones
      > Aprobar / En revisión / Rechazar > Bandeja actualizada
```

## (f) Puntos críticos de interacción

| Punto | Tratamiento |
| --- | --- |
| Credenciales incorrectas | `IonToast` en color de peligro, sin perder lo escrito |
| Formulario incompleto | Mensaje bajo cada campo, antes de enviar |
| Envío de una solicitud | Confirmación visible y redirección automática al seguimiento |
| Resolución de una solicitud | Confirmación con el estado aplicado y retorno a la bandeja |
| Sesión ausente o expirada | Redirección a `/login` sin pantallas intermedias en blanco |
| Catálogo sin resultados | Estado vacío explicativo en lugar de una lista en blanco |

## (g) Coherencia de experiencia entre dispositivos

- El vecino usa la misma barra de pestañas en móvil y escritorio; cambia la densidad, no la
  estructura.
- El funcionario tiene el menú lateral deslizable en móvil y fijo desde 992 px.
- El catálogo pasa de una a dos columnas a partir de 768 px.
- Los contenedores tienen ancho máximo y quedan centrados, para que en escritorio el
  contenido no se estire de borde a borde.
- La aplicación respeta el modo claro y oscuro del sistema operativo.

## (h) Justificación técnica

- **Outlets anidados en lugar de un router plano:** cada sección conserva su propio stack de
  navegación, que es lo que permite que el gesto de volver y las transiciones de Ionic
  funcionen como en una aplicación nativa.
- **Guards como componentes que envuelven la vista:** la regla de acceso se declara junto a
  la ruta y no se repite dentro de cada página, lo que evita duplicar lógica cuando se
  agreguen vistas nuevas.
- **Redirección imperativa (`Redireccion`) en los guards:** un `<Navigate>` devuelto desde un
  guard dentro de un `IonRouterOutlet` provoca un ciclo de actualizaciones, porque el outlet
  espera renderizar siempre una página. El componente muestra una página de transición y
  navega en un efecto.
- **Separación en `pages`, `components`, `routes` y `services`:** las vistas no conocen el
  origen de los datos, así que al reemplazar los datos de prueba por la API de la EP 2 sólo
  cambian los servicios.
- **Escalabilidad:** agregar un trámite no requiere tocar el router, y agregar una vista a
  una sección es una línea en el outlet correspondiente.
