import { ISqliteDriver } from './ISqliteDriver'

export class WalManager {
  async enable(driver: ISqliteDriver): Promise<void> {
    try {
      await driver.exec('PRAGMA journal_mode = WAL')
    } catch {
      try {
        await driver.exec('PRAGMA journal_mode = DELETE')
      } catch {
      }
    }
  }

  async checkpoint(driver: ISqliteDriver): Promise<void> {
    try {
      await driver.exec('PRAGMA wal_checkpoint(TRUNCATE)')
    } catch {
    }
  }

  async isWalMode(driver: ISqliteDriver): Promise<boolean> {
    const result = driver.query<{ journal_mode: string }>(
      'PRAGMA journal_mode',
      []
    )
    return result[0]?.journal_mode?.toUpperCase() === 'WAL'
  }
}