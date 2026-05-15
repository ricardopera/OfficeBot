import { ISqliteDriver } from '../ISqliteDriver'

export interface MigrationContext {
  db: ISqliteDriver
  getVersion(): number
  setVersion(version: number): void
}

export interface Migration {
  version: number
  description: string
  up(ctx: MigrationContext): Promise<void>
  down?(ctx: MigrationContext): Promise<void>
}

export async function runMigration(ctx: MigrationContext, migration: Migration): Promise<void> {
  const currentVersion = ctx.getVersion()
  if (currentVersion >= migration.version) {
    return
  }

  ctx.db.transaction(() => {
    ctx.db.exec('BEGIN TRANSACTION')
  })

  try {
    await migration.up(ctx)
    ctx.db.transaction(() => {
      ctx.db.exec('COMMIT')
    })
  } catch (error) {
    ctx.db.transaction(() => {
      ctx.db.exec('ROLLBACK')
    })
    throw error
  }
}

export async function validateMigration(ctx: MigrationContext): Promise<void> {
  const integrity = ctx.db.query<{ integrity_check: string }>('PRAGMA integrity_check', [])
  if (integrity[0]?.integrity_check !== 'ok') {
    throw new Error('Database integrity check failed')
  }

  const fkCheck = ctx.db.query<{ foreign_key_check: string }>('PRAGMA foreign_key_check', [])
  if (fkCheck.length > 0 && fkCheck[0]?.foreign_key_check) {
    const fkResult = fkCheck[0].foreign_key_check
    if (!fkResult.includes('0 rows') && !fkResult.includes('ok')) {
      throw new Error(`Foreign key violations detected: ${fkResult}`)
    }
  }
}

export async function backupBeforeMigration(db: ISqliteDriver, dbPath: string): Promise<void> {
  // Backup logic handled at OfficeBotDatabase level via corruptionRecovery
}