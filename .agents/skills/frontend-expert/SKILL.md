---
name: frontend-expert
description: Use when creating Ionic React/TypeScript components, pages, or features. For modern patterns including IonPage structure, IonReactRouter, lazy loading, Suspense, React Hook Form + Zod, AuthContext, and performance optimization.
---

# Frontend Expert — Ionic + React

Modern Ionic React/TypeScript development patterns for MuniStoDomingo Trámites.

## 🎯 Overview

This skill provides comprehensive guidelines for building production-grade Ionic React applications with:
- **Ionic-first architecture** - Use `IonPage`, `IonHeader`, `IonContent`, `IonMenu`, `IonTabs`
- **Suspense-first loading** - No manual loading spinners, no early returns
- **Type-safe patterns** - Strict TypeScript, no `any` types
- **Performance by default** - Lazy loading routes, memoization
- **Role-based access** - PrivateRoute, RoleRoute guards with AuthContext

## 📋 Quick Start: Component Checklist

```markdown
- [ ] Wrap page in `<IonPage>` with `<IonHeader>` + `<IonContent>`
- [ ] Use `React.FC<Props>` pattern with TypeScript
- [ ] Lazy load page components: `React.lazy(() => import())`
- [ ] Wrap lazy components in `<Suspense fallback={<IonLoading />}>`
- [ ] Use Ionic components: IonButton, IonInput, IonCard, IonList, IonItem
- [ ] Forms: React Hook Form + Zod + IonInput (use Controller for Ionic inputs)
- [ ] Use `useCallback` for event handlers passed to children
- [ ] Default export at bottom
- [ ] No early returns with loading spinners
- [ ] Use IonToast for user notifications
```

## 📋 Quick Start: Page Checklist

```markdown
- [ ] Create page in `src/pages/{role}/{PageName}.tsx`
- [ ] Wrap in `<IonPage>` → `<IonHeader>` → `<IonContent>`
- [ ] Add route in `src/routes/` (public, vecino, or admin)
- [ ] Protect with PrivateRoute/RoleRoute if needed
- [ ] Lazy load via `React.lazy()`
- [ ] Mobile: uses IonTabs bottom bar
- [ ] Web: uses IonMenu sidebar
- [ ] Export public API from page index
```

---

## 🚫 Critical Rules

### Always Wrap Pages in IonPage

```typescript
// ❌ NEVER - Raw div as page
const MyPage = () => <div>Content</div>;

// ✅ ALWAYS - IonPage structure
const MyPage: React.FC = () => (
    <IonPage>
        <IonHeader>
            <IonToolbar>
                <IonTitle>Mi Página</IonTitle>
            </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
            {/* Content */}
        </IonContent>
    </IonPage>
);
```

### No Early Returns for Loading

```typescript
// ❌ NEVER - Causes layout shift
if (isLoading) {
    return <IonLoading isOpen={true} />;
}

// ✅ ALWAYS - Suspense boundary
<Suspense fallback={<IonLoading isOpen={true} message="Cargando..." />}>
    <LazyContent />
</Suspense>
```

### Use Controller for Ionic Inputs with React Hook Form

```typescript
// ❌ NEVER - register() doesn't work with Ionic inputs
<IonInput {...register('email')} />

// ✅ ALWAYS - Controller wraps Ionic components
<Controller
    name="email"
    control={control}
    render={({ field }) => (
        <IonInput
            value={field.value}
            onIonInput={(e) => field.onChange(e.detail.value)}
            type="email"
            label="Correo electrónico"
            labelPlacement="floating"
        />
    )}
/>
```

### Routing: IonReactRouter, NOT TanStack Router

```typescript
// ❌ NEVER - TanStack Router
import { createFileRoute } from '@tanstack/react-router';

// ✅ ALWAYS - IonReactRouter
import { IonReactRouter } from '@ionic/react-router';
import { Route, Redirect } from 'react-router-dom';
```

---

## 📂 Project Structure

```
src/
├── components/              # Reusable components
│   ├── common/              # IonButton wrappers, Cards, StatusBadge
│   ├── layout/              # AppLayout, VecinoLayout, AdminLayout
│   └── guards/              # PrivateRoute.tsx, RoleRoute.tsx
├── contexts/                # React Contexts
│   ├── AuthContext.tsx       # Auth state + mock session
│   └── TramiteContext.tsx    # Tramite state
├── hooks/                   # Custom hooks
│   ├── useAuth.ts
│   ├── useTramites.ts
│   └── useToast.ts          # IonToast wrapper hook
├── pages/                   # Pages (each is an IonPage)
│   ├── public/              # Login, Registro, CatalogoTramites
│   ├── vecino/              # Dashboard, MisTramites, NuevoTramite, Perfil
│   └── admin/               # AdminDashboard, Solicitudes, Reportes
├── routes/                  # Route configuration
│   ├── AppRoutes.tsx        # Main router with IonReactRouter
│   ├── publicRoutes.ts
│   ├── vecinoRoutes.ts
│   └── adminRoutes.ts
├── services/                # API services (mock in EP1)
│   ├── authService.ts
│   ├── tramiteService.ts
│   └── mockData.ts
├── types/                   # TypeScript interfaces
│   ├── user.ts
│   ├── tramite.ts
│   └── routes.ts
├── utils/                   # Utilities
│   └── validators.ts
├── theme/
│   └── variables.css        # Ionic CSS variables
├── App.tsx
└── main.tsx
```

### File Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| **Pages** | PascalCase `.tsx` | `Dashboard.tsx`, `NuevoTramite.tsx` |
| **Components** | PascalCase `.tsx` | `StatusBadge.tsx`, `TramiteCard.tsx` |
| **Hooks** | camelCase `use` prefix `.ts` | `useAuth.ts`, `useTramites.ts` |
| **Services** | camelCase `Service` suffix `.ts` | `authService.ts`, `tramiteService.ts` |
| **Types** | camelCase `.ts` | `user.ts`, `tramite.ts` |
| **Contexts** | PascalCase `Context` suffix `.tsx` | `AuthContext.tsx` |

---

## 🧩 Ionic Component Patterns

### Page Template

```typescript
import React from 'react';
import {
    IonPage, IonHeader, IonToolbar, IonTitle,
    IonContent, IonButtons, IonBackButton,
} from '@ionic/react';

interface MiPaginaProps {
    /** Page title displayed in header */
    titulo: string;
    /** Show back button */
    showBack?: boolean;
}

export const MiPagina: React.FC<MiPaginaProps> = ({ titulo, showBack = false }) => {
    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    {showBack && (
                        <IonButtons slot="start">
                            <IonBackButton defaultHref="/dashboard" />
                        </IonButtons>
                    )}
                    <IonTitle>{titulo}</IonTitle>
                </IonToolbar>
            </IonHeader>
            <IonContent className="ion-padding">
                {/* Page content */}
            </IonContent>
        </IonPage>
    );
};

export default MiPagina;
```

### Navigation: Web (IonMenu) vs Mobile (IonTabs)

```typescript
// VecinoLayout.tsx — Adaptive layout
import { isPlatform } from '@ionic/react';

export const VecinoLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const isDesktop = isPlatform('desktop');

    if (isDesktop) {
        return (
            <>
                <IonMenu contentId="main-content" side="start">
                    <IonHeader>
                        <IonToolbar>
                            <IonTitle>MuniStoDomingo</IonTitle>
                        </IonToolbar>
                    </IonHeader>
                    <IonContent>
                        <IonList>
                            <IonItem routerLink="/dashboard">Inicio</IonItem>
                            <IonItem routerLink="/mis-tramites">Mis Trámites</IonItem>
                            <IonItem routerLink="/notificaciones">Notificaciones</IonItem>
                            <IonItem routerLink="/perfil">Perfil</IonItem>
                        </IonList>
                    </IonContent>
                </IonMenu>
                <IonPage id="main-content">
                    {children}
                </IonPage>
            </>
        );
    }

    return (
        <IonTabs>
            <IonRouterOutlet>
                {children}
            </IonRouterOutlet>
            <IonTabBar slot="bottom">
                <IonTabButton tab="inicio" href="/dashboard">
                    <IonIcon icon={homeOutline} />
                    <IonLabel>Inicio</IonLabel>
                </IonTabButton>
                <IonTabButton tab="tramites" href="/mis-tramites">
                    <IonIcon icon={documentTextOutline} />
                    <IonLabel>Trámites</IonLabel>
                </IonTabButton>
                <IonTabButton tab="notificaciones" href="/notificaciones">
                    <IonIcon icon={notificationsOutline} />
                    <IonLabel>Avisos</IonLabel>
                </IonTabButton>
                <IonTabButton tab="perfil" href="/perfil">
                    <IonIcon icon={personOutline} />
                    <IonLabel>Perfil</IonLabel>
                </IonTabButton>
            </IonTabBar>
        </IonTabs>
    );
};
```

### Modals/Alerts — Use IonModal, IonAlert, IonActionSheet

```typescript
// ❌ NEVER - HTML dialog or MUI Dialog
<dialog open={isOpen}>...</dialog>

// ✅ ALWAYS - Ionic modals
<IonModal isOpen={isOpen} onDidDismiss={() => setIsOpen(false)}>
    <IonHeader>
        <IonToolbar>
            <IonTitle>Confirmar acción</IonTitle>
            <IonButtons slot="end">
                <IonButton onClick={() => setIsOpen(false)}>Cerrar</IonButton>
            </IonButtons>
        </IonToolbar>
    </IonHeader>
    <IonContent className="ion-padding">
        {/* Modal content */}
    </IonContent>
</IonModal>

// For confirmations, use IonAlert
<IonAlert
    isOpen={showAlert}
    onDidDismiss={() => setShowAlert(false)}
    header="¿Confirmar envío?"
    message="Esta acción no se puede deshacer"
    buttons={['Cancelar', { text: 'Confirmar', handler: handleConfirm }]}
/>
```

### Notifications — Use IonToast

```typescript
// Custom hook for toast notifications
export const useToast = () => {
    const [toast, setToast] = useState<{
        isOpen: boolean;
        message: string;
        color: string;
    }>({ isOpen: false, message: '', color: 'success' });

    const showSuccess = (message: string) =>
        setToast({ isOpen: true, message, color: 'success' });

    const showError = (message: string) =>
        setToast({ isOpen: true, message, color: 'danger' });

    const ToastComponent = (
        <IonToast
            isOpen={toast.isOpen}
            message={toast.message}
            color={toast.color}
            duration={3000}
            onDidDismiss={() => setToast(prev => ({ ...prev, isOpen: false }))}
            position="top"
        />
    );

    return { showSuccess, showError, ToastComponent };
};
```

---

## 🔐 Auth & Route Guards

### AuthContext (Mock for EP1)

```typescript
import React, { createContext, useContext, useState } from 'react';
import type { User } from '../types/user';

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<boolean>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};

const MOCK_USERS: User[] = [
    { id: '1', email: 'vecino@test.cl', nombre: 'María González', role: 'vecino' },
    { id: '2', email: 'admin@muni.cl', nombre: 'Carlos Pérez', role: 'funcionario' },
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);

    const login = async (email: string, password: string): Promise<boolean> => {
        const found = MOCK_USERS.find(u => u.email === email);
        if (found && password === 'Test1234') {
            setUser(found);
            return true;
        }
        return false;
    };

    const logout = () => setUser(null);

    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
```

### PrivateRoute & RoleRoute Guards

```typescript
// guards/PrivateRoute.tsx
import { Route, Redirect } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export const PrivateRoute: React.FC<{
    children: React.ReactNode;
    path: string;
    exact?: boolean;
}> = ({ children, ...rest }) => {
    const { isAuthenticated } = useAuth();

    return (
        <Route {...rest}>
            {isAuthenticated ? children : <Redirect to="/login" />}
        </Route>
    );
};

// guards/RoleRoute.tsx
export const RoleRoute: React.FC<{
    role: 'vecino' | 'funcionario';
    children: React.ReactNode;
    path: string;
    exact?: boolean;
}> = ({ role, children, ...rest }) => {
    const { user, isAuthenticated } = useAuth();

    return (
        <Route {...rest}>
            {!isAuthenticated ? (
                <Redirect to="/login" />
            ) : user?.role !== role ? (
                <Redirect to={user?.role === 'funcionario' ? '/admin/dashboard' : '/dashboard'} />
            ) : (
                children
            )}
        </Route>
    );
};
```

### Route Configuration

```typescript
// routes/AppRoutes.tsx
import { IonReactRouter } from '@ionic/react-router';
import { IonRouterOutlet } from '@ionic/react';
import { Route, Redirect } from 'react-router-dom';

const Login = React.lazy(() => import('../pages/public/Login'));
const Registro = React.lazy(() => import('../pages/public/Registro'));
const Dashboard = React.lazy(() => import('../pages/vecino/Dashboard'));
const AdminDashboard = React.lazy(() => import('../pages/admin/AdminDashboard'));

export const AppRoutes: React.FC = () => (
    <IonReactRouter>
        <IonRouterOutlet>
            {/* Public */}
            <Route exact path="/login">
                <Suspense fallback={<IonLoading isOpen={true} />}>
                    <Login />
                </Suspense>
            </Route>
            <Route exact path="/registro">
                <Suspense fallback={<IonLoading isOpen={true} />}>
                    <Registro />
                </Suspense>
            </Route>

            {/* Vecino */}
            <PrivateRoute exact path="/dashboard">
                <RoleRoute role="vecino">
                    <Suspense fallback={<IonLoading isOpen={true} />}>
                        <Dashboard />
                    </Suspense>
                </RoleRoute>
            </PrivateRoute>

            {/* Admin */}
            <PrivateRoute exact path="/admin/dashboard">
                <RoleRoute role="funcionario">
                    <Suspense fallback={<IonLoading isOpen={true} />}>
                        <AdminDashboard />
                    </Suspense>
                </RoleRoute>
            </PrivateRoute>

            {/* Default redirect */}
            <Route exact path="/">
                <Redirect to="/login" />
            </Route>
        </IonRouterOutlet>
    </IonReactRouter>
);
```

---

## 📝 Forms with React Hook Form + Zod + Ionic

### Registration Form Example

```typescript
import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
    IonInput, IonButton, IonItem, IonList, IonNote, IonText,
} from '@ionic/react';

const registroSchema = z.object({
    nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
    email: z.string().email('Correo electrónico inválido'),
    password: z.string()
        .min(8, 'Mínimo 8 caracteres')
        .regex(/[A-Z]/, 'Debe incluir al menos una mayúscula')
        .regex(/[a-z]/, 'Debe incluir al menos una minúscula')
        .regex(/[0-9]/, 'Debe incluir al menos un número'),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
});

type RegistroFormData = z.infer<typeof registroSchema>;

export const RegistroPage: React.FC = () => {
    const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegistroFormData>({
        resolver: zodResolver(registroSchema),
        defaultValues: { nombre: '', email: '', password: '', confirmPassword: '' },
    });

    const onSubmit = async (data: RegistroFormData) => {
        // Mock submit for EP1
        console.log('Registro:', data);
    };

    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    <IonTitle>Registro</IonTitle>
                </IonToolbar>
            </IonHeader>
            <IonContent className="ion-padding">
                <form onSubmit={handleSubmit(onSubmit)}>
                    <IonList>
                        <IonItem>
                            <Controller
                                name="nombre"
                                control={control}
                                render={({ field }) => (
                                    <IonInput
                                        label="Nombre completo *"
                                        labelPlacement="floating"
                                        value={field.value}
                                        onIonInput={(e) => field.onChange(e.detail.value)}
                                        className={errors.nombre ? 'ion-invalid ion-touched' : ''}
                                    />
                                )}
                            />
                        </IonItem>
                        {errors.nombre && (
                            <IonText color="danger">
                                <p className="ion-padding-start">{errors.nombre.message}</p>
                            </IonText>
                        )}

                        <IonItem>
                            <Controller
                                name="email"
                                control={control}
                                render={({ field }) => (
                                    <IonInput
                                        label="Correo electrónico *"
                                        labelPlacement="floating"
                                        type="email"
                                        value={field.value}
                                        onIonInput={(e) => field.onChange(e.detail.value)}
                                        className={errors.email ? 'ion-invalid ion-touched' : ''}
                                    />
                                )}
                            />
                        </IonItem>
                        {errors.email && (
                            <IonText color="danger">
                                <p className="ion-padding-start">{errors.email.message}</p>
                            </IonText>
                        )}

                        <IonItem>
                            <Controller
                                name="password"
                                control={control}
                                render={({ field }) => (
                                    <IonInput
                                        label="Contraseña *"
                                        labelPlacement="floating"
                                        type="password"
                                        value={field.value}
                                        onIonInput={(e) => field.onChange(e.detail.value)}
                                        className={errors.password ? 'ion-invalid ion-touched' : ''}
                                    />
                                )}
                            />
                        </IonItem>
                        {errors.password && (
                            <IonText color="danger">
                                <p className="ion-padding-start">{errors.password.message}</p>
                            </IonText>
                        )}
                    </IonList>

                    <IonButton
                        expand="block"
                        type="submit"
                        disabled={isSubmitting}
                        className="ion-margin-top"
                    >
                        {isSubmitting ? 'Registrando...' : 'Crear cuenta'}
                    </IonButton>
                </form>
            </IonContent>
        </IonPage>
    );
};

export default RegistroPage;
```

---

## ⚡ Performance

### Lazy Loading Pages (ALWAYS)

```typescript
// ✅ Lazy load all page-level components
const Dashboard = React.lazy(() => import('./pages/vecino/Dashboard'));
const MisTramites = React.lazy(() => import('./pages/vecino/MisTramites'));
const AdminDashboard = React.lazy(() => import('./pages/admin/AdminDashboard'));
```

### useMemo for Expensive Computations

```typescript
const filteredTramites = useMemo(() => {
    return tramites
        .filter(t => t.estado === filtroEstado)
        .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
}, [tramites, filtroEstado]);
```

### useCallback for Handlers Passed to Children

```typescript
const handleTramiteSelect = useCallback((tramiteId: string) => {
    history.push(`/tramites/${tramiteId}`);
}, [history]);
```

### Debounced Search

```typescript
import { useDebounce } from 'use-debounce';

const [busqueda, setBusqueda] = useState('');
const [debouncedBusqueda] = useDebounce(busqueda, 300);

// Use debouncedBusqueda for filtering/API calls
```

---

## 🔤 TypeScript Standards

### Strict Rules

- ✅ `strict: true` in tsconfig.json
- ✅ No `any` type — use `unknown` if truly unknown
- ✅ Explicit return types on functions and hooks
- ✅ `import type { X }` for type-only imports
- ✅ JSDoc comments on all prop interfaces
- ✅ Use utility types: `Partial<T>`, `Pick<T, K>`, `Omit<T, K>`, `Record<K, V>`

### Project Types

```typescript
// types/user.ts
export interface User {
    id: string;
    email: string;
    nombre: string;
    role: 'vecino' | 'funcionario';
    telefono?: string;
    direccion?: string;
}

// types/tramite.ts
export type EstadoTramite = 'pendiente' | 'en_revision' | 'aprobado' | 'rechazado' | 'info_adicional';

export interface Tramite {
    id: string;
    tipo: TipoTramite;
    estado: EstadoTramite;
    vecinoId: string;
    fechaCreacion: string;
    fechaActualizacion: string;
    descripcion: string;
    documentos: Documento[];
    observaciones: Observacion[];
}

export interface Documento {
    id: string;
    nombre: string;
    url: string;
    tipo: string;
    tamanio: number;
}
```

---

## 📚 Topic Guides (References)

| Topic | Reference File | Applicability |
|-------|---------------|---------------|
| Component Patterns | [component-patterns.md](references/component-patterns.md) | ✅ Adapt: replace `<Box>` → `<IonContent>`, `<Paper>` → `<IonCard>` |
| Data Fetching | [references/data-fetching.md](references/data-fetching.md) | ✅ Universal — use for EP2 backend integration |
| File Organization | [references/file-organization.md](references/file-organization.md) | ✅ Adapt: use `pages/` instead of `routes/`, `services/` instead of `features/api/` |
| Performance | [references/performance.md](references/performance.md) | ✅ Universal — useMemo, useCallback, React.memo, debounce |
| TypeScript Standards | [references/typescript-standards.md](references/typescript-standards.md) | ✅ Universal — strict mode, no any, type imports |
| Common Patterns | [references/common-patterns.md](references/common-patterns.md) | ⚠️ Adapt: replace MUI forms → Ionic + Controller, Dialog → IonModal |
| Loading & Error States | [references/loading-and-error-states.md](references/loading-and-error-states.md) | ⚠️ Adapt: replace SuspenseLoader → Suspense + IonLoading |
| Complete Examples | [references/complete-examples.md](references/complete-examples.md) | ⚠️ Adapt: MUI → Ionic components |
| Routing Guide | [references/routing-guide.md](references/routing-guide.md) | ❌ Skip — TanStack Router, use IonReactRouter instead |
| Styling Guide | [references/styling-guide.md](references/styling-guide.md) | ❌ Skip — MUI sx prop, use Ionic CSS variables instead |

---

## 🎨 Styling: Ionic CSS Variables

```css
/* theme/variables.css */
:root {
    --ion-color-primary: #1a5276;        /* Azul municipalidad */
    --ion-color-secondary: #2ecc71;      /* Verde confirmación */
    --ion-color-tertiary: #f39c12;       /* Amarillo warning */
    --ion-color-success: #27ae60;
    --ion-color-warning: #f1c40f;
    --ion-color-danger: #e74c3c;

    --ion-font-family: 'Inter', sans-serif;
}

/* Use Ionic utility classes, NOT custom CSS for spacing */
/* ✅ className="ion-padding ion-margin-top" */
/* ❌ style={{ padding: 16, marginTop: 8 }} */
```

---

## 📚 Core Principles

1. **IonPage Always** — Every page wrapped in `<IonPage>` with header
2. **Lazy Load All Pages** — `React.lazy()` for route-level components
3. **Suspense for Loading** — `<Suspense fallback={<IonLoading />}>`
4. **Controller for Forms** — React Hook Form `Controller` + Ionic inputs
5. **Guards for Routes** — PrivateRoute + RoleRoute with AuthContext
6. **Web ↔ Mobile** — IonMenu (web) vs IonTabs (mobile) via `isPlatform()`
7. **Ionic Components Only** — No raw HTML inputs/buttons, no MUI
8. **IonToast for Feedback** — All user notifications via `useToast` hook
9. **TypeScript Strict** — No `any`, explicit types, type imports
10. **CSS Variables** — Ionic theme variables, utility classes
