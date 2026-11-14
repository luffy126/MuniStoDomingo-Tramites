# Aviso para el front: los listados ahora vienen paginados

Para: Melissa (front del equipo). Afecta a `GET /api/solicitudes` y `GET /api/notificaciones`.

## Qué cambió

Ambos endpoints responden de a páginas: **20 elementos por defecto, 100 como máximo**. `data` sigue siendo un arreglo, así que el front no se rompe, pero ahora llega **cortado** y viene un campo nuevo, `pagination`:

```json
{
  "success": true,
  "data": [ ... ],
  "pagination": { "page": 1, "limit": 20, "total": 47, "totalPages": 3, "hasNext": true, "hasPrev": false }
}
```

En `/api/notificaciones`, `pagination` trae además `unread`: el total de avisos sin leer de **todas** las páginas.

| Parámetro | Por defecto | Reglas |
|---|---|---|
| `page` | `1` | Entero desde 1. Una página pasado el final responde `data: []`, no error |
| `limit` | `20` | Entre 1 y 100; un valor mayor se recorta a 100 |

`GET /api/solicitudes?estado=pendiente` filtra en el servidor (solo funcionario) y `total` cuenta lo que cumple el filtro. Referencia completa: `back/docs/API.md`, sección "Paginación".

## Por qué mostrar solo 20 es un problema silencioso

Si el front sigue llamando `GET /api/solicitudes` sin parámetros, no falla ni avisa: simplemente muestra las primeras 20. Con la semilla de desarrollo (5 solicitudes) todo se ve bien, y por eso la demo no lo delata. Con datos reales, la bandeja del funcionario dejaría fuera solicitudes sin que nadie lo note, el vecino con más de 20 trámites no vería los más antiguos, y las pantallas que cuentan elementos (reportes, avisos sin leer) darían números incorrectos.

## Parche mínimo (recorrer todas las páginas)

Es el que ya funciona en `front/` de esta carpeta. Hace falta que el cliente HTTP pueda leer el sobre completo de la respuesta (`pagination` va al lado de `data`), no solo `data`. En `front/src/services/apiClient.ts` eso lo da la función interna `solicitar<T>()` (la parte de `apiClient` que hace el `fetch` y devuelve el sobre); si tu `apiClient` solo devuelve `data`, sepárala igual. Después agrega esto (copiado de `front/src/services/apiClient.ts`):

```ts
/** Metadatos que el backend agrega a los listados paginados. */
export interface Paginacion {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  /** Solo en notificaciones: cuántas no leídas hay en total (todas las páginas). */
  unread?: number;
}

/** Tamaño de página al traer un listado completo: el máximo que acepta el backend. */
const LIMITE_PAGINA = 100;
/** Tope de páginas por listado, para no quedar en un ciclo si el backend respondiera mal. */
const MAX_PAGINAS = 50;

/**
 * Trae un listado completo recorriendo todas sus páginas.
 *
 * El backend entrega los listados de a 20 por defecto; pedir solo la primera
 * página dejaría fuera, sin aviso, lo que no cabe en ella. Si el backend aún no
 * pagina (no envía `pagination`), se devuelve lo recibido tal cual.
 */
const getTodos = async <T>(path: string): Promise<T[]> => {
  const separador = path.includes('?') ? '&' : '?';
  const items: T[] = [];
  for (let page = 1; page <= MAX_PAGINAS; page += 1) {
    const body = await solicitar<T[]>(`${path}${separador}page=${page}&limit=${LIMITE_PAGINA}`);
    items.push(...(body.data ?? []));
    if (!body.pagination?.hasNext) break;
  }
  return items;
};
```

Y se exporta junto a los demás métodos: `export default { get: ..., getTodos, post: ..., }`.

Uso en `front/src/services/tramiteService.ts`, en lugar de `apiClient.get`:

```ts
export const getSolicitudes = async (estado?: EstadoSolicitud): Promise<Solicitud[]> => {
  const query = estado ? `?estado=${encodeURIComponent(estado)}` : '';
  return (await apiClient.getTodos<BackendSolicitud>(`/api/solicitudes${query}`)).map(adaptarSolicitud);
};

export const getNotificaciones = async (): Promise<Notificacion[]> =>
  (await apiClient.getTodos<BackendNotificacion>('/api/notificaciones')).map(adaptarNotificacion);
```

Con eso las pantallas siguen igual, pero reciben todo. El costo es una petición por cada 100 elementos. `MAX_PAGINAS` limita el recorrido a 5.000 elementos por listado.

Las pruebas de esta función están en `front/src/services/apiClient.test.ts` (`getTodos recorre todas las páginas...` y `getTodos funciona con un backend que todavía no pagina`).

## La paginación real en la interfaz es opcional

El parche cumple "no perder datos", pero no aprovecha la paginación. Si el equipo quiere cargar de a 20 con un botón "Cargar más", así se hizo en `front/` de esta carpeta:

- `apiClient.getPagina(path, page, limit)` en `front/src/services/apiClient.ts` devuelve `{ data, pagination }` de una sola página.
- `getSolicitudesPagina` y `getNotificacionesPagina` en `tramiteService.ts` la usan.
- El hook `front/src/hooks/useListaPaginada.ts` guarda lo cargado, pide la página siguiente mientras `hasNext` y descarta respuestas tardías al cambiar de filtro; `front/src/utils/paginacion.ts` evita repetir elementos si entran solicitudes nuevas mientras se pagina.
- El pie "Mostrando X de Y / Cargar más" está en `front/src/components/common/PieListaPaginada.tsx`.
- Pantallas: `pages/funcionario/SolicitudesPage.tsx` (el filtro por estado va al servidor con `?estado=`), `pages/vecino/MisTramitesPage.tsx` y `pages/vecino/NotificacionesPage.tsx` (el contador sale de `pagination.unread`).
- `pages/funcionario/ReportesPage.tsx` sigue con `getTodos` a propósito: agrupa todas las solicitudes por trámite y necesita el listado completo.

Cualquiera de las dos vías sirve; lo que no conviene es dejar el front sin tocar.
