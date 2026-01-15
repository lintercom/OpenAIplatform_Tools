import { StorageAdapter } from './types';

export class MockStorageAdapter implements StorageAdapter {
  private storage = new Map<string, { value: any; expiresAt?: number }>();

  async get(key: string): Promise<any> {
    const entry = this.storage.get(key);
    if (!entry) {
      return null;
    }

    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.storage.delete(key);
      return null;
    }

    return entry.value;
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    const expiresAt = ttl ? Date.now() + ttl * 1000 : undefined;
    this.storage.set(key, { value, expiresAt });
  }

  async delete(key: string): Promise<void> {
    this.storage.delete(key);
  }
}
