import { ISqliteDriver } from './ISqliteDriver'
import { ConversationRepository } from './ConversationRepository'
import { MessageRepository } from './MessageRepository'
import { AcpSessionRepository } from './AcpSessionRepository'
import { ChannelRepository } from './ChannelRepository'
import { TeamRepository } from './TeamRepository'
import { UserRepository } from './UserRepository'
import { MigrationRunner } from './MigrationRunner'
import { StreamingMessageBuffer } from './StreamingMessageBuffer'

export class OfficeBotDatabase {
  private static instance: OfficeBotDatabase | null = null
  private db: ISqliteDriver
  private initialized = false

  conversations: ConversationRepository
  messages: MessageRepository
  acpSessions: AcpSessionRepository
  channels: ChannelRepository
  teams: TeamRepository
  users: UserRepository
  migrations: MigrationRunner
  streamingBuffer: StreamingMessageBuffer

  private constructor(db: ISqliteDriver) {
    this.db = db
    this.conversations = new ConversationRepository(db)
    this.messages = new MessageRepository(db)
    this.acpSessions = new AcpSessionRepository(db)
    this.channels = new ChannelRepository(db)
    this.teams = new TeamRepository(db)
    this.users = new UserRepository(db)
    this.migrations = new MigrationRunner(db)
    this.streamingBuffer = new StreamingMessageBuffer(this.messages)
  }

  static async getInstance(db: ISqliteDriver): Promise<OfficeBotDatabase> {
    if (!OfficeBotDatabase.instance) {
      OfficeBotDatabase.instance = new OfficeBotDatabase(db)
      await OfficeBotDatabase.instance.initialize()
    }
    return OfficeBotDatabase.instance
  }

  private async initialize(): Promise<void> {
    if (this.initialized) return

    this.db.exec('PRAGMA foreign_keys = ON')
    this.db.exec('PRAGMA busy_timeout = 5000')
    this.db.exec('PRAGMA journal_mode = WAL')

    await this.migrations.run()
    this.initialized = true
  }

  async close(): Promise<void> {
    this.streamingBuffer.shutdown()
    await this.db.close()
    OfficeBotDatabase.instance = null
  }

  async corruptionRecovery(): Promise<void> {
    try {
      this.db.close()
    } catch {
    }
  }
}