/**
 * Seed script — envia payloads de exemplo para o endpoint POST /transactions.
 * Cobre todos os cenários de validação da API.
 *
 * Uso:
 *   npx ts-node scripts/seed.ts
 *   ou via Makefile:
 *   make seed
 */

import 'dotenv/config';

const BASE_URL = process.env['BASE_URL'] ?? 'http://localhost:3000';
const TOKEN = process.env['API_TOKEN'] ?? '';

if (!TOKEN) {
  console.error('[SEED] API_TOKEN não definido. Verifique o arquivo .env');
  process.exit(1);
}

/** Formata Date UTC como YYYYMMDD. */
function toYYYYMMDD(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function daysFromToday(offset: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  return toYYYYMMDD(d);
}

const today = daysFromToday(0);
const yesterday = daysFromToday(-1);
const tomorrow = daysFromToday(1);

// ── Tipos internos do seed ────────────────────────────────────────────────────

type Scenario = {
  label: string;
  payload: unknown;
  noToken?: boolean;
  wrongToken?: boolean;
  endpoint?: string;
};

// ── Cenários ──────────────────────────────────────────────────────────────────

const scenarios: Scenario[] = [
  // ── AUTH ───────────────────────────────────────────────────────────────────
  {
    label: '❌ [AUTH] Sem token → 401',
    noToken: true,
    payload: { account: 9999, transactions: [{ dtTransaction: today, description: 'Payment', value: 100 }] },
  },
  {
    label: '❌ [AUTH] Token errado → 401',
    wrongToken: true,
    payload: { account: 9999, transactions: [{ dtTransaction: today, description: 'Payment', value: 100 }] },
  },

  // ── ESTRUTURA DO BODY ───────────────────────────────────────────────────────
  {
    label: '❌ [BODY] account ausente → 422 estrutural',
    payload: { transactions: [{ dtTransaction: today, description: 'Payment', value: 100 }] },
  },
  {
    label: '❌ [BODY] account negativo → 422 estrutural',
    payload: { account: -1, transactions: [{ dtTransaction: today, description: 'Payment', value: 100 }] },
  },
  {
    label: '❌ [BODY] transactions ausente → 422 estrutural',
    payload: { account: 9999 },
  },
  {
    label: '❌ [BODY] transactions vazio → 422 estrutural',
    payload: { account: 9999, transactions: [] },
  },

  // ── VALUE ───────────────────────────────────────────────────────────────────
  {
    label: '❌ [VALUE] Negativo → 422 com transactionId',
    payload: { account: 9999, transactions: [{ dtTransaction: today, description: 'Payment', value: -50 }] },
  },
  {
    label: '❌ [VALUE] Zero → 422 com transactionId',
    payload: { account: 9999, transactions: [{ dtTransaction: today, description: 'Payment', value: 0 }] },
  },

  // ── DESCRIPTION ─────────────────────────────────────────────────────────────
  {
    label: '❌ [DESCRIPTION] 2 chars (mínimo 3) → 422 com transactionId',
    payload: { account: 9999, transactions: [{ dtTransaction: today, description: 'Ab', value: 100 }] },
  },
  {
    label: '❌ [DESCRIPTION] Vazia → 422 com transactionId',
    payload: { account: 9999, transactions: [{ dtTransaction: today, description: '', value: 100 }] },
  },

  // ── DATA ────────────────────────────────────────────────────────────────────
  {
    label: '❌ [DATA] Futura → 422 com transactionId',
    payload: { account: 9999, transactions: [{ dtTransaction: tomorrow, description: 'Payment', value: 100 }] },
  },
  {
    label: '❌ [DATA] Formato inválido (DD/MM/YYYY) → 422 com transactionId',
    payload: { account: 9999, transactions: [{ dtTransaction: '29/03/2026', description: 'Payment', value: 100 }] },
  },
  {
    label: '❌ [DATA] Inexistente (31 de fevereiro) → 422 com transactionId',
    payload: { account: 9999, transactions: [{ dtTransaction: '20260231', description: 'Payment', value: 100 }] },
  },

  // ── MÚLTIPLOS ERROS NA MESMA TRANSAÇÃO ─────────────────────────────────────
  {
    label: '❌ [MULTI] Data futura + value negativo + description curta → 3 issues em index 0',
    payload: {
      account: 9999,
      transactions: [{ dtTransaction: tomorrow, description: 'Ab', value: -1 }],
    },
  },

  // ── MIX VÁLIDO / INVÁLIDO ───────────────────────────────────────────────────
  {
    label: '⚠️  [MIX] 2 válidas + 1 inválida → processed: 2, errors: [index 1]',
    payload: {
      account: 9999,
      transactions: [
        { dtTransaction: today,     description: 'Payment',  value: 300.00 },
        { dtTransaction: tomorrow,  description: 'Ab',       value: -1.00  },
        { dtTransaction: yesterday, description: 'Transfer', value: 75.00  },
      ],
    },
  },

  // ── SUCESSO ─────────────────────────────────────────────────────────────────
  {
    label: '✅ [OK] Todas válidas → 200 sem errors',
    payload: {
      account: 9999,
      transactions: [
        { dtTransaction: today,     description: 'Payment',  value: 150.50 },
        { dtTransaction: yesterday, description: 'Transfer', value: 200.00 },
        { dtTransaction: yesterday, description: 'Refund',   value: 50.00  },
      ],
    },
  },
];

// ── Runner ────────────────────────────────────────────────────────────────────

async function runSeed(): Promise<void> {
  console.warn(`\n[SEED] ${scenarios.length} cenários → ${BASE_URL}/transactions\n`);
  console.warn('─'.repeat(60));

  for (const { label, payload, noToken, wrongToken } of scenarios) {
    const authToken = wrongToken ? 'token-invalido' : TOKEN;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(!noToken && { Authorization: `Bearer ${authToken}` }),
    };

    try {
      const response = await fetch(`${BASE_URL}/transactions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const body = await response.json();
      const status = response.status;
      const formatted = JSON.stringify(body, null, 2).split('\n').join('\n     ');

      console.warn(`\n${label}`);
      console.warn(`  HTTP ${status}`);
      console.warn(`  ${formatted}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`\n${label}`);
      console.error(`  ERRO ao conectar: ${message}`);
      console.error('  Verifique se o servidor está rodando (make dev ou make up)');
    }

    console.warn('\n' + '─'.repeat(60));
  }

  console.warn('\n[SEED] Concluído.');
}

runSeed();
