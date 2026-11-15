import { Storage } from '@ionic/storage';

class StorageService {
  private storage: Storage | null = null;
  private initPromise: Promise<Storage> | null = null;

  async init(): Promise<Storage> {
    if (this.storage) return this.storage;
    if (!this.initPromise) {
      const store = new Storage({ name: 'munisd_db' });
      this.initPromise = store.create();
    }

    try {
      this.storage = await this.initPromise;
      return this.storage;
    } catch (error) {
      this.initPromise = null;
      throw error;
    }
  }

  async get<T = string>(key: string): Promise<T | null> {
    const store = await this.init();
    return store.get(key);
  }

  async set(key: string, value: unknown): Promise<void> {
    const store = await this.init();
    await store.set(key, value);
  }

  async remove(key: string): Promise<void> {
    const store = await this.init();
    await store.remove(key);
  }
}

const storageService = new StorageService();
export default storageService;
