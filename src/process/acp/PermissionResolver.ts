export enum PermissionDecision {
  AllowOnce = 'allow_once',
  AllowAlways = 'allow_always',
  Deny = 'deny'
}

export interface PermissionResult {
  decision: PermissionDecision;
  cacheable: boolean;
  scope: string;
}

interface CacheEntry {
  decision: PermissionDecision;
  timestamp: number;
  accessCount: number;
}

export class PermissionResolver {
  private cache: Map<string, CacheEntry> = new Map();
  private lruOrder: string[] = [];
  private static readonly MAX_CACHE_SIZE = 500;
  private static readonly CACHE_TTL = 3600000;

  resolve(permission: string, context?: Record<string, unknown>): PermissionResult {
    const cacheKey = this.buildCacheKey(permission, context);

    const cached = this.getCached(cacheKey);
    if (cached) {
      return {
        decision: cached.decision,
        cacheable: cached.decision !== PermissionDecision.Deny,
        scope: permission
      };
    }

    const decision = this.evaluate(permission, context);

    if (decision !== PermissionDecision.Deny) {
      this.setCache(cacheKey, decision);
    }

    return {
      decision,
      cacheable: decision !== PermissionDecision.Deny,
      scope: permission
    };
  }

  private buildCacheKey(permission: string, context?: Record<string, unknown>): string {
    if (!context) {
      return permission;
    }
    const relevant = Object.keys(context)
      .sort()
      .map(k => `${k}=${context[k]}`)
      .join('&');
    return `${permission}?${relevant}`;
  }

  private getCached(key: string): CacheEntry | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    if (Date.now() - entry.timestamp > PermissionResolver.CACHE_TTL) {
      this.cache.delete(key);
      this.lruOrder = this.lruOrder.filter(k => k !== key);
      return null;
    }

    entry.accessCount++;
    this.lruOrder = this.lruOrder.filter(k => k !== key);
    this.lruOrder.push(key);

    return entry;
  }

  private setCache(key: string, decision: PermissionDecision): void {
    if (this.cache.size >= PermissionResolver.MAX_CACHE_SIZE) {
      const oldest = this.lruOrder.shift();
      if (oldest) {
        this.cache.delete(oldest);
      }
    }

    this.cache.set(key, {
      decision,
      timestamp: Date.now(),
      accessCount: 1
    });

    this.lruOrder.push(key);
  }

  private evaluate(permission: string, context?: Record<string, unknown>): PermissionDecision {
    return PermissionDecision.AllowOnce;
  }

  invalidate(permission?: string): void {
    if (permission) {
      const keysToDelete = Array.from(this.cache.keys()).filter(k => k.startsWith(permission));
      keysToDelete.forEach(k => {
        this.cache.delete(k);
        this.lruOrder = this.lruOrder.filter(key => key !== k);
      });
    } else {
      this.cache.clear();
      this.lruOrder = [];
    }
  }

  getCacheStats(): { size: number; maxSize: number; entries: string[] } {
    return {
      size: this.cache.size,
      maxSize: PermissionResolver.MAX_CACHE_SIZE,
      entries: Array.from(this.cache.keys())
    };
  }

  pruneExpired(): number {
    const now = Date.now();
    let pruned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > PermissionResolver.CACHE_TTL) {
        this.cache.delete(key);
        this.lruOrder = this.lruOrder.filter(k => k !== key);
        pruned++;
      }
    }

    return pruned;
  }
}

export function createPermissionResolver(): PermissionResolver {
  return new PermissionResolver();
}