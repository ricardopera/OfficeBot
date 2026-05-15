export interface DedupEntry {
  count: number;
  firstSeen: Date;
  lastSeen: Date;
}

export class EventDeduplicator {
  private cache: Map<string, DedupEntry> = new Map();
  private readonly TTL_MS = 5 * 60 * 1000;
  private readonly CLEANUP_INTERVAL_MS = 60 * 1000;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanup();
  }

  isDuplicate(eventId: string): boolean {
    const now = new Date();
    const entry = this.cache.get(eventId);
    if (!entry) {
      this.cache.set(eventId, {
        count: 1,
        firstSeen: now,
        lastSeen: now,
      });
      return false;
    }
    entry.count++;
    entry.lastSeen = now;
    return true;
  }

  makeKey(platform: string, userId: string, chatId: string, messageId: string): string {
    return `${platform}:${userId}:${chatId}:${messageId}`;
  }

  checkAndMark(platform: string, userId: string, chatId: string, messageId: string): boolean {
    const key = this.makeKey(platform, userId, chatId, messageId);
    return this.isDuplicate(key);
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.cache.entries()) {
        if (now - entry.lastSeen.getTime() > this.TTL_MS) {
          this.cache.delete(key);
        }
      }
    }, this.CLEANUP_INTERVAL_MS);
  }

  getStats(): { size: number; oldest: Date | null } {
    let oldest: Date | null = null;
    for (const entry of this.cache.values()) {
      if (!oldest || entry.firstSeen < oldest) {
        oldest = entry.firstSeen;
      }
    }
    return { size: this.cache.size, oldest };
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
  }
}