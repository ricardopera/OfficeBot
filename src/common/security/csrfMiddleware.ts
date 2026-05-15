import { Request, Response, NextFunction } from 'express';
import { CsrfClient, CSRF_HEADER_NAME, CSRF_COOKIE_NAME } from './csrfClient';

export interface CsrfMiddlewareOptions {
  cookieName?: string;
  headerName?: string;
  excludedPaths?: string[];
}

const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

export function createCsrfMiddleware(
  csrfClient: CsrfClient,
  options: CsrfMiddlewareOptions = {}
): (req: Request, res: Response, next: NextFunction) => void {
  const cookieName = options.cookieName || CSRF_COOKIE_NAME;
  const headerName = options.headerName || CSRF_HEADER_NAME;
  const excludedPaths = options.excludedPaths || [];

  return (req: Request, res: Response, next: NextFunction): void => {
    if (SAFE_METHODS.includes(req.method)) {
      return next();
    }

    if (excludedPaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    const tokenFromHeader = req.headers[headerName.toLowerCase()] as string | undefined;
    const tokenFromCookie = req.cookies?.[cookieName];
    const token = tokenFromHeader || tokenFromCookie;

    if (!token || !csrfClient.validateToken(token)) {
      res.status(403).json({
        error: 'CSRF validation failed',
        message: 'Invalid or missing CSRF token'
      });
      return;
    }

    next();
  };
}

export function extractCsrfToken(
  req: Request,
  csrfClient: CsrfClient
): string | undefined {
  const headerName = csrfClient.getHeaderName().toLowerCase();
  const cookieName = csrfClient.getCookieName();
  return (req.headers[headerName] as string) || req.cookies?.[cookieName];
}