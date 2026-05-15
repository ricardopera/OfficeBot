export interface Result {
  changes: number
  lastInsertRowid: number
}

export interface ISqliteDriver {
  open(path: string): Promise<void>
  close(): Promise<void>
  exec(sql: string, params?: any): Promise<void>
  query<T>(sql: string, params?: any): T[]
  run(sql: string, params?: any): Result
  transaction(fn: () => void): void
}