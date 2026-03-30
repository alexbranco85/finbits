import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import config from '../config/env';

/**
 * Middleware de autenticação via Bearer token.
 * Usa `crypto.timingSafeEqual` para prevenir timing attacks.
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const token = authHeader.slice(7); // Remove "Bearer "

  try {
    const expected = Buffer.from(config.API_TOKEN, 'utf8');
    const received = Buffer.from(token, 'utf8');

    if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  next();
}
