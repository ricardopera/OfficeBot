import { ISqliteDriver } from './ISqliteDriver'
import { v27 } from './migrations/v27'

const MIGRATIONS = [
  v27,
]

export class MigrationRunner {
  constructor(private db: ISqliteDriver) {}

  getVersion(): number {
    const rows = this.db.query<{ user_version: number }>('PRAGMA user_version', [])
    return rows[0]?.user_version ?? 0
  }

  setVersion(version: number): void {
    this.db.run('PRAGMA user_version = ?', [version])
  }

  async run(): Promise<void> {
    let version = this.getVersion()

    for (const migration of MIGRATIONS) {
      if (migration.version > version) {
        await this.runMigration(migration)
        version = migration.version
      }
    }

    this.setVersion(version)
  }

  private async runMigration(migration: { version: number; up: (ctx: any) => Promise<void> }): Promise<void> {
    const ctx = {
      db: this.db,
      getVersion: () => this.getVersion(),
      setVersion: (v: number) => this.setVersion(v),
    }

    this.db.transaction(() => {
      this.db.exec('BEGIN TRANSACTION')
    })

    try {
      await migration.up(ctx)
      this.db.exec('COMMIT')
    } catch (error) {
      this.db.transaction(() => {
        this.db.exec('ROLLBACK')
      })
      throw error
    }
  }
}