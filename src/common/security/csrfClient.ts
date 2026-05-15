import { randomBytes } from 'crypto';

export const CSRF_COOKIE_NAME = 'officebot-session';
export const CSRF_HEADER_NAME = 'X-CSRF-Token';
const TOKEN_LENGTH = 32;

export interface ICsrfTokenGenerator {
  generateToken(): string;
}

export interface ICsrfTokenValidator {
  validateToken(token: string): boolean;
}

export class CsrfTokenGenerator implements ICsrfTokenGenerator {
  generateToken(): string {
    return randomBytes(TOKEN_LENGTH).toString('hex');
  }
}

export class CsrfTokenValidator implements ICsrfTokenValidator {
  private validTokens = new Map<string, number>();

  validateToken(token: string): boolean {
    if (!token || token.length !== TOKEN_LENGTH * 2) {
      return false;
    }
    const timestamp = this.validTokens.get(token);
    if (timestamp === undefined) {
      return false;
    }
    const age = Date.now() - timestamp;
    const maxAge = 24 * 60 * 60 * 1000;
    if (age > maxAge) {
      this.validTokens.delete(token);
      return false;
    }
    return true;
  }

  storeToken(token: string): void {
    this.validTokens.set(token, Date.now());
  }

  removeToken(token: string): void {
    this.validTokens.delete(token);
  }
}

export class CsrfClient {
  private generator: ICsrfTokenGenerator;
  private validator: ICsrfTokenValidator;

  constructor(
    generator: ICsrfTokenGenerator = new CsrfTokenGenerator(),
    validator: ICsrfTokenValidator = new CsrfTokenValidator()
  ) {
    this.generator = generator;
    this.validator = validator;
  }

  createToken(): string {
    const token = this.generator.generateToken();
    if (this.validator instanceof CsrfTokenValidator) {
      this.validator.storeToken(token);
    }
    return token;
  }

  validateToken(token: string): boolean {
    return this.validator.validateToken(token);
  }

  getCookieName(): string {
    return CSRF_COOKIE_NAME;
  }

  getHeaderName(): string {
    return CSRF_HEADER_NAME;
  }
}