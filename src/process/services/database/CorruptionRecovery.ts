import * as fs from 'fs'
import * as path from 'path'
import { ISqliteDriver } from './ISqliteDriver'

export class CorruptionRecovery {
  private dbPath: string
  private sidecars: string[] = ['-wal', '-shm', '-journal']

  constructor(dbPath: string) {
    this.dbPath = dbPath
  }

  async recover(driver: ISqliteDriver, initSchema: () => Promise<void>): Promise<void> {
    const backupPath = this.dbPath + `.corrupted.${Date.now()}`

    try {
      driver.close()
    } catch {
    }

    try {
      if (fs.existsSync(this.dbPath)) {
        fs.renameSync(this.dbPath, backupPath)
      }

      for (const sidecar of this.sidecars) {
        const sidecarPath = this.dbPath + sidecar
        if (fs.existsSync(sidecarPath)) {
          fs.unlinkSync(sidecarPath)
        }
      }
    } catch (e) {
      console.error('[CorruptionRecovery] Failed to backup corrupted database:', e)
    }

    try {
      await driver.open(this.dbPath)
      await initSchema()
    } catch (e) {
      console.error('[CorruptionRecovery] Failed to recreate database:', e)
      if (fs.existsSync(backupPath)) {
        try {
          fs.renameSync(backupPath, this.dbPath)
        } catch {
        }
      }
      throw e
    }
  }
}