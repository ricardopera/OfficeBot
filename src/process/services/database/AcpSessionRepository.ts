import { ISqliteDriver, Result } from './ISqliteDriver'

export type SessionStatus = 'idle' | 'starting' | 'active' | 'prompting' | 'suspended' | 'resuming' | 'error'

export interface AcpSession {
  conversation_id: string
  agent_backend: string
  agent_source: string
  agent_id: string
  session_id: string | null
  session_status: SessionStatus
  session_config: string | null
  last_active_at: number | null
  suspended_at: number | null
}

export class AcpSessionRepository {
  constructor(private db: ISqliteDriver) {}

  start(session: Omit<AcpSession, 'last_active_at' | 'suspended_at'>): Result {
    return this.db.run(
      `INSERT INTO acp_session (conversation_id, agent_backend, agent_source, agent_id, session_id, session_status, session_config, last_active_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [session.conversation_id, session.agent_backend, session.agent_source,
       session.agent_id, session.session_id, 'starting', session.session_config, Date.now()]
    )
  }

  findById(conversationId: string): AcpSession | undefined {
    const rows = this.db.query<AcpSession>(
      'SELECT * FROM acp_session WHERE conversation_id = ?', [conversationId])
    return rows[0]
  }

  updateStatus(conversationId: string, status: SessionStatus): Result {
    return this.db.run(
      `UPDATE acp_session SET session_status = ?, last_active_at = ? WHERE conversation_id = ?`,
      [status, Date.now(), conversationId])
  }

  prompt(conversationId: string, sessionId: string): Result {
    return this.db.run(
      `UPDATE acp_session SET session_status = 'prompting', session_id = ?, last_active_at = ? WHERE conversation_id = ?`,
      [sessionId, Date.now(), conversationId])
  }

  suspend(conversationId: string): Result {
    return this.db.run(
      `UPDATE acp_session SET session_status = 'suspended', suspended_at = ?, last_active_at = ? WHERE conversation_id = ?`,
      [Date.now(), Date.now(), conversationId])
  }

  resume(conversationId: string): Result {
    return this.db.run(
      `UPDATE acp_session SET session_status = 'resuming', last_active_at = ? WHERE conversation_id = ?`,
      [Date.now(), conversationId])
  }

  close(conversationId: string): Result {
    return this.db.run(
      `UPDATE acp_session SET session_status = 'idle', session_id = NULL, last_active_at = ? WHERE conversation_id = ?`,
      [Date.now(), conversationId])
  }

  updateAgentId(conversationId: string, agentId: string): Result {
    return this.db.run(
      `UPDATE acp_session SET agent_id = ?, last_active_at = ? WHERE conversation_id = ?`,
      [agentId, Date.now(), conversationId])
  }

  getActiveSessions(): AcpSession[] {
    return this.db.query<AcpSession>(
      `SELECT * FROM acp_session WHERE session_status IN ('active', 'prompting', 'starting', 'resuming')`)
  }
}