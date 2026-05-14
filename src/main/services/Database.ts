import Database from 'better-sqlite3';
import { app } from 'electron';
import { join } from 'path';
import { mkdirSync } from 'fs';
import type { Conversation, Message, AppSettings, LLMProvider } from '@shared/types';

export class DatabaseService {
  private db!: Database.Database;

  initialize(): void {
    const userDataPath = app.getPath('userData');
    mkdirSync(userDataPath, { recursive: true });
    const dbPath = join(userDataPath, 'data.db');

    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.migrate();
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL DEFAULT 'Nova conversa',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        workspace_path TEXT,
        model_name TEXT,
        is_favorite INTEGER DEFAULT 0,
        is_archived INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
        content TEXT,
        tool_calls TEXT,
        tool_results TEXT,
        tokens_used INTEGER,
        created_at INTEGER NOT NULL,
        sequence INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS providers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        base_url TEXT NOT NULL,
        api_key_encrypted TEXT NOT NULL,
        default_model TEXT,
        models TEXT,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        content TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);
  }

  // ─── Conversations ────────────────────────────────────────────────────────

  listConversations(): Conversation[] {
    const rows = this.db
      .prepare('SELECT * FROM conversations WHERE is_archived = 0 ORDER BY updated_at DESC')
      .all() as Record<string, unknown>[];
    return rows.map(this.mapConversation);
  }

  getConversation(id: string): Conversation | undefined {
    const row = this.db.prepare('SELECT * FROM conversations WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    return row ? this.mapConversation(row) : undefined;
  }

  createConversation(conv: Conversation): void {
    this.db.prepare(`
      INSERT INTO conversations (id, title, created_at, updated_at, workspace_path, model_name, is_favorite, is_archived)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(conv.id, conv.title, conv.createdAt, conv.updatedAt, conv.workspacePath ?? null, conv.modelName ?? null, conv.isFavorite ? 1 : 0, conv.isArchived ? 1 : 0);
  }

  updateConversation(id: string, updates: Partial<Conversation>): void {
    const sets: string[] = [];
    const values: unknown[] = [];

    if (updates.title !== undefined) { sets.push('title = ?'); values.push(updates.title); }
    if (updates.updatedAt !== undefined) { sets.push('updated_at = ?'); values.push(updates.updatedAt); }
    if (updates.isFavorite !== undefined) { sets.push('is_favorite = ?'); values.push(updates.isFavorite ? 1 : 0); }
    if (updates.isArchived !== undefined) { sets.push('is_archived = ?'); values.push(updates.isArchived ? 1 : 0); }

    if (sets.length === 0) return;
    values.push(id);
    this.db.prepare(`UPDATE conversations SET ${sets.join(', ')} WHERE id = ?`).run(...values);
  }

  deleteConversation(id: string): void {
    this.db.prepare('DELETE FROM conversations WHERE id = ?').run(id);
  }

  // ─── Messages ─────────────────────────────────────────────────────────────

  getMessages(conversationId: string): Message[] {
    const rows = this.db
      .prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY sequence ASC')
      .all(conversationId) as Record<string, unknown>[];
    return rows.map(this.mapMessage);
  }

  saveMessage(msg: Message): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO messages (id, conversation_id, role, content, tool_calls, tool_results, tokens_used, created_at, sequence)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      msg.id,
      msg.conversationId,
      msg.role,
      msg.content ?? null,
      msg.toolCalls ? JSON.stringify(msg.toolCalls) : null,
      null,
      msg.tokensUsed ?? null,
      msg.createdAt,
      msg.sequence
    );
  }

  // ─── Settings ─────────────────────────────────────────────────────────────

  getSetting<T>(key: string): T | undefined {
    const row = this.db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
    if (!row) return undefined;
    try { return JSON.parse(row.value) as T; } catch { return undefined; }
  }

  setSetting(key: string, value: unknown): void {
    this.db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, JSON.stringify(value));
  }

  // ─── Providers ────────────────────────────────────────────────────────────

  listProviders(): LLMProvider[] {
    const rows = this.db.prepare('SELECT * FROM providers ORDER BY created_at ASC').all() as Record<string, unknown>[];
    return rows.map(this.mapProvider);
  }

  getProvider(id: string): LLMProvider | undefined {
    const row = this.db.prepare('SELECT * FROM providers WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    return row ? this.mapProvider(row) : undefined;
  }

  saveProvider(p: LLMProvider): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO providers (id, name, base_url, api_key_encrypted, default_model, models, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(p.id, p.name, p.baseURL, p.apiKey, p.defaultModel ?? null, p.models ? JSON.stringify(p.models) : null, Date.now());
  }

  deleteProvider(id: string): void {
    this.db.prepare('DELETE FROM providers WHERE id = ?').run(id);
  }

  // ─── Mappers ──────────────────────────────────────────────────────────────

  private mapConversation(row: Record<string, unknown>): Conversation {
    return {
      id: row.id as string,
      title: row.title as string,
      createdAt: row.created_at as number,
      updatedAt: row.updated_at as number,
      workspacePath: row.workspace_path as string | undefined,
      modelName: row.model_name as string | undefined,
      isFavorite: Boolean(row.is_favorite),
      isArchived: Boolean(row.is_archived),
    };
  }

  private mapMessage(row: Record<string, unknown>): Message {
    return {
      id: row.id as string,
      conversationId: row.conversation_id as string,
      role: row.role as Message['role'],
      content: (row.content as string) ?? '',
      toolCalls: row.tool_calls ? JSON.parse(row.tool_calls as string) : undefined,
      tokensUsed: row.tokens_used as number | undefined,
      createdAt: row.created_at as number,
      sequence: row.sequence as number,
    };
  }

  private mapProvider(row: Record<string, unknown>): LLMProvider {
    return {
      id: row.id as string,
      name: row.name as string,
      baseURL: row.base_url as string,
      apiKey: row.api_key_encrypted as string,
      defaultModel: (row.default_model as string) ?? '',
      models: row.models ? JSON.parse(row.models as string) : [],
      supportsFunctionCalling: true,
      supportsStreaming: true,
    };
  }
}
