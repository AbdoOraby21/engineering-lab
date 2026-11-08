interface CacheEntry {
  value: unknown;
  expiresAt: number;
}

export interface TtlCache {
  get<T>(key: string): T | undefined;
  set(key: string, value: unknown, ttlSeconds: number): void;
  delete(key: string): void;
  deletePrefix(prefix: string): void;
  clear(): void;
}

export class InMemoryTtlCache implements TtlCache {
  private readonly entries = new Map<string, CacheEntry>();
  private sweeper: NodeJS.Timeout | undefined;

  get<T>(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) {
      return undefined;
    }
    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  set(key: string, value: unknown, ttlSeconds: number): void {
    if (ttlSeconds <= 0) {
      return;
    }
    this.ensureSweeper();
    this.entries.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  delete(key: string): void {
    this.entries.delete(key);
  }

  deletePrefix(prefix: string): void {
    for (const key of this.entries.keys()) {
      if (key.startsWith(prefix)) {
        this.entries.delete(key);
      }
    }
  }

  clear(): void {
    this.entries.clear();
  }

  private ensureSweeper(): void {
    if (this.sweeper) {
      return;
    }
    this.sweeper = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.entries) {
        if (entry.expiresAt <= now) {
          this.entries.delete(key);
        }
      }
      if (this.entries.size === 0 && this.sweeper) {
        clearInterval(this.sweeper);
        this.sweeper = undefined;
      }
    }, 60_000);
    this.sweeper.unref();
  }
}

// Redis-ready: swap this instance for a Redis-backed implementation of TtlCache
// without changing call sites.
export const catalogCache: TtlCache = new InMemoryTtlCache();

export const CATALOG_CACHE_PREFIX = 'catalog:';
export const CATALOG_CACHE_TTL_SECONDS = 60;
export const SUGGEST_CACHE_TTL_SECONDS = 5;

export function invalidateCatalogCache(): void {
  catalogCache.deletePrefix(CATALOG_CACHE_PREFIX);
}

export async function cached<T>(
  key: string,
  ttlSeconds: number,
  producer: () => Promise<T>,
): Promise<T> {
  const hit = catalogCache.get<T>(CATALOG_CACHE_PREFIX + key);
  if (hit !== undefined) {
    return hit;
  }
  const value = await producer();
  catalogCache.set(CATALOG_CACHE_PREFIX + key, value, ttlSeconds);
  return value;
}
