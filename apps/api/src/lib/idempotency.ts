const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface IdempotencyRecord {
  statusCode: number;
  body: unknown;
  createdAt: number;
}

export class IdempotencyStore {
  private readonly store = new Map<string, IdempotencyRecord>();
  private readonly processing = new Set<string>();

  get(key: string): IdempotencyRecord | undefined {
    const record = this.store.get(key);
    if (!record) {
      return undefined;
    }
    if (Date.now() - record.createdAt > TTL_MS) {
      this.store.delete(key);
      return undefined;
    }
    return record;
  }

  isProcessing(key: string): boolean {
    return this.processing.has(key);
  }

  markProcessing(key: string): void {
    this.processing.add(key);
  }

  clearProcessing(key: string): void {
    this.processing.delete(key);
  }

  set(key: string, record: IdempotencyRecord): void {
    this.store.set(key, record);
  }
}

export const idempotencyStore = new IdempotencyStore();
