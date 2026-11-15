import { Storage } from '@ionic/storage';

/** Lo mínimo que se usa de @ionic/storage; permite reemplazarlo en los tests. */
export interface AlmacenClaveValor {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<unknown>;
  remove(key: string): Promise<unknown>;
}

const crearAlmacenIonic = async (): Promise<AlmacenClaveValor> => new Storage({ name: 'munisd_db' }).create();

/**
 * Respaldo de la sesión en IndexedDB (vía @ionic/storage, que cae a localStorage
 * si IndexedDB no existe).
 *
 * Decisiones:
 * - **Nunca lanza.** Es un respaldo: si IndexedDB también está bloqueado, la app
 *   sigue como antes (solo localStorage) en vez de romper el login.
 * - **Las operaciones se ejecutan en orden.** Guardar y luego cerrar sesión debe
 *   terminar con la sesión borrada aunque las promesas resuelvan desordenadas;
 *   si no, una recarga podría restaurar una sesión cerrada.
 * - **Se inicializa una sola vez**, al primer uso.
 */
export class StorageService {
  private almacen: Promise<AlmacenClaveValor | null> | null = null;
  private cola: Promise<unknown> = Promise.resolve();

  constructor(private readonly crear: () => Promise<AlmacenClaveValor> = crearAlmacenIonic) {}

  private init(): Promise<AlmacenClaveValor | null> {
    this.almacen ??= this.crear().catch(() => null);
    return this.almacen;
  }

  /** Encola una operación detrás de las anteriores. Un fallo no corta la cola. */
  private enOrden<T>(operacion: (almacen: AlmacenClaveValor) => Promise<T>, siFalla: T): Promise<T> {
    const resultado = this.cola.then(async () => {
      const almacen = await this.init();
      if (almacen === null) return siFalla;
      try {
        return await operacion(almacen);
      } catch {
        return siFalla;
      }
    });
    this.cola = resultado;
    return resultado;
  }

  get<T>(key: string): Promise<T | null> {
    return this.enOrden(async (a) => ((await a.get(key)) ?? null) as T | null, null);
  }

  set(key: string, value: unknown): Promise<void> {
    return this.enOrden(async (a) => { await a.set(key, value); }, undefined);
  }

  remove(key: string): Promise<void> {
    return this.enOrden(async (a) => { await a.remove(key); }, undefined);
  }
}

/** Instancia única de la app. */
const storageService = new StorageService();
export default storageService;
