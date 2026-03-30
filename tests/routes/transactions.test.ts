process.env['API_TOKEN'] = 'test-token-123';
process.env['NODE_ENV'] = 'test';

import request from 'supertest';
import app from '../../src/app';
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
const AUTH = { Authorization: 'Bearer test-token-123' };
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const validBody = {
  account: 9999,
  transactions: [
    { dtTransaction: today, description: 'Payment', value: 150.5 },
    { dtTransaction: today, description: 'Transfer', value: 200.0 },
  ],
};

describe('POST /transactions', () => {
  describe('Autenticação', () => {
    test('sem header Authorization retorna 401', async () => {
      const res = await request(app).post('/transactions').send(validBody);
      expect(res.status).toBe(401);
      expect(res.body as ApiError).toEqual({ error: 'Unauthorized' });
    });

    test('token inválido retorna 401', async () => {
      const res = await request(app)
        .post('/transactions')
        .set('Authorization', 'Bearer token-errado')
        .send(validBody);
      expect(res.status).toBe(401);
    });
  });

  describe('Validação do body (controller)', () => {
    test('body sem account retorna 422 com issues', async () => {
      const { account: _, ...body } = validBody;
      const res = await request(app).post('/transactions').set(AUTH).send(body);
      expect(res.status).toBe(422);
      const b = res.body as ApiError;
      expect(b.issues?.some((i) => i.field === 'account')).toBe(true);
    });

    test('body sem transactions retorna 422', async () => {
      const res = await request(app).post('/transactions').set(AUTH).send({ account: 9999 });
      expect(res.status).toBe(422);
    });

    test('transactions vazio retorna 422', async () => {
      const res = await request(app)
        .post('/transactions')
        .set(AUTH)
        .send({ account: 9999, transactions: [] });
      expect(res.status).toBe(422);
    });
  });

  describe('Validação de negócio (service)', () => {
    test('body totalmente válido retorna 200', async () => {
      const res = await request(app).post('/transactions').set(AUTH).send(validBody);
      expect(res.status).toBe(200);
      const b = res.body as TransactionResponse;
      expect(b.account).toBe(9999);
      expect(b.processed).toBe(2);
      expect(b.errors).toHaveLength(0);
    });

    test('description com 1 char retorna 422', async () => {
      const body = {
        account: 9999,
        transactions: [{ dtTransaction: today, description: 'X', value: 100 }],
      };
      const res = await request(app).post('/transactions').set(AUTH).send(body);
      expect(res.status).toBe(422);
      const b = res.body as TransactionResponse;
      expect(b.errors[0]?.issues.some((i) => i.field === 'description')).toBe(true);
    });

    test('erro contém transactionId como UUID v4', async () => {
      const body = {
        account: 9999,
        transactions: [{ dtTransaction: today, description: 'X', value: -1 }],
      };
      const res = await request(app).post('/transactions').set(AUTH).send(body);
      expect(res.status).toBe(422);
      const b = res.body as TransactionResponse;
      expect(b.errors[0]?.transactionId).toMatch(UUID_REGEX);
    });

    test('cada transação com erro recebe UUID único', async () => {
      const body = {
        account: 9999,
        transactions: [
          { dtTransaction: today, description: 'X', value: -1 },
          { dtTransaction: today, description: 'Y', value: -2 },
        ],
      };
      const res = await request(app).post('/transactions').set(AUTH).send(body);
      const b = res.body as TransactionResponse;
      const ids = b.errors.map((e) => e.transactionId);
      expect(new Set(ids).size).toBe(2);
    });

    test('transação com data futura retorna 422', async () => {
      const body = {
        account: 9999,
        transactions: [{ dtTransaction: tomorrow(), description: 'Payment', value: 100 }],
      };
      const res = await request(app).post('/transactions').set(AUTH).send(body);
      expect(res.status).toBe(422);
      const b = res.body as TransactionResponse;
      expect(b.errors[0]?.issues.some((i) => i.message.includes('futura'))).toBe(true);
    });

    test('transação com value negativo retorna 422', async () => {
      const body = {
        account: 9999,
        transactions: [{ dtTransaction: today, description: 'Transfer', value: -50 }],
      };
      const res = await request(app).post('/transactions').set(AUTH).send(body);
      expect(res.status).toBe(422);
      const b = res.body as TransactionResponse;
      expect(b.errors[0]?.issues.some((i) => i.field === 'value')).toBe(true);
    });

    test('mix válido/inválido → processed correto e erros indexados', async () => {
      const body = {
        account: 9999,
        transactions: [
          { dtTransaction: today, description: 'Payment', value: 100 },
          { dtTransaction: tomorrow(), description: 'X', value: -1 },
          { dtTransaction: today, description: 'Transfer', value: 200 },
        ],
      };
      const res = await request(app).post('/transactions').set(AUTH).send(body);
      expect(res.status).toBe(422);
      const b = res.body as TransactionResponse;
      expect(b.processed).toBe(2);
      expect(b.errors).toHaveLength(1);
      expect(b.errors[0]?.index).toBe(1);
    });
  });

  describe('Health check', () => {
    test('GET /health retorna 200 sem autenticação', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok' });
    });
  });
});
