export { AcpSession, SessionStatus } from './AcpSession';
export type {
  SessionState,
  StartCommand,
  PromptCommand,
  SuspendCommand,
  ResumeCommand,
  CloseCommand,
  SessionCommand,
  McpServerConfig,
  SessionEvent
} from './AcpSession';

export { SessionLifecycle, createLifecycleManager } from './SessionLifecycle';
export type { LifecycleConfig } from './SessionLifecycle';

export { PermissionResolver, createPermissionResolver } from './PermissionResolver';
export { PermissionDecision } from './PermissionResolver';
export type { PermissionResult } from './PermissionResolver';

export { MessageTranslator, createMessageTranslator } from './MessageTranslator';
export type {
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcError,
  AcpMessage
} from './MessageTranslator';

export { ConfigTracker, createConfigTracker } from './ConfigTracker';
export type { MergedMcpConfig, ConfigSource } from './ConfigTracker';

export { IdleReclaimer, createIdleReclaimer } from './IdleReclaimer';
export type { IdleReclaimerConfig } from './IdleReclaimer';

import { AcpSession, SessionStatus } from './AcpSession';
import { SessionLifecycle } from './SessionLifecycle';
import { PermissionResolver } from './PermissionResolver';
import { MessageTranslator } from './MessageTranslator';
import { ConfigTracker } from './ConfigTracker';
import { IdleReclaimer } from './IdleReclaimer';

export interface AcpSessionManager {
  createSession(conversationId: string): AcpSession;
  getSession(sessionId: string): AcpSession | undefined;
  closeSession(sessionId: string): Promise<void>;
  getActiveCount(): number;
}

export function createSessionManager(): AcpSessionManager {
  const sessions = new Map<string, AcpSession>();
  const lifecycle = new SessionLifecycle();
  const permissionResolver = new PermissionResolver();
  const messageTranslator = new MessageTranslator();
  const configTracker = new ConfigTracker();
  const idleReclaimer = new IdleReclaimer(lifecycle);

  idleReclaimer.start();

  return {
    createSession(conversationId: string): AcpSession {
      const session = new AcpSession();
      session.subscribe((event) => {
        if (event.type === 'session:status_changed') {
          if (event.payload.to === SessionStatus.Idle) {
            sessions.delete(conversationId);
          }
        }
      });
      sessions.set(conversationId, session);
      lifecycle.register(conversationId, session);
      return session;
    },

    getSession(sessionId: string): AcpSession | undefined {
      return sessions.get(sessionId);
    },

    async closeSession(sessionId: string): Promise<void> {
      const session = sessions.get(sessionId);
      if (session) {
        await session.close({ type: 'close', graceful: true });
        lifecycle.unregister(sessionId);
        sessions.delete(sessionId);
      }
    },

    getActiveCount(): number {
      return lifecycle.getActiveSessions().length;
    }
  };
}