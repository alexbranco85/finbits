import type { Request, Response, NextFunction } from 'express';
import config from '../config/env';

/**
 * Handler global de erros do Express (4 argumentos obrigatórios para ser reconhecido).
 * Nunca vaza stack traces em produção.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const isDev = config.NODE_ENV !== 'production';

  console.error('[ERROR]', err.message);

  res.status(500).json({
    error: 'Internal Server Error',
    ...(isDev && { detail: err.message }),
  });
}
