import { ISqliteDriver, Result } from './ISqliteDriver'

export interface Conversation {
  id: string
  user_id: string
  name: string | null
  type: string
  extra: string | null
  model: string | null
  status: string
  created_at: number
  updated_at: number
}

export class ConversationRepository {
  constructor(private db: ISqliteDriver) {}

  create(conversation: Omit<Conversation, 'created_at' | 'updated_at'>): Result {
    const now = Date.now()
    return this.db.run(
      `INSERT INTO conversations (id, user_id, name, type, extra, model, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [conversation.id, conversation.user_id, conversation.name, conversation.type,
       conversation.extra, conversation.model, conversation.status || 'pending', now, now]
    )
  }

  findById(id: string): Conversation | undefined {
    const rows = this.db.query<Conversation>(
      'SELECT * FROM conversations WHERE id = ?', [id])
    return rows[0]
  }

  findByUserId(userId: string): Conversation[] {
    return this.db.query<Conversation>(
      'SELECT * FROM conversations WHERE user_id = ? ORDER BY updated_at DESC',
      [userId])
  }

  update(id: string, data: Partial<Conversation>): Result {
    const fields: string[] = []
    const values: any[] = []
    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name) }
    if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status) }
    if (data.model !== undefined) { fields.push('model = ?'); values.push(data.model) }
    if (data.extra !== undefined) { fields.push('extra = ?'); values.push(data.extra) }
    fields.push('updated_at = ?')
    values.push(Date.now())
    values.push(id)
    return this.db.run(
      `UPDATE conversations SET ${fields.join(', ')} WHERE id = ?`,
      values
    )
  }

  delete(id: string): Result {
    return this.db.run('DELETE FROM conversations WHERE id = ?', [id])
  }
}