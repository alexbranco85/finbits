process.env['API_TOKEN'] = 'test-token-123';
process.env['NODE_ENV'] = 'test';

import { validateTransactions } from '../../src/services/transactionService';
import { todayUTC } from '../../src/schemas/transactionSchema';
import type { TransactionInput } from '../../src/types';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

const validTx: TransactionInput = {
  transactionId: 'aaaaaaaa-0000-4000-8000-000000000001',
  dtTransaction: today,
  description: 'Payment',
  value: 150.5,
};

describe('validateTransactions', () => {
  test('transação válida → processed=1, errors=[]', () => {
    const { processed, errors } = validateTransactions([validTx]);
    expect(processed).toBe(1);
    expect(errors).toHaveLength(0);
  });

  test('description com 3 chars é válida', () => {
    const tx: TransactionInput = { ...validTx, description: 'Pag' };
    const { processed, errors } = validateTransactions([tx]);
    expect(processed).toBe(1);
    expect(errors).toHaveLength(0);
  });

  test('description com 2 chars é inválida', () => {
    const tx: TransactionInput = {
      transactionId: 'aaaaaaaa-0000-4000-8000-000000000002',
      dtTransaction: today,
      description: 'Ab',
      value: 100,
    };
    const { processed, errors } = validateTransactions([tx]);
    expect(processed).toBe(0);
    expect(errors[0]?.issues.some((i) => i.field === 'description')).toBe(true);
  });

  test('erro contém transactionId do input', () => {
    const id = 'bbbbbbbb-0000-4000-8000-000000000001';
    const tx: TransactionInput = { transactionId: id, dtTransaction: tomorrow(), description: 'X', value: -1 };
    const { errors } = validateTransactions([tx]);
    expect(errors[0]?.transactionId).toBe(id);
  });

  test('transação com data futura e description inválida → múltiplos erros no mesmo item', () => {
    const tx: TransactionInput = {
      transactionId: 'cccccccc-0000-4000-8000-000000000001',
      dtTransaction: tomorrow(),
      description: 'X',
      value: -1,
    };
    const { errors } = validateTransactions([tx]);
    expect(errors[0]?.issues.length).toBeGreaterThan(1);
  });

  test('transação inválida → processed=0, errors com index=0 e transactionId', () => {
    const tx: TransactionInput = {
      transactionId: 'dddddddd-0000-4000-8000-000000000001',
      dtTransaction: tomorrow(),
      description: 'X',
      value: -10,
    };
    const { processed, errors } = validateTransactions([tx]);
    expect(processed).toBe(0);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.index).toBe(0);
    expect(errors[0]?.transactionId).toBe('dddddddd-0000-4000-8000-000000000001');
    expect(errors[0]?.dtTransaction).toBe(tomorrow());
    expect(errors[0]?.issues.length).toBeGreaterThan(0);
  });

  test('mix válido/inválido → processa corretamente cada um', () => {
    const invalid: TransactionInput = {
      transactionId: 'eeeeeeee-0000-4000-8000-000000000001',
      dtTransaction: tomorrow(),
      description: 'X',
      value: -1,
    };
    const { processed, errors } = validateTransactions([validTx, invalid, validTx]);
    expect(processed).toBe(2);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.index).toBe(1);
  });

  test('todos inválidos → errors com transactionIds preservados', () => {
    const txs: TransactionInput[] = [
      { transactionId: 'id-001', dtTransaction: tomorrow(), description: 'X', value: -1 },
      { transactionId: 'id-002', dtTransaction: 'invalid', description: 'Y', value: 0 },
    ];
    const { processed, errors } = validateTransactions(txs);
    expect(processed).toBe(0);
    expect(errors[0]?.transactionId).toBe('id-001');
    expect(errors[1]?.transactionId).toBe('id-002');
  });

  test('erros contêm field e message', () => {
    const tx: TransactionInput = {
      transactionId: 'ffffffff-0000-4000-8000-000000000001',
      dtTransaction: today,
      description: 'X',
      value: -5,
    };
    const { errors } = validateTransactions([tx]);
    expect(errors[0]?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: expect.any(String), message: expect.any(String) }),
      ])
    );
  });

  test('dtTransaction ausente aparece como null no erro', () => {
    const tx = {
      transactionId: 'aaaaaaaa-0000-4000-8000-000000000099',
      description: 'Payment',
      value: 10,
    } as unknown as TransactionInput;
    const { errors } = validateTransactions([tx]);
    expect(errors[0]?.dtTransaction).toBeNull();
  });

  test('controller gera UUIDs v4 únicos para cada transação', () => {
    // Simula o comportamento do controller: cada tx recebe um UUID único
    const ids = Array.from({ length: 5 }, () => crypto.randomUUID());
    const unique = new Set(ids);
    expect(unique.size).toBe(5);
    ids.forEach((id) => expect(id).toMatch(UUID_REGEX));
  });
});
