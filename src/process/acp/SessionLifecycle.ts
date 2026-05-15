import { AcpSession, SessionStatus } from './AcpSession';

export interface LifecycleConfig {
  idleTimeout: number;
  promptTimeout: number;
  startRetries: number;
  resumeRetries: number;
  authRetryLimit: number;
}

export class SessionLifecycle {
  private sessions: Map<string, AcpSession> = new Map();
  private config: LifecycleConfig;
  private startBackoff: Map<string, number[]> = new Map();
  private resumeBackoff: Map<string, number[]> = new Map();

  constructor(config: Partial<LifecycleConfig> = {}) {
    this.config = {
      idleTimeout: config.idleTimeout ?? 300000,
      promptTimeout: config.promptTimeout ?? 300000,
      startRetries: config.startRetries ?? 3,
      resumeRetries: config.resumeRetries ?? 2,
      authRetryLimit: config.authRetryLimit ?? 1
    };
  }

  register(sessionId: string, session: AcpSession): void {
    this.sessions.set(sessionId, session);
    this.startBackoff.set(sessionId, []);
    this.resumeBackoff.set(sessionId, []);
  }

  unregister(sessionId: string): void {
    this.sessions.delete(sessionId);
    this.startBackoff.delete(sessionId);
    this.resumeBackoff.delete(sessionId);
  }

  get(sessionId: string): AcpSession | undefined {
    return this.sessions.get(sessionId);
  }

  calculateStartBackoff(sessionId: string, attempt: number): number {
    const baseDelay = 1000;
    const delay = baseDelay * Math.pow(2, attempt - 1);
    const backoffs = this.startBackoff.get(sessionId) || [];
    backoffs.push(delay);
    this.startBackoff.set(sessionId, backoffs);
    return delay;
  }

  calculateResumeBackoff(sessionId: string, attempt: number): number {
    const baseDelay = 1000;
    const delay = baseDelay * Math.pow(2, attempt - 1);
    const backoffs = this.resumeBackoff.get(sessionId) || [];
    backoffs.push(delay);
    this.resumeBackoff.set(sessionId, backoffs);
    return delay;
  }

  clearBackoff(sessionId: string): void {
    this.startBackoff.delete(sessionId);
    this.resumeBackoff.delete(sessionId);
  }

  getActiveSessions(): AcpSession[] {
    return Array.from(this.sessions.values()).filter(
      s => s.getStatus() === SessionStatus.Active ||
           s.getStatus() === SessionStatus.Prompting
    );
  }

  getSuspendedSessions(): AcpSession[] {
    return Array.from(this.sessions.values()).filter(
      s => s.getStatus() === SessionStatus.Suspended
    );
  }

  cleanup(): void {
    for (const [sessionId, session] of this.sessions) {
      const state = session.getState();
      if (state.status === SessionStatus.Idle ||
          state.status === SessionStatus.Error) {
        this.unregister(sessionId);
      }
    }
  }
}

export function createLifecycleManager(config?: Partial<LifecycleConfig>): SessionLifecycle {
  return new SessionLifecycle(config);
}