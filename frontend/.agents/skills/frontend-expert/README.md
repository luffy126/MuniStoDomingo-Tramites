# frontend-expert Skill

## Overview

Guía de desarrollo para **Ionic 8 + React 18 + TypeScript** adaptada al proyecto MuniStoDomingo Trámites.

## Stack Cubierto

| Tecnología | Uso |
|-----------|-----|
| Ionic 8 | Framework UI híbrido (web + móvil) |
| React 18 | Librería de componentes |
| TypeScript | Tipado estricto |
| IonReactRouter | Navegación (React Router v5) |
| React Hook Form + Zod | Formularios + validación |
| React Context | Estado global (AuthContext, TramiteContext) |
| Ionic Components | IonPage, IonHeader, IonContent, IonTabs, IonMenu, etc. |

## Qué cubre esta skill

- ✅ Estructura de páginas con `IonPage`
- ✅ Navegación: `IonReactRouter`, `IonTabs` (móvil), `IonMenu` (web)
- ✅ Guards de ruta: `PrivateRoute`, `RoleRoute`
- ✅ AuthContext con sesión mock (EP1)
- ✅ Formularios con `Controller` + Ionic inputs + Zod
- ✅ Lazy loading de páginas con `React.lazy()`
- ✅ Suspense con `IonLoading` como fallback
- ✅ TypeScript estricto: no `any`, tipos explícitos, `import type`
- ✅ Performance: `useMemo`, `useCallback`, `React.memo`, debounce
- ✅ Notificaciones con `IonToast`
- ✅ Modales con `IonModal`, `IonAlert`
- ✅ Estilos con CSS Variables de Ionic

## Qué NO aplica (de la versión anterior)

- ❌ MUI v7 (`<Box>`, `<Paper>`, `sx` prop, `SxProps<Theme>`)
- ❌ TanStack Router (`createFileRoute`, `$param.tsx`)
- ❌ Aliases `~types`, `~components`, `~features` (no configurados en Ionic)
- ❌ `useMuiSnackbar` (reemplazado por `IonToast`)
- ❌ DataGridPro (reemplazado por `IonList` + `IonCard`)

## Guías de referencia

Los archivos en `references/` son de la versión original (MUI). Consultar con estas adaptaciones:

| Archivo | Adaptación necesaria |
|---------|---------------------|
| `component-patterns.md` | Reemplazar `<Box>` → `<IonContent>`, `<Paper>` → `<IonCard>` |
| `data-fetching.md` | Universal, usar para EP2 backend |
| `file-organization.md` | Usar `pages/` en vez de `routes/`, `services/` en vez de `features/api/` |
| `performance.md` | Universal — aplicar tal cual |
| `typescript-standards.md` | Universal — aplicar tal cual |
| `common-patterns.md` | Reemplazar MUI forms → Ionic + Controller, Dialog → IonModal |
| `loading-and-error-states.md` | Reemplazar SuspenseLoader → Suspense + IonLoading |
| `routing-guide.md` | ❌ NO usar — es TanStack Router |
| `styling-guide.md` | ❌ NO usar — es MUI sx prop |
| `complete-examples.md` | Adaptar: MUI → Ionic components |
