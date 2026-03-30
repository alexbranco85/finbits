import crypto from 'crypto';
import type { Request, Response } from 'express';
import { transactionBodySchema } from '../schemas/transactionSchema';
import { validateTransactions } from '../services/transactionService';
import type { TransactionIssue, TransactionResponse, ApiError } from '../types';

/**
 * Recebe o payload HTTP, valida a estrutura do body e delega
 * a validação de negócio ao transactionService.
 *
 * Responsabilidades desta camada:
 * - Parsear e validar a estrutura do body (account + array de transações)
 * - Orquestrar a chamada ao service
 * - Serializar a resposta HTTP
 */
export function postTransactions(
  req: Request,
  res: Response<TransactionResponse | ApiError>
): void {
  const parseResult = transactionBodySchema.safeParse(req.body);

  if (!parseResult.success) {
    const issues: TransactionIssue[] = parseResult.error.issues.map((issue) => ({
      field: issue.path.join('.') || 'unknown',
      message: issue.message,
    }));
    res.status(422).json({ error: 'Unprocessable Entity', issues });
    return;
  }

  const { account, transactions } = parseResult.data;

  // Atribui um UUID a cada transação antes de enviar ao service
  const enriched = transactions.map((tx) => ({
    ...tx,
    transactionId: crypto.randomUUID(),
  }));

  const { processed, errors } = validateTransactions(enriched);

  const status = errors.length > 0 ? 422 : 200;
  res.status(status).json({ account, processed, errors });
}
