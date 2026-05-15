import { ISqliteDriver, Result } from './ISqliteDriver'

export interface Message {
  id: string
  conversation_id: string
  msg_id: string | null
  type: string
  content: string
  position: string
  status: string
  created_at: number
}

export class MessageRepository {
  constructor(private db: ISqliteDriver) {}

  create(message: Omit<Message, 'created_at'>): Result {
    return this.db.run(
      `INSERT INTO messages (id, conversation_id, msg_id, type, content, position, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [message.id, message.conversation_id, message.msg_id, message.type,
       message.content, message.position || 'left', message.status || 'pending', Date.now()]
    )
  }

  findByConversationId(conversationId: string): Message[] {
    return this.db.query<Message>(
      `SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC`,
      [conversationId])
  }

  append(conversationId: string, message: Omit<Message, 'conversation_id' | 'created_at'>): Result {
    return this.db.run(
      `INSERT INTO messages (id, conversation_id, msg_id, type, content, position, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [message.id, conversationId, message.msg_id, message.type,
       message.content, message.position || 'left', message.status || 'pending', Date.now()]
    )
  }

  flush(conversationId: string): Message[] {
    const rows = this.findByConversationId(conversationId)
    return rows.filter(m => m.status === 'pending')
  }

  search(query: string, limit = 50): Message[] {
    return this.db.query<Message>(
      `SELECT * FROM messages WHERE content LIKE ? ORDER BY created_at DESC LIMIT ?`,
      [`%${query}%`, limit])
  }

  updateStatus(id: string, status: string): Result {
    return this.db.run('UPDATE messages SET status = ? WHERE id = ?', [status, id])
  }

  updateContent(id: string, content: string): Result {
    return this.db.run('UPDATE messages SET content = ? WHERE id = ?', [content, id])
  }
}