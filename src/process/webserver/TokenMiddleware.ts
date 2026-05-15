import { Request, Response, NextFunction } from 'express';
import { authService, TokenPayload } from './AuthService';

export interface TokenExtractionResult {
  valid: boolean;
  payload?: TokenPayload;
  token?: string;
  source?: 'header' | 'cookie' | 'protocol' | 'query';
  error?: string;
}

export class TokenMiddleware {
  extractFromHeader(req: Request): TokenExtractionResult {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { valid: false, error: 'No Bearer token in header' };
    }
    const token = authHeader.slice(7);
    const payload = authService.validateToken(token);
    if (!payload) {
      return { valid: false, token, error: 'Invalid token' };
    }
    return { valid: true, payload, token, source: 'header' };
  }

  extractFromCookie(req: Request, cookieName = 'officebot-session'): TokenExtractionResult {
    const cookie = req.cookies?.[cookieName];
    if (!cookie) {
      return { valid: false, error: 'No token in cookie' };
    }
    const payload = authService.validateToken(cookie);
    if (!payload) {
      return { valid: false, token: cookie, error: 'Invalid token' };
    }
    return { valid: true, payload, token: cookie, source: 'cookie' };
  }

  extractFromQuery(req: Request): TokenExtractionResult {
    const token = req.query?.token as string | undefined;
    if (!token) {
      return { valid: false, error: 'No token in query' };
    }
    return { valid: false, error: 'Query parameter token is not allowed', token };
  }

  extractFromProtocol(req: Request): TokenExtractionResult {
    const protocol = req.headers['sec-websocket-protocol'];
    if (!protocol) {
      return { valid: false, error: 'No websocket protocol' };
    }
    const token = Array.isArray(protocol) ? protocol[0] : protocol.split(',')[0];
    const payload = authService.validateToken(token);
    if (!payload) {
      return { valid: false, token, error: 'Invalid token' };
    }
    return { valid: true, payload, token, source: 'protocol' };
  }

  extract(req: Request): TokenExtractionResult {
    const headerResult = this.extractFromHeader(req);
    if (headerResult.valid) {
      return headerResult;
    }
    const cookieResult = this.extractFromCookie(req);
    if (cookieResult.valid) {
      return cookieResult;
    }
    return headerResult;
  }

  extractForWebSocket(req: Request): TokenExtractionResult {
    const protocolResult = this.extractFromProtocol(req);
    if (protocolResult.valid) {
      return protocolResult;
    }
    const cookieResult = this.extractFromCookie(req);
    if (cookieResult.valid) {
      return cookieResult;
    }
    const headerResult = this.extractFromHeader(req);
    if (headerResult.valid) {
      return headerResult;
    }
    return {
      valid: false,
      error: 'No token provided'
    };
  }

  authMiddleware(req: Request, res: Response, next: NextFunction): void {
    const result = this.extract(req);
    if (!result.valid) {
      res.status(401).json({ error: result.error || 'Unauthorized' });
      return;
    }
    (req as Request & { user?: TokenPayload }).user = result.payload;
    next();
  }

  optionalAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
    const result = this.extract(req);
    if (result.valid) {
      (req as Request & { user?: TokenPayload }).user = result.payload;
    }
    next();
  }
}

export const tokenMiddleware = new TokenMiddleware();
export default tokenMiddleware;