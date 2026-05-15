export interface PairingCode {
  code: string;
  expiresAt: Date;
  platform: string;
  chatId: string;
  userId?: string;
}

export class PairingService {
  private codes: Map<string, PairingCode> = new Map();
  private readonly CODE_LENGTH = 6;
  private readonly TTL_MS = 10 * 60 * 1000;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly CLEANUP_INTERVAL_MS = 60 * 1000;

  constructor() {
    this.startCleanup();
  }

  generate(platform: string, chatId: string, userId?: string): string {
    const code = this.generateCode();
    const pairing: PairingCode = {
      code,
      expiresAt: new Date(Date.now() + this.TTL_MS),
      platform,
      chatId,
      userId,
    };
    this.codes.set(code, pairing);
    return code;
  }

  validate(code: string): PairingCode | null {
    const pairing = this.codes.get(code);
    if (!pairing) return null;
    if (new Date() > pairing.expiresAt) {
      this.codes.delete(code);
      return null;
    }
    return pairing;
  }

  consume(code: string): PairingCode | null {
    const pairing = this.validate(code);
    if (pairing) {
      this.codes.delete(code);
    }
    return pairing;
  }

  private generateCode(): string {
    let code = '';
    for (let i = 0; i < this.CODE_LENGTH; i++) {
      code += Math.floor(Math.random() * 10).toString();
    }
    return code;
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [code, pairing] of this.codes.entries()) {
        if (now > pairing.expiresAt.getTime()) {
          this.codes.delete(code);
        }
      }
    }, this.CLEANUP_INTERVAL_MS);
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.codes.clear();
  }
}