import { AcpSession, SessionStatus } from './AcpSession';
import { SessionLifecycle } from './SessionLifecycle';

export interface IdleReclaimerConfig {
  timeoutMs: number;
  checkIntervalMs: number;
  onSuspend?: (sessionId: string) => void;
}

export class IdleReclaimer {
  private lifecycle: SessionLifecycle;
  private config: IdleReclaimerConfig;
  private timer: ReturnType<typeof setInterval> | null = null;
  private enabled: boolean = true;

  constructor(lifecycle: SessionLifecycle, config: Partial<IdleReclaimerConfig> = {}) {
    this.lifecycle = lifecycle;
    this.config = {
      timeoutMs: config.timeoutMs ?? 300000,
      checkIntervalMs: config.checkIntervalMs ?? 30000,
      onSuspend: config.onSuspend
    };
  }

  start(): void {
    if (this.timer) {
      return;
    }

    this.timer = setInterval(() => {
      this.check();
    }, this.config.checkIntervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  private check(): void {
    if (!this.enabled) {
      return;
    }

    const now = Date.now();
    const activeSessions = this.lifecycle.getActiveSessions();

    for (const session of activeSessions) {
      const state = session.getState();
      const elapsed = now - state.lastActivity;

      if (elapsed >= this.config.timeoutMs) {
        this.suspendSession(session, state.conversationId || 'unknown');
      }
    }
  }

  private async suspendSession(session: AcpSession, conversationId: string): Promise<void> {
    try {
      await session.suspend({ type: 'suspend', reason: 'idle_timeout' });

      if (this.config.onSuspend) {
        this.config.onSuspend(session.getState().sessionId || conversationId);
      }
    } catch (error) {
      console.error(`Failed to suspend session ${conversationId}:`, error);
    }
  }

  getTimeout(): number {
    return this.config.timeoutMs;
  }

  setTimeout(timeoutMs: number): void {
    this.config.timeoutMs = timeoutMs;
  }

  getLastCheck(): Date | null {
    return null;
  }

  getStats(): { checked: number; suspended: number } {
    return { checked: 0, suspended: 0 };
  }
}

export function createIdleReclaimer(lifecycle: SessionLifecycle, config?: Partial<IdleReclaimerConfig>): IdleReclaimer {
  return new IdleReclaimer(lifecycle, config);
}