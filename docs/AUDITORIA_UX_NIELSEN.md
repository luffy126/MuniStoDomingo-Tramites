# Auditoría UX del frontend — Heurísticas de Nielsen

**Fecha:** 17 de noviembre de 2026
**Alcance:** `front/` (Ionic + React + TypeScript), rol vecino y rol funcionario.
**Método:** revisión estática de todo `src/`, ejecución de la app contra el backend local
(`:3000`), inspección del DOM y del árbol de accesibilidad en vivo, cálculo de contrastes
WCAG sobre los tokens reales y comparación visual con las capturas de `front/capturas/despues/`.
**Limitación:** el inicio de sesión de funcionario quedó bloqueado por el límite de
`/api/auth` (10 intentos/15 min); las pantallas de funcionario se revisaron con el código y
las capturas existentes (bandeja móvil y escritorio).

---

## 1. Resumen ejecutivo

El frontend tiene una base sólida: identidad visual coherente, estados de carga/vacío/error en
los listados, paginación con «Cargar más», recarga al tirar, actualización automática,
confirmación antes de cancelar y buenas etiquetas en los campos. No es un prototipo descuidado.

Los problemas que más afectan la experiencia son de **accesibilidad y de cierre de flujos**:

1. **Accesibilidad:** el documento declara `lang="en"`, se bloquea el zoom táctil, los filtros
   por categoría **no se pueden usar con teclado**, el buscador se anuncia como «search text» y
   el texto secundario del modo oscuro **no cumple contraste AA** (3,13:1–3,85:1). La RNF-04
   (WCAG 2.1 AA) no se cumple hoy.
2. **Flujos que quedan a medias:** no existe adjuntar documentos (RF-03) aunque los requisitos
   los exigen; el vecino no puede responder a un «En revisión»; las notificaciones no llevan al
   trámite; y el funcionario aprueba/rechaza sin confirmación, sin motivo obligatorio y sin
   deshacer, lo que además envía un correo y bloquea la solicitud de forma irreversible.
3. **Señales de estado:** el éxito de una solicitud se pierde con la redirección de 1,2 s; las
   fechas se muestran como `2026-11-15`; un catálogo que falla se ve igual que «sin resultados»;
   y los reportes muestran ceros cuando la carga falla.

Ninguno de estos puntos exige reescribir la app: la mayoría son cambios acotados de 1 a 3 horas.

### Estado por heurística

| # | Heurística | Estado | Comentario corto |
|---|------------|--------|------------------|
| 1 | Visibilidad del estado | 🟡 | Buenos spinners/auto-recarga; falta confirmación persistente, «actualizado a las…» y el badge de no leídas en la barra de pestañas. |
| 2 | Lenguaje del mundo real | 🟡 | Fechas ISO y el mensaje «revisa que el backend esté ejecutándose» rompen el registro ciudadano. |
| 3 | Control y libertad | 🟡 | Se confirma la cancelación, pero no la resolución; no hay deshacer ni forma de corregir un rechazo. |
| 4 | Consistencia y estándares | 🟡 | Validaciones distintas (nombre ≥3 vs ≥2), «Mis Trámites»/«Mis trámites», menú sin ítem activo. |
| 5 | Prevención de errores | 🔴 | Aprobar/Rechazar irreversible sin confirmación ni motivo obligatorio; se piden documentos que no se pueden adjuntar. |
| 6 | Reconocer antes que recordar | 🟡 | Los estados se ven bien, pero las notificaciones no enlazan al trámite y el folio hay que recordarlo. |
| 7 | Flexibilidad y eficiencia | 🟡 | Paginación y filtro por estado; falta búsqueda/orden en la bandeja y acciones masivas. |
| 8 | Diseño minimalista | 🟢 | Limpio y con buena jerarquía; el bloque de cuentas de prueba es ruido para un usuario final. |
| 9 | Recuperación de errores | 🟡 | Mensajes específicos y «Reintentar» en listas; el catálogo fallido parece vacío y la recuperación de contraseña es un callejón sin salida. |
| 10 | Ayuda y documentación | 🔴 | No hay ayuda sobre folio, plazos, requisitos ni contacto; «términos y condiciones» no es enlace. |

---

## 2. Hallazgos priorizados

Severidad: **Crítico** (impide completar una tarea o incumple AA de forma grave),
**Alto** (afecta a una tarea clave o a muchos usuarios), **Medio** (fricción clara),
**Bajo** (pulido).

### Accesibilidad (RNF-04)

| ID | Sev. | Hallazgo | Evidencia |
|----|------|----------|-----------|
| A1 | Alto | `<html lang="en">` aunque todo el contenido es español; el lector de pantalla usa pronunciación inglesa. También en el build de producción. | `index.html:2`, `dist/index.html` |
| A2 | Alto | `maximum-scale=1.0, user-scalable=no` impide el zoom táctil (WCAG 1.4.4). | `index.html:18-21` |
| A3 | Alto | Los chips de categoría **no son accesibles por teclado**: `ion-chip` no tiene `tabindex`, `role` ni un botón/ancla en su shadow DOM (solo `slot` + ripple). Tab los salta. | `DashboardPage.tsx:75-78`; DOM en vivo: `<ion-chip>` sin `tabindex`, shadow = `<slot> + <ion-ripple-effect>` |
| A4 | Medio | El buscador tiene nombre accesible genérico en inglés: `aria-label="search text"`, aunque el placeholder dice «Buscar trámite». | DOM en vivo de `IonSearchbar`; `DashboardPage.tsx:68` |
| A5 | Medio | Texto secundario `color="medium"` no cumple AA. Modo claro: `#6b7280` sobre `#f3f6f3` = **4,44:1**; modo oscuro: **3,85:1**; chips sin seleccionar en oscuro: **3,13:1** (`#5e6471` sobre `#0b1226`). | `variables.css:66-71` y bloque oscuro `102-145` (no redefine `medium`); uso en `TramiteList.tsx:16`, `PieListaPaginada.tsx:16`, `LoadingSpinner.tsx:13`, `NotificacionesPage.tsx:47` |
| A6 | Alto | Los errores de formulario no están asociados al campo (`aria-describedby`, `aria-invalid`) ni se anuncian (`role="alert"`/`aria-live`), y el foco no se mueve al primer error. | `LoginForm.tsx:61-65`, `RegisterForm.tsx:71-143`, `PerfilPage.tsx:123-144` |
| A7 | Medio | Al cargar, el botón reemplaza su texto por un spinner: el botón pierde su nombre accesible. | `LoginForm.tsx:83-85`, `RegisterForm.tsx:145-147`, `PerfilPage.tsx:146-148`, `PieListaPaginada.tsx:18-20` |
| A8 | Medio | El título del documento nunca cambia al navegar y no se gestiona el foco en la navegación SPA; un lector no sabe que cambió de pantalla. | `grep "document.title"` → 0 resultados |
| A9 | Bajo | No hay `h1` en ninguna vista interior; los títulos de tarjeta son `div`. En `TramiteDetailPage` no hay ningún encabezado. | `TramiteDetailPage.tsx:69-71`; encabezados en vivo: solo `H2`/`H3` |
| A10 | Medio | El estado «no leída» de una notificación se comunica solo con el ícono (sobre abierto/cerrado) y un color; no hay texto ni indicador alternativo. | `NotificacionesPage.tsx:47` |
| A11 | Medio | El manifest PWA está roto: nombre «My Ionic App», `theme_color` blanco y los íconos apuntan a `/assets/icon/...`, que no existen (404). Sin service worker. | `public/manifest.json`; `Test-Path dist/assets/icon/favicon.png` → `False` |
| A12 | Bajo | `apple-mobile-web-app-title` sigue siendo «Ionic App». | `index.html:31` |

### Experiencia de uso y flujos

| ID | Sev. | Hallazgo | Evidencia |
|----|------|----------|-----------|
| U1 | Alto | Las credenciales de prueba (`vecino@test.com` / `funcionario@test.com` / `Test1234`) se muestran en la pantalla de login. En una app municipal publicada confunde y erosiona la confianza. Debería depender de `import.meta.env.DEV`. | `LoginPage.tsx:78-80` |
| U2 | Alto | El funcionario puede **Aprobar o Rechazar con un clic**, sin confirmación, sin motivo obligatorio y sin deshacer. La acción es final (el backend responde 409) y dispara un correo al vecino. | `SolicitudDetailPage.tsx:87`; `resuelta` en `79` |
| U3 | Alto | El vecino no puede responder a un «En revisión»: si la observación dice «faltan planos», no hay forma de adjuntarlos ni contestar. | `MisTramitesPage.tsx:114-133`; `TramiteDetailPage.tsx:71` |
| U4 | Alto | No existe adjuntar documentos (RF-03) aunque los requisitos listados los exigen. Es la brecha funcional más visible del relato «trámite 100% en línea». | `TramiteDetailPage.tsx:70-71`; README RF-03 «Pendiente» |
| U5 | Alto | La barra de pestañas no muestra el contador de notificaciones sin leer; solo aparece al abrir la pestaña. El valor del sistema de avisos es que el vecino se entere sin entrar. | `VecinoTabs.tsx:24-41`; conteo solo en `NotificacionesPage.tsx:43` |
| U6 | Medio | Una notificación no abre el trámite asociado: al tocarla solo cambia el ícono a «leída». No hay «marcar todas como leídas». | `NotificacionesPage.tsx:26-36,47` |
| U7 | Medio | El éxito de «Enviar solicitud» se pierde: toast de 2,5 s + redirección a los 1,2 s; no se muestra el folio ni se pide confirmación para volver. | `TramiteDetailPage.tsx:44-47` |
| U8 | Medio | Las fechas se muestran en ISO (`2026-11-15`) en toda la app; en Chile se espera `15-11-2026` y/o «hace 2 días». | `tramiteService.ts:86,94`; render en `MisTramitesPage.tsx:118`, `NotificacionesPage.tsx:47`, `SolicitudesPage.tsx:54` |
| U9 | Medio | Si falla la carga del catálogo, la pantalla muestra el estado vacío «No encontramos trámites con ese criterio» más un toast temporal: parece que no hay resultados, no que hubo un error. Sin botón de reintento. | `DashboardPage.tsx:79` + `TramiteList.tsx:12-21` |
| U10 | Medio | La búsqueda es sensible a tildes: «numero» no encuentra «Certificado de número municipal». | `DashboardPage.tsx:53-61`; mismo patrón en `tramiteService.ts:100-110` |
| U11 | Medio | La validación ocurre recién al enviar; los mensajes no desaparecen al corregir el campo. La RNF-03 pide errores en tiempo real. | `LoginForm.tsx:33-40`, `RegisterForm.tsx:47-54` |
| U12 | Medio | La bandeja del funcionario no permite buscar por folio, vecino o trámite, ni ordenar; tampoco existe «priorizar» (RF-07). Con volumen, la única forma es recorrer páginas. | `SolicitudesPage.tsx:50-54` |
| U13 | Medio | En Reportes, si la carga falla, la pantalla igual muestra «Total 0» y tarjetas en cero. Además no hay filtro por periodo ni enlace desde un estado a la bandeja filtrada. | `ReportesPage.tsx:21-38,45-48` |
| U14 | Medio | El menú del funcionario no resalta la sección activa (`selected`/`aria-current`). En escritorio se ve el split pane, pero sin indicador de ubicación. | `FuncionarioLayout.tsx:52-64` |
| U15 | Medio | El filtro por estado del funcionario se desborda en móvil: «Aprobado»/«Rechazado» quedan fuera de pantalla sin degradado ni indicio de que se puede deslizar. | Captura `despues/claro/6-funcionario-bandeja-movil.png`; `SolicitudesPage.tsx:50` |
| U16 | Medio | «¿Olvidaste tu contraseña?» abre un toast «disponible próximamente»: un callejón sin salida en el momento de más frustración. | `LoginPage.tsx:64-71` |
| U17 | Medio | Los términos y condiciones no son un enlace ni existe contenido; el checkbox es obligatorio. | `RegisterForm.tsx:130-138` |
| U18 | Medio | No hay teléfono ni dirección en el perfil (RF-06 pendiente), aunque el dominio municipal los necesita para notificar. | `PerfilPage.tsx:115-149` |
| U19 | Medio | El mensaje de red dice «Revisa que el backend esté ejecutándose»: lenguaje de desarrollo para un vecino. | `apiClient.ts:92-97` |
| U20 | Bajo | Validación inconsistente del nombre: registro exige ≥3 caracteres y el perfil permite ≥2. | `RegisterForm.tsx:29-31` vs `PerfilPage.tsx:54` |
| U21 | Bajo | No se avisa de cambios sin guardar al salir del perfil (el botón se deshabilita, pero no hay confirmación de salida). | `PerfilPage.tsx:49,146` |
| U22 | Bajo | El botón «Cancelar solicitud» compite visualmente con el estado en cada fila de «Mis trámites», y no hay «Ver detalle». | `MisTramitesPage.tsx:114-133` |
| U23 | Bajo | Capitalización inconsistente: pestaña «Mis Trámites», título «Mis trámites», encabezado «Catálogo de trámites» y pestaña «Trámites». | `VecinoTabs.tsx:31`, `MisTramitesPage.tsx:92` |
| U24 | Bajo | El logo del login es un PNG con fondo blanco: en modo oscuro queda como un rectángulo blanco. | Captura `despues/oscuro/1-login.png`; `LoginPage.tsx:53` |

### Rendimiento y mantenibilidad que impactan la UX

| ID | Sev. | Hallazgo | Evidencia |
|----|------|----------|-----------|
| P1 | Medio | El bundle principal ronda 1,4 MB sin comprimir y se duplica con `plugin-legacy`; las páginas se importan todas de forma eager. En 3G esto presiona la RNF-01 (Lighthouse ≥ 70). | `dist/assets/index-*.js` (1,41 MB y 1,48 MB legacy), `vite.config.ts` |
| P2 | Medio | Reportes trae **todas** las solicitudes (`getTodos`, hasta 50 páginas) para contar por trámite. Crecerá mal y puede truncar en silencio a las 5.000 filas. | `ReportesPage.tsx:23`; `apiClient.ts:65,143-152` |
| P3 | Bajo | No hay `prefers-reduced-motion`; solo transiciones cortas, pero conviene respetarlo. | `global.css:124-131`; `grep` → 0 resultados |
| P4 | Bajo | Fuentes de Google externas; en redes municipales restringidas se pierde la tipografía (hay fallback). | `index.html:8-13` |

### Entorno de desarrollo

| ID | Sev. | Hallazgo | Evidencia |
|----|------|----------|-----------|
| E1 | Medio | El backend acepta `http://localhost:5174` como origen, pero `npm run dev` levanta Vite en `5173`: el login falla por CORS al seguir el README. Conviene alinear `FRONTEND_URL` o el puerto. | Respuesta `Access-Control-Allow-Origin: http://localhost:5174`; `vite.config.ts` |
| E2 | Bajo | `/api/auth/me` consume el mismo límite que el login (10/15 min); recargar 10 veces deja al usuario sin poder entrar. | `PENDIENTES_SUBAGENTE.md` tarea 8; observado 429 en vivo |

---

## 3. Detalle de las mejoras de mayor impacto (con código sugerido)

### 3.1 Arreglos de accesibilidad de una línea de base

```html
<!-- index.html -->
<html lang="es-CL">
<meta name="viewport" content="viewport-fit=cover, width=device-width, initial-scale=1.0" />
<meta name="apple-mobile-web-app-title" content="Trámites Santo Domingo" />
```

```json
// public/manifest.json
{
  "short_name": "Trámites SD",
  "name": "Trámites · Municipalidad de Santo Domingo",
  "theme_color": "#0d1f61",
  "background_color": "#0d1f61",
  "icons": [
    { "src": "/logo-municipal.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/logo-municipal.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

Y definir `medium` en el bloque oscuro:

```css
:root.ion-palette-dark {
  --ion-color-medium: #a9b2c3;
  --ion-color-medium-rgb: 169, 178, 195;
  --ion-color-medium-shade: #949cab;
  --ion-color-medium-tint: #b2bac9;
}
```

### 3.2 Chips de filtro usables con teclado

`IonChip` no renderiza un control enfocable. Opción recomendada: reemplazarlos por botones
pequeños, que ya traen foco, `role` y estado de pulsado:

```tsx
<IonButton
  size="small"
  fill={categoria === item ? 'solid' : 'outline'}
  aria-pressed={categoria === item}
  onClick={() => setCategoria(item)}
>
  {ETIQUETA_CATEGORIA[item]}
</IonButton>
```

Si se conserva el chip, hay que darle semántica y teclado explícitos:

```tsx
<IonChip
  role="button"
  tabIndex={0}
  aria-pressed={categoria === item}
  onClick={() => setCategoria(item)}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCategoria(item); }
  }}
>
```

### 3.3 Fechas en formato chileno

Centralizar en `utils/fechas.ts`:

```ts
export const formatearFecha = (iso: string): string =>
  new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
    .format(new Date(`${iso.slice(0, 10)}T00:00:00`));
```

Aplicarlo en «Mis trámites», notificaciones y bandeja. Opcional: `Intl.RelativeTimeFormat`
para «hace 2 días» en los avisos recientes.

### 3.4 Confirmar la resolución y exigir motivo al rechazar

```tsx
const confirmar = (estado: EstadoSolicitud): void => {
  if (estado === 'rechazado' && observaciones.trim() === '') {
    void presentarAlerta({ header: 'Falta el motivo', message: 'Explica al vecino por qué se rechaza.', buttons: ['Entendido'] });
    return;
  }
  void presentarAlerta({
    header: 'Confirmar resolución',
    message: `Se marcará como "${ETIQUETA_ESTADO[estado]}" y se notificará al vecino.`,
    buttons: [
      { text: 'Volver', role: 'cancel' },
      { text: 'Confirmar', handler: () => { void cambiarEstado(estado); } },
    ],
  });
};
```

Además: no redirigir automáticamente a los 1,2 s; mostrar un resultado con el folio y un botón
«Volver a la bandeja».

### 3.5 Notificaciones que llevan a alguna parte

- Badge en la pestaña: `<IonBadge color="danger">{sinLeer}</IonBadge>` dentro de
  `IonTabButton` (el contador debe vivir en un contexto/hook compartido, no solo en la página).
- Cada notificación con `folio` debería navegar a `/vecino/mis-tramites` (o a un detalle) y
  marcar como leída.
- Botón «Marcar todas como leídas».
- Texto «No leída» visible o *sr-only* además del ícono.

### 3.6 Búsqueda tolerante a tildes

```ts
const normalizar = (texto: string): string =>
  texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const coincide = (tramite: Tramite, q: string): boolean =>
  normalizar(tramite.nombre).includes(q) ||
  normalizar(tramite.descripcion).includes(q) ||
  normalizar(ETIQUETA_CATEGORIA[tramite.categoria]).includes(q);
```

### 3.7 Distinguir «vacío» de «error»

En `DashboardPage`, guardar el error en estado y renderizar:

```tsx
{solicitudes.length === 0 && error !== '' ? (
  <div className="estado-vacio">
    <IonText color="danger"><p>No pudimos cargar el catálogo.</p></IonText>
    <IonButton fill="outline" onClick={cargarTramites}>Reintentar</IonButton>
  </div>
) : /* lista o vacío real */}
```

Y en el estado vacío del catálogo agregar «Limpiar filtros».

### 3.8 Botones que no pierden su nombre al cargar

```tsx
<IonButton type="submit" expand="block" disabled={cargando} aria-busy={cargando}>
  {cargando ? <IonSpinner name="dots" aria-hidden="true" /> : null}
  {cargando ? 'Ingresando…' : 'Ingresar'}
</IonButton>
```

### 3.9 Errores de formulario anunciados y enlazados

```tsx
<IonInput
  aria-invalid={errores.email !== undefined}
  aria-describedby={errores.email ? 'error-email' : undefined}
  ...
/>
{errores.email ? (
  <IonNote id="error-email" color="danger" role="alert" className="mensaje-error">
    {errores.email}
  </IonNote>
) : null}
```

Complementar con foco al primer campo inválido y validación al salir del campo (`onIonBlur`).
Verificar que Ionic reenvíe `aria-invalid` y `aria-describedby` al `<input>` interno; si no,
ponerlos sobre el elemento nativo mediante `ref`.

### 3.10 Menú del funcionario con sección activa

Usar `IonItem` con `routerLink` y comparar la ruta (`useLocation`) para aplicar
`color="primary"`, o `IonMenuToggle` + `selected`; en el split pane, marcar visualmente la
opción actual. En Reportes, quitar el `IonMenuButton` cuando el menú ya es visible (`when="lg"`).

---

## 4. Brechas frente a los requisitos declarados

| Requisito | Estado real | Qué falta |
|-----------|-------------|-----------|
| RF-03 Adjuntar documentos | **No implementado** | No hay input de archivo, validación de PDF/imagen, tamaño ni estado del documento. |
| RF-06 Perfil (nombre, teléfono, dirección) | Parcial | Solo nombre y correo. |
| RF-07 Priorizar solicitudes | Parcial | Se filtra por estado; no hay prioridad, búsqueda ni orden. |
| RF-09 Reportes (tiempos) | Parcial | Sin tiempos, sin periodo, sin exportación; conteo por trámite calculado en el cliente. |
| RNF-03 Errores de formulario en tiempo real | **No cumplido** | La validación es solo al enviar. |
| RNF-04 WCAG 2.1 AA | **No cumplido** | `lang`, zoom, teclado en chips, contraste en oscuro, errores sin asociar. |
| RNF-01 Carga < 3 s en 3G (Lighthouse ≥ 70) | En riesgo | Bundle principal ~1,4 MB + legacy; conviene medir con Lighthouse real. |

---

## 5. Plan de mejora sugerido

### Ahora (1–2 h cada uno, alto impacto)

1. `lang="es-CL"`, quitar `user-scalable=no`, arreglar manifest y `apple-mobile-web-app-title`.
2. Fechas con `Intl.DateTimeFormat('es-CL')` en los tres listados.
3. Chips de filtro accesibles (botones/segmento con foco y `aria-pressed`).
4. `aria-label="Buscar trámite"` en el buscador y contraste de `medium` en oscuro.
5. Badge de no leídas en la pestaña «Notificaciones».
6. Confirmación + motivo obligatorio al rechazar; quitar la redirección automática.
7. Error vs vacío en el catálogo, con «Reintentar» y «Limpiar filtros».
8. Búsqueda sin tildes.
9. Credenciales de prueba solo en `import.meta.env.DEV`.
10. Mantener el texto del botón mientras carga y asociar los errores a los campos.

### Después (medio plazo)

- Enlazar notificaciones con el trámite y agregar «marcar todas».
- Detalle del trámite para el vecino: línea de tiempo de estados y documentos.
- Búsqueda/orden/prioridad y acciones masivas en la bandeja del funcionario.
- Reportes: filtro por periodo, enlaces a la bandeja filtrada y endpoint de agregación en el backend.
- Advertir cambios sin guardar en el perfil.
- Recuperación de contraseña real o quitar el enlace.
- Íconos PWA definitivos + service worker para instalación/offline básico.
- Lazy loading por ruta y revisar si `plugin-legacy` es necesario.
- Pruebas automatizadas de accesibilidad (`cypress-axe` + `vitest-axe`) y Lighthouse CI.

### Proyecto (requiere backend/producto)

- RF-03 completo (subida, validación, estados y visualización de documentos).
- RF-06 (teléfono/dirección) y RF-07 (prioridad/SLA).
- RF-09 (tiempos) y exportación de reportes.
- Verificación de correo y definición de textos legales (términos, privacidad).

---

## 6. Lo que ya está bien (no tocar)

- Identidad visual coherente («Comuna Parque»), buen contraste general en modo claro y
  jerarquía tipográfica clara.
- Estados de carga, vacío y error en «Mis trámites», notificaciones y bandeja; «Reintentar» en
  los listados.
- Paginación real con «Cargar más», contador «Mostrando X de Y» y `pagination.unread`.
- Recarga al tirar y actualización automática cada 30 s, pausada con la pestaña oculta.
- Confirmación antes de cancelar una solicitud y bloqueo de doble envío.
- `IonInput` con etiquetas flotantes y `autocomplete` correcto; `alt` en el logo; `aria-label`
  en los botones de tema.
- Rutas protegidas por sesión y rol, restauración de sesión robusta y mensajes de API
  específicos.
- Buenos comentarios y pruebas unitarias en hooks, cliente API y arranque de rutas.

---

## 7. Cómo se verificó

- Lectura completa de `front/src` (páginas, componentes, hooks, servicios, rutas y tema).
- App en ejecución (`npm run dev`) contra el backend local; inspección de `/login`,
  `/vecino/dashboard`, `/vecino/tramite/:id`, `/vecino/mis-tramites`,
  `/vecino/notificaciones` y `/vecino/perfil` en modo oscuro y claro.
- Inspección del DOM: `lang`, viewport, `aria-label` del buscador, shadow DOM de `ion-chip`,
  `ion-card` e `ion-tab-button`, encabezados y foco.
- Cálculo de contraste WCAG sobre los colores computados (`#6b7280`/`#5e6471` sobre
  `#0b1226` y `#f3f6f3`).
- Revisión de las capturas de `front/capturas/despues/` para las pantallas de funcionario.
- `grep` de `aria-live`, `aria-describedby`, `aria-invalid`, `prefers-reduced-motion` y
  `document.title` (sin resultados en `src`).
