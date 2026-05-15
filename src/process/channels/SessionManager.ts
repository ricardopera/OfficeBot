export interface ChannelSession {
  userId: string;
  chatId: string;
  platform: string;
  pairedUserId?: string;
  status: 'pending' | 'active' | 'suspended';
  createdAt: Date;
  lastActivity?: Date;
  conversationId?: string;
}

export class SessionManager {
  private sessions: Map<string, ChannelSession> = new Map();

  private makeKey(userId: string, chatId: string): string {
    return `${userId}:${chatId}`;
  }

  create(platform: string, userId: string, chatId: string): ChannelSession {
    const key = this.makeKey(userId, chatId);
    const existing = this.sessions.get(key);
    if (existing && existing.status === 'active') {
      existing.lastActivity = new Date();
      return existing;
    }
    const session: ChannelSession = {
      userId,
      chatId,
      platform,
      status: 'pending',
      createdAt: new Date(),
    };
    this.sessions.set(key, session);
    return session;
  }

  get(userId: string, chatId: string): ChannelSession | undefined {
    return this.sessions.get(this.makeKey(userId, chatId));
  }

  getByChatId(chatId: string): ChannelSession | undefined {
    for (const session of this.sessions.values()) {
      if (session.chatId === chatId && session.status === 'active') {
        return session;
      }
    }
    return undefined;
  }

  activate(userId: string, chatId: string, conversationId?: string): void {
    const key = this.makeKey(userId, chatId);
    const session = this.sessions.get(key);
    if (session) {
      session.status = 'active';
      session.lastActivity = new Date();
      session.pairedUserId = userId;
      if (conversationId) {
        session.conversationId = conversationId;
      }
    }
  }

  suspend(userId: string, chatId: string): void {
    const key = this.makeKey(userId, chatId);
    const session = this.sessions.get(key);
    if (session) {
      session.status = 'suspended';
      session.lastActivity = new Date();
    }
  }

  remove(userId: string, chatId: string): boolean {
    return this.sessions.delete(this.makeKey(userId, chatId));
  }

  getAll(): ChannelSession[] {
    return Array.from(this.sessions.values());
  }

  cleanupStale(maxIdleMs: number = 30 * 60 * 1000): number {
    const now = Date.now();
    let removed = 0;
    for (const [key, session] of this.sessions.entries()) {
      if (session.lastActivity && (now - session.lastActivity.getTime()) > maxIdleMs) {
        this.sessions.delete(key);
        removed++;
      }
    }
    return removed;
  }
}