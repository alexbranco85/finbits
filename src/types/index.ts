/**
 * Tipos e interfaces do domínio da aplicação.
 * Centralizados aqui para reutilização entre camadas.
 */

/** Configuração da aplicação lida das variáveis de ambiente. */
export interface AppConfig {
  API_TOKEN: string;
  PORT: string | number;
  NODE_ENV: string;
}

/**
 * Dados brutos de uma transação vindos do payload HTTP, enriquecidos pelo controller
 * com um UUID gerado pelo servidor antes de serem enviados ao service.
 */
export interface TransactionInput {
  transactionId: string;
  dtTransaction: string;
  description: string;
  value: number;
}

/**
 * Transação validada pelo domínio.
 */
export interface TransactionItem {
  dtTransaction: string;
  description: string;
  value: number;
}

/** Payload completo do endpoint POST /transactions. */
export interface TransactionBody {
  account: number;
  transactions: TransactionInput[];
}

/** Um único erro de validação com o campo afetado e a mensagem. */
export interface TransactionIssue {
  field: string;
  message: string;
}

/** Agrupa os erros de validação de uma transação específica, identificada pelo índice e UUID. */
export interface TransactionError {
  index: number;
  transactionId: string;
  dtTransaction: string | null;
  issues: TransactionIssue[];
}

/** Resultado da validação de um lote de transações. */
export interface ValidationResult {
  processed: number;
  errors: TransactionError[];
}

/** Formato da resposta de sucesso do endpoint de transações. */
export interface TransactionResponse extends ValidationResult {
  account: number;
}

/** Formato de erro genérico da API. */
export interface ApiError {
  error: string;
  issues?: TransactionIssue[];
  detail?: string;
}
