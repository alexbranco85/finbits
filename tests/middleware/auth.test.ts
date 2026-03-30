import type { Request, Response, NextFunction } from 'express';

// Deve ser definido ANTES de importar o middleware
process.env['API_TOKEN'] = 'test-token-123';
process.env['NODE_ENV'] = 'test';

import { authMiddleware } from '../../src/middleware/auth';

type MockResponse = {
  status: jest.Mock;
  json: jest.Mock;
};

function mockReqRes(authHeader?: string): {
  req: Partial<Request>;
  res: MockResponse;
  next: jest.Mock;
} {
  const req: Partial<Request> = { headers: {} };
  if (authHeader !== undefined) {
    req.headers = { authorization: authHeader };
  }
  const res: MockResponse = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  const next = jest.fn();
  return { req, res, next };
}

describe('authMiddleware', () => {
  test('token válido chama next()', () => {
    const { req, res, next } = mockReqRes('Bearer test-token-123');
    authMiddleware(req as Request, res as unknown as Response, next as unknown as NextFunction);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('sem header Authorization retorna 401', () => {
    const { req, res, next } = mockReqRes(undefined);
    authMiddleware(req as Request, res as unknown as Response, next as unknown as NextFunction);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    expect(next).not.toHaveBeenCalled();
  });

  test('token inválido retorna 401', () => {
    const { req, res, next } = mockReqRes('Bearer token-errado');
    authMiddleware(req as Request, res as unknown as Response, next as unknown as NextFunction);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    expect(next).not.toHaveBeenCalled();
  });

  test('header sem prefixo Bearer retorna 401', () => {
    const { req, res, next } = mockReqRes('test-token-123');
    authMiddleware(req as Request, res as unknown as Response, next as unknown as NextFunction);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    expect(next).not.toHaveBeenCalled();
  });

  test('header com "Bearer " mas token vazio retorna 401', () => {
    const { req, res, next } = mockReqRes('Bearer ');
    authMiddleware(req as Request, res as unknown as Response, next as unknown as NextFunction);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    expect(next).not.toHaveBeenCalled();
  });
});
