process.env['API_TOKEN'] = 'test-token-123';
process.env['NODE_ENV'] = 'test';

import type { Request, Response } from 'express';
import { postTransactions } from '../../src/controllers/transactionController';
import { todayUTC } from '../../src/schemas/transactionSchema';
import type { TransactionResponse, ApiError } from '../../src/types';

function dateToYYYYMMDD(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function tomorrow(): string {
  const t = new Date(todayUTC());
  t.setUTCDate(t.getUTCDate() + 1);
  return dateToYYYYMMDD(t);
}

const today = dateToYYYYMMDD(todayUTC());
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type MockRes = {
  status: jest.Mock;
  json: jest.Mock;
};

function mockRes(): MockRes {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

function mockReq(body: unknown): Partial<Request> {
  return { body };
}

describe('postTransactions controller', () => {
  describe('Validação estrutural do body (controller)', () => {
    test('body sem account retorna 422 com issues', () => {
      const req = mockReq({
        transactions: [{ dtTransaction: today, description: 'Payment', value: 100 }],
      });
      const res = mockRes();
      postTransactions(req as Request, res as unknown as Response<TransactionResponse | ApiError>);
      expect(res.status).toHaveBeenCalledWith(422);
      const body = (res.json.mock.calls[0] as [ApiError])[0];
      expect(body.issues?.some((i) => i.field === 'account')).toBe(true);
    });

    test('transactions ausente retorna 422', () => {
      const req = mockReq({ account: 9999 });
      const res = mockRes();
      postTransactions(req as Request, res as unknown as Response<TransactionResponse | ApiError>);
      expect(res.status).toHaveBeenCalledWith(422);
    });

    test('transactions vazio retorna 422', () => {
      const req = mockReq({ account: 9999, transactions: [] });
      const res = mockRes();
      postTransactions(req as Request, res as unknown as Response<TransactionResponse | ApiError>);
      expect(res.status).toHaveBeenCalledWith(422);
    });
  });

  describe('Validação de negócio delegada ao service', () => {
    test('body totalmente válido retorna 200', () => {
      const req = mockReq({
        account: 9999,
        transactions: [
          { dtTransaction: today, description: 'Payment', value: 150.5 },
          { dtTransaction: today, description: 'Transfer', value: 200.0 },
        ],
      });
      const res = mockRes();
      postTransactions(req as Request, res as unknown as Response<TransactionResponse | ApiError>);
      expect(res.status).toHaveBeenCalledWith(200);
      const body = (res.json.mock.calls[0] as [TransactionResponse])[0];
      expect(body.account).toBe(9999);
      expect(body.processed).toBe(2);
      expect(body.errors).toHaveLength(0);
    });

    test('erro retorna transactionId como UUID v4', () => {
      const req = mockReq({
        account: 9999,
        transactions: [{ dtTransaction: today, description: 'X', value: -1 }],
      });
      const res = mockRes();
      postTransactions(req as Request, res as unknown as Response<TransactionResponse | ApiError>);
      expect(res.status).toHaveBeenCalledWith(422);
      const body = (res.json.mock.calls[0] as [TransactionResponse])[0];
      expect(body.errors[0]?.transactionId).toMatch(UUID_REGEX);
    });

    test('cada transação com erro recebe UUID único', () => {
      const req = mockReq({
        account: 9999,
        transactions: [
          { dtTransaction: today, description: 'X', value: -1 },
          { dtTransaction: today, description: 'Y', value: -2 },
        ],
      });
      const res = mockRes();
      postTransactions(req as Request, res as unknown as Response<TransactionResponse | ApiError>);
      const body = (res.json.mock.calls[0] as [TransactionResponse])[0];
      const ids = body.errors.map((e) => e.transactionId);
      expect(new Set(ids).size).toBe(2);
    });

    test('description com 1 char retorna 422', () => {
      const req = mockReq({
        account: 9999,
        transactions: [{ dtTransaction: today, description: 'X', value: 100 }],
      });
      const res = mockRes();
      postTransactions(req as Request, res as unknown as Response<TransactionResponse | ApiError>);
      expect(res.status).toHaveBeenCalledWith(422);
      const body = (res.json.mock.calls[0] as [TransactionResponse])[0];
      expect(body.errors[0]?.issues.some((i) => i.field === 'description')).toBe(true);
    });

    test('data futura retorna 422 com erro indexado', () => {
      const req = mockReq({
        account: 9999,
        transactions: [{ dtTransaction: tomorrow(), description: 'Payment', value: 100 }],
      });
      const res = mockRes();
      postTransactions(req as Request, res as unknown as Response<TransactionResponse | ApiError>);
      expect(res.status).toHaveBeenCalledWith(422);
      const body = (res.json.mock.calls[0] as [TransactionResponse])[0];
      expect(body.errors[0]?.issues.some((i) => i.message.includes('futura'))).toBe(true);
    });

    test('value negativo retorna 422 com field=value', () => {
      const req = mockReq({
        account: 9999,
        transactions: [{ dtTransaction: today, description: 'Transfer', value: -50 }],
      });
      const res = mockRes();
      postTransactions(req as Request, res as unknown as Response<TransactionResponse | ApiError>);
      expect(res.status).toHaveBeenCalledWith(422);
      const body = (res.json.mock.calls[0] as [TransactionResponse])[0];
      expect(body.errors[0]?.issues.some((i) => i.field === 'value')).toBe(true);
    });

    test('mix válido/inválido → processed correto e erros indexados', () => {
      const req = mockReq({
        account: 9999,
        transactions: [
          { dtTransaction: today, description: 'Payment', value: 100 },
          { dtTransaction: tomorrow(), description: 'X', value: -1 },
          { dtTransaction: today, description: 'Transfer', value: 200 },
        ],
      });
      const res = mockRes();
      postTransactions(req as Request, res as unknown as Response<TransactionResponse | ApiError>);
      expect(res.status).toHaveBeenCalledWith(422);
      const body = (res.json.mock.calls[0] as [TransactionResponse])[0];
      expect(body.processed).toBe(2);
      expect(body.errors).toHaveLength(1);
      expect(body.errors[0]?.index).toBe(1);
    });
  });
});
