import { ISqliteDriver, Result } from './ISqliteDriver'

export interface ChannelPlugin {
  id: string
  user_id: string
  type: string
  name: string
  credentials: string
  settings: string
  created_at: number
  updated_at: number
}

export interface ChannelUser {
  id: string
  plugin_id: string
  platform: string
  platform_user_id: string
  name: string
  avatar: string | null
  created_at: number
}

export interface ChannelSession {
  id: string
  user_id: string
  plugin_id: string
  platform: string
  platform_chat_id: string
  status: string
  created_at: number
  updated_at: number
}

export interface PairingCode {
  code: string
  user_id: string
  device_name: string
  expires_at: number
  created_at: number
}

export class ChannelRepository {
  constructor(private db: ISqliteDriver) {}

  createPlugin(plugin: Omit<ChannelPlugin, 'created_at' | 'updated_at'>): Result {
    const now = Date.now()
    return this.db.run(
      `INSERT INTO assistant_plugins (id, user_id, type, name, credentials, settings, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [plugin.id, plugin.user_id, plugin.type, plugin.name, plugin.credentials, plugin.settings, now, now])
  }

  findPluginById(id: string): ChannelPlugin | undefined {
    const rows = this.db.query<ChannelPlugin>('SELECT * FROM assistant_plugins WHERE id = ?', [id])
    return rows[0]
  }

  findPluginsByUserId(userId: string): ChannelPlugin[] {
    return this.db.query<ChannelPlugin>('SELECT * FROM assistant_plugins WHERE user_id = ?', [userId])
  }

  updatePlugin(id: string, data: Partial<ChannelPlugin>): Result {
    const fields = ['updated_at = ?']
    const values: any[] = [Date.now()]
    if (data.credentials !== undefined) { fields.push('credentials = ?'); values.push(data.credentials) }
    if (data.settings !== undefined) { fields.push('settings = ?'); values.push(data.settings) }
    values.push(id)
    return this.db.run(`UPDATE assistant_plugins SET ${fields.join(', ')} WHERE id = ?`, values)
  }

  deletePlugin(id: string): Result {
    return this.db.run('DELETE FROM assistant_plugins WHERE id = ?', [id])
  }

  createUser(user: Omit<ChannelUser, 'created_at'>): Result {
    return this.db.run(
      `INSERT INTO assistant_users (id, plugin_id, platform, platform_user_id, name, avatar, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [user.id, user.plugin_id, user.platform, user.platform_user_id, user.name, user.avatar, Date.now()])
  }

  findUserByPlatformUserId(pluginId: string, platformUserId: string): ChannelUser | undefined {
    const rows = this.db.query<ChannelUser>(
      'SELECT * FROM assistant_users WHERE plugin_id = ? AND platform_user_id = ?',
      [pluginId, platformUserId])
    return rows[0]
  }

  findUsersByPluginId(pluginId: string): ChannelUser[] {
    return this.db.query<ChannelUser>('SELECT * FROM assistant_users WHERE plugin_id = ?', [pluginId])
  }

  createSession(session: Omit<ChannelSession, 'created_at' | 'updated_at'>): Result {
    const now = Date.now()
    return this.db.run(
      `INSERT INTO assistant_sessions (id, user_id, plugin_id, platform, platform_chat_id, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [session.id, session.user_id, session.plugin_id, session.platform, session.platform_chat_id, session.status, now, now])
  }

  findSessionByUserAndChat(userId: string, pluginId: string, platformChatId: string): ChannelSession | undefined {
    const rows = this.db.query<ChannelSession>(
      'SELECT * FROM assistant_sessions WHERE user_id = ? AND plugin_id = ? AND platform_chat_id = ?',
      [userId, pluginId, platformChatId])
    return rows[0]
  }

  updateSessionStatus(id: string, status: string): Result {
    return this.db.run(
      'UPDATE assistant_sessions SET status = ?, updated_at = ? WHERE id = ?',
      [status, Date.now(), id])
  }

  createPairingCode(code: Omit<PairingCode, 'created_at'>): Result {
    return this.db.run(
      `INSERT INTO assistant_pairing_codes (code, user_id, device_name, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [code.code, code.user_id, code.device_name, code.expires_at, Date.now()])
  }

  findPairingCode(code: string): PairingCode | undefined {
    const rows = this.db.query<PairingCode>(
      'SELECT * FROM assistant_pairing_codes WHERE code = ? AND expires_at > ?',
      [code, Date.now()])
    return rows[0]
  }

  deletePairingCode(code: string): Result {
    return this.db.run('DELETE FROM assistant_pairing_codes WHERE code = ?', [code])
  }

  cleanExpiredPairingCodes(): Result {
    return this.db.run('DELETE FROM assistant_pairing_codes WHERE expires_at <= ?', [Date.now()])
  }
}