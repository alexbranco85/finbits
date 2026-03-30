process.env['API_TOKEN'] = 'test-token-123';
process.env['NODE_ENV'] = 'test';

import {
  transactionItemSchema,
  transactionBodySchema,
  todayUTC,
} from '../../src/schemas/transactionSchema';

/** Formata um Date UTC como string YYYYMMDD. */
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

function yesterday(): string {
  const t = new Date(todayUTC());
  t.setUTCDate(t.getUTCDate() - 1);
  return dateToYYYYMMDD(t);
}

const today = dateToYYYYMMDD(todayUTC());

// ── transactionItemSchema — description ────────────────────────────────────

describe('transactionItemSchema — description', () => {
  test('descrição com 3 caracteres é válida', () => {
    const result = transactionItemSchema.safeParse({
      dtTransaction: today,
      description: 'Pag',
      value: 100,
    });
    expect(result.success).toBe(true);
  });

  test('qualquer string com 3+ chars é válida', () => {
    const result = transactionItemSchema.safeParse({
      dtTransaction: today,
      description: 'Payment',
      value: 100,
    });
    expect(result.success).toBe(true);
  });

  test('descrição com 2 caracteres é inválida', () => {
    const result = transactionItemSchema.safeParse({
      dtTransaction: today,
      description: 'Ab',
      value: 100,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.error.issues.map((i) => i.path[0]);
      expect(fields).toContain('description');
    }
  });

  test('string vazia é inválida', () => {
    const result = transactionItemSchema.safeParse({
      dtTransaction: today,
      description: '',
      value: 100,
    });
    expect(result.success).toBe(false);
  });

  test('description ausente gera erro', () => {
    const result = transactionItemSchema.safeParse({
      dtTransaction: today,
      value: 100,
    });
    expect(result.success).toBe(false);
  });
});

// ── transactionItemSchema — value ──────────────────────────────────────────

describe('transactionItemSchema — value', () => {
  test('valor positivo é válido', () => {
    const result = transactionItemSchema.safeParse({
      dtTransaction: today,
      description: 'Payment',
      value: 100.5,
    });
    expect(result.success).toBe(true);
  });

  test('valor zero é inválido', () => {
    const result = transactionItemSchema.safeParse({
      dtTransaction: today,
      description: 'Payment',
      value: 0,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.error.issues.map((i) => i.path[0]);
      expect(fields).toContain('value');
    }
  });

  test('valor negativo é inválido', () => {
    const result = transactionItemSchema.safeParse({
      dtTransaction: today,
      description: 'Payment',
      value: -50,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.error.issues.map((i) => i.path[0]);
      expect(fields).toContain('value');
    }
  });
});

// ── transactionItemSchema — dtTransaction ──────────────────────────────────

describe('transactionItemSchema — dtTransaction', () => {
  test('data de hoje é válida', () => {
    const result = transactionItemSchema.safeParse({
      dtTransaction: today,
      description: 'Payment',
      value: 10,
    });
    expect(result.success).toBe(true);
  });

  test('data passada é válida', () => {
    const result = transactionItemSchema.safeParse({
      dtTransaction: yesterday(),
      description: 'Transfer',
      value: 10,
    });
    expect(result.success).toBe(true);
  });

  test('data futura é inválida', () => {
    const result = transactionItemSchema.safeParse({
      dtTransaction: tomorrow(),
      description: 'Payment',
      value: 10,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages.some((m) => m.includes('futura'))).toBe(true);
    }
  });

  test('formato inválido retorna erro', () => {
    const result = transactionItemSchema.safeParse({
      dtTransaction: '11/03/2026',
      description: 'Payment',
      value: 10,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages.some((m) => m.includes('YYYYMMDD'))).toBe(true);
    }
  });

  test('data inexistente (ex: 20260231) é inválida', () => {
    const result = transactionItemSchema.safeParse({
      dtTransaction: '20260231',
      description: 'Payment',
      value: 10,
    });
    expect(result.success).toBe(false);
  });
});

// ── transactionBodySchema ──────────────────────────────────────────────────

describe('transactionBodySchema', () => {
  const validBody = {
    account: 9999,
    transactions: [{ dtTransaction: today, description: 'Payment', value: 150.5 }],
  };

  test('body válido é aceito', () => {
    const result = transactionBodySchema.safeParse(validBody);
    expect(result.success).toBe(true);
  });

  test('account ausente gera erro', () => {
    const { account: _, ...body } = validBody;
    const result = transactionBodySchema.safeParse(body);
    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.error.issues.map((i) => i.path[0]);
      expect(fields).toContain('account');
    }
  });

  test('account negativo gera erro', () => {
    const result = transactionBodySchema.safeParse({ ...validBody, account: -1 });
    expect(result.success).toBe(false);
  });

  test('transactions vazio gera erro', () => {
    const result = transactionBodySchema.safeParse({ ...validBody, transactions: [] });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.error.issues.map((i) => i.path[0]);
      expect(fields).toContain('transactions');
    }
  });

  test('transactions ausente gera erro', () => {
    const { transactions: _, ...body } = validBody;
    const result = transactionBodySchema.safeParse(body);
    expect(result.success).toBe(false);
  });
});
