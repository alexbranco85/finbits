import { z } from 'zod';

/**
 * Converte string YYYYMMDD para um objeto Date (meia-noite UTC).
 * Retorna null se o formato ou a data forem inválidos.
 */
export function parseDate(raw: string): Date | null {
  if (!/^\d{8}$/.test(raw)) return null;

  const year = parseInt(raw.slice(0, 4), 10);
  const month = parseInt(raw.slice(4, 6), 10) - 1;
  const day = parseInt(raw.slice(6, 8), 10);
  const date = new Date(Date.UTC(year, month, day));

  // Valida que os componentes correspondem (evita datas como 20260231)
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

/** Retorna a data de hoje truncada a meia-noite UTC. */
export function todayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Verifica se um número é primo.
 */
export function isPrime(num: number): boolean {
  if (num <= 1) return false;
  if (num <= 3) return true;
  if (num % 2 === 0 || num % 3 === 0) return false;
  
  for (let i = 5; i * i <= num; i += 6) {
    if (num % i === 0 || num % (i + 2) === 0) return false;
  }
  
  return true;
}

/**
 * Schema de validação de negócio para uma transação individual.
 * Aplica todas as regras: description com mínimo 2 chars, valor positivo, data não futura (exceto Stock buy).
 */
export const transactionItemSchema = z.object({
  dtTransaction: z
    .string({ required_error: 'dtTransaction é obrigatório' })
    .refine((val) => /^\d{8}$/.test(val), {
      message: 'dtTransaction deve estar no formato YYYYMMDD',
    })
    .refine((val) => parseDate(val) !== null, {
      message: 'dtTransaction contém uma data inválida',
    }),

  description: z
    .string({ required_error: 'description é obrigatório' })
    .min(3, { message: 'description deve ter no mínimo 3 caracteres' }),

  value: z
    .number({
      required_error: 'value é obrigatório',
      invalid_type_error: 'value deve ser um número',
    })
    .positive({ message: 'value deve ser um número positivo' }),
}).refine(
  (data) => {
    // Para Stock buy, a data deve ser futura (d+1 ou posterior)
    if (data.description === 'Stock buy') {
      return true; // validação específica abaixo
    }
    // Para outras descriptions, data não pode ser futura
    const date = parseDate(data.dtTransaction);
    return date !== null && date <= todayUTC();
  },
  {
    message: 'dtTransaction não pode ser uma data futura',
    path: ['dtTransaction'],
  }
).refine(
  (data) => {
    if (data.description === 'Investiment') {
      return data.value > 1000;
    }
    return true;
  },
  {
    message: 'Para description "Investiment", o valor deve ser maior que 1000',
    path: ['value'],
  }
).refine(
  (data) => {
    if (data.description === 'Stock buy') {
      return data.value % 3 === 0;
    }
    return true;
  },
  {
    message: 'Para description "Stock buy", o valor deve ser divisível por 3',
    path: ['value'],
  }
).refine(
  (data) => {
    if (data.description === 'Stock buy') {
      const date = parseDate(data.dtTransaction);
      if (date === null) return true;
      const tomorrow = new Date(todayUTC());
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      return date >= tomorrow;
    }
    return true;
  },
  {
    message: 'Para description "Stock buy", a data deve ser d+1 (amanhã ou futura)',
    path: ['dtTransaction'],
  }
).refine(
  (data) => {
    if (data.description === 'ICPA') {
      return !isPrime(data.value);
    }
    return true;
  },
  {
    message: 'Para description "ICPA", o valor não pode ser um número primo',
    path: ['value'],
  }
);

/**
 * Schema estrutural para os itens de transação dentro do body.
 * Valida apenas tipos e presença — as regras de negócio ficam no service,
 * permitindo retornar erros indexados por transação.
 */
const transactionItemStructureSchema = z.object({
  dtTransaction: z.string({ required_error: 'dtTransaction é obrigatório' }),
  description: z.string({ required_error: 'description é obrigatório' }),
  value: z.number({
    required_error: 'value é obrigatório',
    invalid_type_error: 'value deve ser um número',
  }),
});

/**
 * Schema do body completo da requisição.
 * Valida account e a estrutura do array de transações.
 */
export const transactionBodySchema = z.object({
  account: z
    .number({
      required_error: 'account é obrigatório',
      invalid_type_error: 'account deve ser um número',
    })
    .int({ message: 'account deve ser um inteiro' })
    .positive({ message: 'account deve ser positivo' }),

  transactions: z
    .array(transactionItemStructureSchema, { required_error: 'transactions é obrigatório' })
    .min(1, { message: 'transactions deve conter ao menos uma transação' }),
});

export type TransactionItemValidated = z.infer<typeof transactionItemSchema>;
export type TransactionBodyInput = z.infer<typeof transactionBodySchema>;
