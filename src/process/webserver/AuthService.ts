import { randomBytes, createHash, timingSafeEqual } from 'crypto';
import { sign, verify, JwtPayload } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET_BYTES = 32;
const TOKEN_BLACKLIST_CLEANUP_INTERVAL = 60 * 60 * 1000;
const DUMMY_HASH = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4bbfH.cIuQiG.S5K';

export interface TokenPayload extends JwtPayload {
  userId: string;
  username: string;
  type: 'access' | 'refresh';
  issuedAt: number;
}

export interface AuthResult {
  success: boolean;
  token?: string;
  error?: string;
}

export class TokenBlacklist {
  private blacklist = new Map<string, number>();
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanup();
  }

  add(token: string): void {
    const hash = this.hashToken(token);
    this.blacklist.set(hash, Date.now());
  }

  isBlacklisted(token: string): boolean {
    const hash = this.hashToken(token);
    return this.blacklist.has(hash);
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000;
      for (const [hash, timestamp] of this.blacklist.entries()) {
        if (now - timestamp > maxAge) {
          this.blacklist.delete(hash);
        }
      }
    }, TOKEN_BLACKLIST_CLEANUP_INTERVAL);
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.blacklist.clear();
  }
}

export class AuthService {
  private tokenBlacklist: TokenBlacklist;
  private jwtSecrets = new Map<string, string>();
  private minPasswordLength = 8;

  constructor() {
    this.tokenBlacklist = new TokenBlacklist();
  }

  generateJwtSecret(): string {
    return randomBytes(JWT_SECRET_BYTES).toString('hex');
  }

  createAccessToken(userId: string, username: string, jwtSecret?: string): string {
    const secret = jwtSecret || this.getJwtSecret(userId);
    const payload: TokenPayload = {
      userId,
      username,
      type: 'access',
      issuedAt: Date.now()
    };
    return sign(payload, secret, { expiresIn: '24h' });
  }

  createRefreshToken(userId: string, jwtSecret?: string): string {
    const secret = jwtSecret || this.getJwtSecret(userId);
    const payload: TokenPayload = {
      userId,
      username: '',
      type: 'refresh',
      issuedAt: Date.now()
    };
    return sign(payload, secret, { expiresIn: '7d' });
  }

  getJwtSecret(userId: string): string {
    let secret = this.jwtSecrets.get(userId);
    if (!secret) {
      secret = this.generateJwtSecret();
      this.jwtSecrets.set(userId, secret);
    }
    return secret;
  }

  setJwtSecret(userId: string, secret: string): void {
    this.jwtSecrets.set(userId, secret);
  }

  rotateJwtSecret(userId: string): string {
    const newSecret = this.generateJwtSecret();
    this.jwtSecrets.set(userId, newSecret);
    return newSecret;
  }

  validateToken(token: string, userId?: string): TokenPayload | null {
    if (this.tokenBlacklist.isBlacklisted(token)) {
      return null;
    }

    try {
      const secret = userId ? this.getJwtSecret(userId) : '';
      const payload = verify(token, secret || 'default-secret') as TokenPayload;
      return payload;
    } catch {
      return null;
    }
  }

  blacklistToken(token: string): void {
    this.tokenBlacklist.add(token);
  }

  async validatePassword(password: string, hash: string): Promise<boolean> {
    const valid = await bcrypt.compare(password, hash);
    return valid;
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  constantTimeCompare(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) {
      return false;
    }
    try {
      return timingSafeEqual(bufA, bufB);
    } catch {
      return false;
    }
  }

  dummyBcryptCompare(password: string): Promise<boolean> {
    return bcrypt.compare(password, DUMMY_HASH);
  }

  async validatePasswordWithTimingGuard(password: string, hash: string): Promise<boolean> {
    const start = Date.now();
    let result = false;
    try {
      result = await this.validatePassword(password, hash);
    } catch {
      result = false;
    }
    const elapsed = Date.now() - start;
    const minDelay = 50;
    if (elapsed < minDelay) {
      await new Promise(resolve => setTimeout(resolve, minDelay - elapsed));
    }
    if (!result) {
      await this.dummyBcryptCompare(password);
    }
    return result;
  }

  rotateTokenOnPasswordChange(userId: string, newPassword: string): AuthResult {
    const newSecret = this.rotateJwtSecret(userId);
    return {
      success: true,
      token: this.createAccessToken(userId, '', newSecret)
    };
  }

  generateRandomPassword(length?: number): string {
    const len = length || Math.floor(Math.random() * 6) + 12;
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*';
    const allChars = lowercase + uppercase + numbers + symbols;
    let password = '';
    const categories = [lowercase, uppercase, numbers, symbols];
    for (let i = 0; i < 4; i++) {
      password += categories[i][Math.floor(Math.random() * categories[i].length)];
    }
    for (let i = 4; i < len; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  validatePasswordStrength(password: string): { valid: boolean; error?: string } {
    if (password.length < this.minPasswordLength) {
      return { valid: false, error: `Password must be at least ${this.minPasswordLength} characters` };
    }
    const commonPasswords = ['password', '12345678', 'admin', 'letmein', 'welcome'];
    if (commonPasswords.includes(password.toLowerCase())) {
      return { valid: false, error: 'Password is too common' };
    }
    return { valid: true };
  }

  destroy(): void {
    this.tokenBlacklist.destroy();
    this.jwtSecrets.clear();
  }
}

export const authService = new AuthService();