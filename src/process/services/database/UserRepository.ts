import { ISqliteDriver, Result } from './ISqliteDriver'

export interface User {
  id: string
  username: string
  email: string | null
  password_hash: string | null
  jwt_secret: string | null
  avatar_path: string | null
  created_at: number
  updated_at: number
  last_login: number | null
}

export class UserRepository {
  constructor(private db: ISqliteDriver) {}

  create(user: Omit<User, 'created_at' | 'updated_at' | 'last_login'>): Result {
    const now = Date.now()
    return this.db.run(
      `INSERT INTO users (id, username, email, password_hash, jwt_secret, avatar_path, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [user.id, user.username, user.email, user.password_hash, user.jwt_secret, user.avatar_path, now, now])
  }

  findById(id: string): User | undefined {
    const rows = this.db.query<User>('SELECT * FROM users WHERE id = ?', [id])
    return rows[0]
  }

  findByUsername(username: string): User | undefined {
    const rows = this.db.query<User>('SELECT * FROM users WHERE username = ?', [username])
    return rows[0]
  }

  findByEmail(email: string): User | undefined {
    const rows = this.db.query<User>('SELECT * FROM users WHERE email = ?', [email])
    return rows[0]
  }

  update(id: string, data: Partial<User>): Result {
    const fields: string[] = []
    const values: any[] = []
    if (data.email !== undefined) { fields.push('email = ?'); values.push(data.email) }
    if (data.password_hash !== undefined) { fields.push('password_hash = ?'); values.push(data.password_hash) }
    if (data.jwt_secret !== undefined) { fields.push('jwt_secret = ?'); values.push(data.jwt_secret) }
    if (data.avatar_path !== undefined) { fields.push('avatar_path = ?'); values.push(data.avatar_path) }
    fields.push('updated_at = ?')
    values.push(Date.now())
    values.push(id)
    return this.db.run(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values)
  }

  login(id: string): Result {
    return this.db.run(
      'UPDATE users SET last_login = ?, updated_at = ? WHERE id = ?',
      [Date.now(), Date.now(), id])
  }

  delete(id: string): Result {
    return this.db.run('DELETE FROM users WHERE id = ?', [id])
  }
}