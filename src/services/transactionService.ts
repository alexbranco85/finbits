import { transactionItemSchema } from '../schemas/transactionSchema';
import type { TransactionInput, TransactionIssue, TransactionError, ValidationResult } from '../types';

/**
 * Valida cada transação individualmente contra as regras de negócio e acumula
 * os erros por índice, permitindo ao caller saber exatamente quais falharam.
 *
 * Regras aplicadas via schema:
 * - description deve ter mínimo 2 caracteres
 * - value deve ser positivo (> 0)
 * - dtTransaction deve estar no formato YYYYMMDD e não ser futura
 */
export function validateTransactions(transactions: TransactionInput[]): ValidationResult {
  const errors: TransactionError[] = [];

  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i];
    const result = transactionItemSchema.safeParse(tx);

    if (!result.success) {
      const issues: TransactionIssue[] = result.error.issues.map((issue) => ({
        field: issue.path.join('.') || 'unknown',
        message: issue.message,
      }));

      errors.push({
        index: i,
        transactionId: tx?.transactionId ?? 'unknown',
        dtTransaction: tx?.dtTransaction ?? null,
        issues,
      });
    }
  }

  return {
    processed: transactions.length - errors.length,
    errors,
  };
}
