# EP 1.5 - Creación del proyecto en Ionic con React

Código en la rama `frontend`. Stack: Ionic 9, React 19, TypeScript, React Router 6 y Vite.

## (a) Uso de React Router

El enrutado se declara de forma centralizada en `src/routes/AppRoutes.tsx`, dentro de un
`IonRouterOutlet` envuelto por `IonReactRouter`. Cada sección de la aplicación monta su
propio outlet anidado, lo que preserva el stack de navegación de Ionic:

| Archivo | Rol |
| --- | --- |
| `routes/AppRoutes.tsx` | Rutas raíz: públicas, secciones por rol y redirecciones |
| `pages/vecino/VecinoTabs.tsx` | Outlet y barra de pestañas del vecino |
| `pages/funcionario/FuncionarioLayout.tsx` | Outlet y menú lateral del funcionario |

## (b) Rutas públicas y protegidas

Públicas: `/login` y `/register`.

Protegidas: todo `/vecino/*` y `/funcionario/*`. La protección se aplica envolviendo la
sección con dos guards, que se combinan:

```tsx
<Route
  path="/vecino/*"
  element={
    <PrivateRoute>
      <RoleRoute rol="vecino">
        <VecinoTabs />
      </RoleRoute>
    </PrivateRoute>
  }
/>
```

`PrivateRoute` verifica que exista sesión y `RoleRoute` que el rol corresponda. El estado de
sesión se administra en `context/AuthContext.tsx` con React Context, y se conserva entre
recargas en el almacenamiento local del navegador.

## (c) Redirecciones

| Origen | Destino | Motivo |
| --- | --- | --- |
| `/` con sesión de vecino | `/vecino/dashboard` | Inicio según rol |
| `/` con sesión de funcionario | `/funcionario/solicitudes` | Inicio según rol |
| `/` sin sesión | `/login` | Login obligatorio |
| Ruta protegida sin sesión | `/login` | Login obligatorio |
| Rol incorrecto | Inicio del rol propio | Separación de roles |
| Ruta inexistente | `/` | Sin páginas huérfanas |

Las redirecciones de los guards usan el componente `routes/Redireccion.tsx`, que muestra una
página de transición y navega en un efecto. Se implementó así porque devolver un `<Navigate>`
desde un guard dentro de un `IonRouterOutlet` genera un ciclo de actualizaciones: el outlet
necesita renderizar siempre una página.

## (d) Estructura modular de vistas

```
src/
├── routes/        AppRoutes, PrivateRoute, RoleRoute, Redireccion
├── context/       AuthContext (sesión y roles)
├── pages/
│   ├── auth/          LoginPage, RegisterPage
│   ├── vecino/        VecinoTabs + 5 vistas
│   └── funcionario/   FuncionarioLayout + 3 vistas
├── components/
│   ├── common/        Header, LoadingSpinner
│   ├── forms/         LoginForm, RegisterForm
│   └── tramites/      TramiteCard, TramiteList
├── services/      authService, tramiteService
├── utils/         validators, iconos
└── theme/         variables.css (paleta municipal), global.css
```

Las vistas no acceden directamente a los datos: los piden a los servicios. Cuando en la
EP 2 los datos vengan de la API, sólo cambian los archivos de `services/`.

## Autenticación de prueba

Mientras no exista backend, `services/authService.ts` simula el inicio de sesión con dos
cuentas:

| Correo | Contraseña | Rol |
| --- | --- | --- |
| `vecino@test.com` | `Test1234` | vecino |
| `funcionario@test.com` | `Test1234` | funcionario |

El registro crea cuentas nuevas con rol vecino durante la sesión.

## Verificación

| Comprobación | Resultado |
| --- | --- |
| `npm run build` | Compila sin errores |
| `npm run lint` | Sin errores |
| `npx tsc --noEmit` | Sin errores de tipos (no se usa `any`) |
| Navegación completa en navegador | Sin errores en consola |
| Rutas protegidas sin sesión | Redirigen a `/login` |
| Acceso cruzado entre roles | Redirige al inicio del rol propio |
