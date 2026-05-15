import { Request, Response, NextFunction } from 'express';

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
  skip?: (req: Request) => boolean;
}

export interface RateLimitEntry {
  count: number;
  resetAt: number;
  blocked: boolean;
}

export class RateLimiterStore {
  private store = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(private cleanupIntervalMs = 60000) {
    this.startCleanup();
  }

  get(key: string): RateLimitEntry | undefined {
    return this.store.get(key);
  }

  set(key: string, entry: RateLimitEntry): void {
    this.store.set(key, entry);
  }

  increment(key: string, windowMs: number): RateLimitEntry {
    const now = Date.now();
    let entry = this.store.get(key);
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs, blocked: false };
    }
    entry.count++;
    this.store.set(key, entry);
    return entry;
  }

  block(key: string, resetAt: number): void {
    this.store.set(key, { count: 0, resetAt, blocked: true });
  }

  unblock(key: string): void {
    this.store.delete(key);
  }

  isBlocked(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (Date.now() > entry.resetAt) {
      this.store.delete(key);
      return false;
    }
    return entry.blocked;
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.store.entries()) {
        if (now > entry.resetAt) {
          this.store.delete(key);
        }
      }
    }, this.cleanupIntervalMs);
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.store.clear();
  }
}

export class RateLimiter {
  private store: RateLimiterStore;
  private configs: Map<string, RateLimitConfig> = new Map();

  constructor() {
    this.store = new RateLimiterStore();
    this.configureDefaultLimits();
  }

  private configureDefaultLimits(): void {
    this.configs.set('auth', {
      windowMs: 15 * 60 * 1000,
      maxRequests: 5,
      keyGenerator: (req) => req.ip || 'unknown'
    });

    this.configs.set('api', {
      windowMs: 60 * 1000,
      maxRequests: 60,
      keyGenerator: (req) => req.ip || 'unknown'
    });

    this.configs.set('file', {
      windowMs: 60 * 1000,
      maxRequests: 30,
      keyGenerator: (req) => req.ip || 'unknown'
    });

    this.configs.set('authAction', {
      windowMs: 60 * 1000,
      maxRequests: 20,
      keyGenerator: (req) => {
        const user = (req as Request & { user?: { userId?: string } }).user;
        return user?.userId || req.ip || 'unknown';
      }
    });
  }

  limit(limiterName: string): (req: Request, res: Response, next: NextFunction) => void {
    const config = this.configs.get(limiterName);
    if (!config) {
      return (_req, _res, next) => next();
    }

    return (req: Request, res: Response, next: NextFunction): void => {
      if (config.skip?.(req)) {
        return next();
      }

      const key = config.keyGenerator?.(req) || req.ip || 'unknown';

      if (this.store.isBlocked(key)) {
        res.status(429).json({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil((this.store.get(key)?.resetAt || Date.now()) - Date.now()) / 1000
        });
        return;
      }

      const entry = this.store.increment(key, config.windowMs);

      res.setHeader('X-RateLimit-Limit', config.maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, config.maxRequests - entry.count));
      res.setHeader('X-RateLimit-Reset', entry.resetAt);

      if (entry.count > config.maxRequests) {
        this.store.block(key, entry.resetAt);
        res.status(429).json({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil((entry.resetAt - Date.now()) / 1000)
        });
        return;
      }

      next();
    };
  }

  authLimiter = this.limit('auth');
  apiLimiter = this.limit('api');
  fileLimiter = this.limit('file');
  authActionLimiter = this.limit('authAction');

  configure(name: string, config: RateLimitConfig): void {
    this.configs.set(name, config);
  }

  destroy(): void {
    this.store.destroy();
  }
}

export const rateLimiter = new RateLimiter();
export default rateLimiter;