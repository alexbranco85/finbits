# Transaction Processor API

API REST para processamento e validação de transações financeiras.
Construída com **Node.js**, **Express**, **TypeScript** e **Zod**.

---

## Sumário

- [Pré-requisitos](#pré-requisitos)
- [Instalação](#instalação)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Rodando o projeto](#rodando-o-projeto)
  - [Desenvolvimento local](#desenvolvimento-local)
  - [Docker](#docker)
- [Makefile](#makefile)
- [Endpoints da API](#endpoints-da-api)
  - [Health Check](#get-health)
  - [Processar Transações](#post-transactions)
- [Validações](#validações)
- [Exemplos de uso (curl)](#exemplos-de-uso-curl)
- [Testes](#testes)
- [Seed](#seed)
- [Arquitetura](#arquitetura)
- [Stack](#stack)

---

## Pré-requisitos

| Ferramenta | Versão mínima |
|---|---|
| Node.js | 20 LTS |
| npm | 10+ |
| Docker + Docker Compose | 24+ (opcional) |
| jq | qualquer (opcional, para formatar curl) |

---

## Instalação

```bash
git clone <url-do-repositorio>
cd transaction-processor
make install
```

---

## Variáveis de ambiente

Crie o arquivo `.env` na raiz do projeto a partir do exemplo:

```bash
cp .env.example .env
```

| Variável | Obrigatória | Descrição |
|---|---|---|
| `API_TOKEN` | Sim | Token Bearer usado para autenticar as requisições |
| `PORT` | Não | Porta do servidor (padrão: `3000`) |
| `NODE_ENV` | Não | Ambiente de execução (`development` / `production`) |

> O servidor não sobe sem `API_TOKEN` definido.

---

## Rodando o projeto

### Desenvolvimento local

```bash
make dev
```

O servidor inicia com `ts-node` em `http://localhost:3000`.

### Docker

```bash
# Build da imagem
make build

# Sobe o container em background
make up

# Acompanha os logs
make logs

# Para e remove o container
make down
```

O `docker-compose.yml` espera um arquivo `.env` na raiz com as variáveis configuradas.

---

## Makefile

| Comando | Descrição |
|---|---|
| `make install` | Instala as dependências |
| `make dev` | Inicia o servidor em modo desenvolvimento |
| `make test` | Executa os testes com cobertura |
| `make test-watch` | Executa os testes em modo watch |
| `make typecheck` | Verifica tipos TypeScript sem compilar |
| `make lint` | Executa o ESLint |
| `make compile` | Compila TypeScript para `dist/` |
| `make seed` | Envia cenários de exemplo para o servidor |
| `make build` | Constrói a imagem Docker |
| `make up` | Sobe os containers em background |
| `make down` | Para e remove os containers |
| `make logs` | Exibe logs dos containers em tempo real |

---

## Endpoints da API

### `GET /health`

Verifica se o servidor está no ar. Não requer autenticação.

**Response `200`**
```json
{ "status": "ok" }
```

---

### `POST /transactions`

Recebe e valida um lote de transações financeiras.

#### Headers

| Header | Valor |
|---|---|
| `Authorization` | `Bearer <API_TOKEN>` |
| `Content-Type` | `application/json` |

#### Request body

```json
{
  "account": 9999,
  "transactions": [
    {
      "dtTransaction": "20260329",
      "description": "Payment",
      "value": 150.50
    },
    {
      "dtTransaction": "20260328",
      "description": "Transfer",
      "value": 200.00
    }
  ]
}
```

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `account` | `number` | Sim | Inteiro positivo |
| `transactions` | `array` | Sim | Mínimo 1 item |
| `transactions[].dtTransaction` | `string` | Sim | Formato `YYYYMMDD` |
| `transactions[].description` | `string` | Sim | Mínimo 3 caracteres |
| `transactions[].value` | `number` | Sim | Estritamente positivo |

---

#### Response `200` — todas as transações válidas

```json
{
  "account": 9999,
  "processed": 2,
  "errors": []
}
```

---

#### Response `422` — há transações inválidas

Os erros são retornados **por transação**, identificados pelo índice e pelo `transactionId` (UUID v4 gerado pelo servidor).

```json
{
  "account": 9999,
  "processed": 1,
  "errors": [
    {
      "index": 1,
      "transactionId": "a3f1c2d4-5e6f-4789-b012-c3d4e5f60718",
      "dtTransaction": "20260401",
      "issues": [
        {
          "field": "dtTransaction",
          "message": "dtTransaction não pode ser uma data passada"
        },
        {
          "field": "value",
          "message": "value deve ser um número positivo"
        }
      ]
    }
  ]
}
```

---

#### Response `422` — erro estrutural do body

Ocorre quando `account` ou `transactions` estão ausentes ou com tipo incorreto. Não contém `transactionId`.

```json
{
  "error": "Unprocessable Entity",
  "issues": [
    {
      "field": "account",
      "message": "account é obrigatório"
    }
  ]
}
```

---

#### Response `401` — token inválido ou ausente

```json
{ "error": "Unauthorized" }
```

---

## Validações

As regras de negócio são aplicadas individualmente por transação no `transactionService`. Erros em uma transação não bloqueiam o processamento das demais.

| Campo | Regra |
|---|---|
| `dtTransaction` | Formato `YYYYMMDD`, data válida, não pode ser futura |
| `description` | String com mínimo 3 caracteres |
| `value` | Número estritamente positivo (> 0) |

---

## Exemplos de uso (curl)

> Substitua `<TOKEN>` pelo valor de `API_TOKEN` no seu `.env`.

### Sucesso

```bash
curl -s -X POST http://localhost:3000/transactions \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "account": 9999,
    "transactions": [
      { "dtTransaction": "20260330", "description": "Payment",  "value": 150.50 },
      { "dtTransaction": "20260329", "description": "Transfer", "value": 200.00 }
    ]
  }' | jq
```

### Data futura

```bash
curl -s -X POST http://localhost:3000/transactions \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "account": 9999,
    "transactions": [
      { "dtTransaction": "20260401", "description": "Payment", "value": 100.00 }
    ]
  }' | jq
```

### Value negativo

```bash
curl -s -X POST http://localhost:3000/transactions \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "account": 9999,
    "transactions": [
      { "dtTransaction": "20260330", "description": "Payment", "value": -50 }
    ]
  }' | jq
```

### Description curta (menos de 3 chars)

```bash
curl -s -X POST http://localhost:3000/transactions \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "account": 9999,
    "transactions": [
      { "dtTransaction": "20260330", "description": "Ab", "value": 100 }
    ]
  }' | jq
```

### Múltiplos erros na mesma transação

```bash
curl -s -X POST http://localhost:3000/transactions \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "account": 9999,
    "transactions": [
      { "dtTransaction": "20260401", "description": "Ab", "value": -1 }
    ]
  }' | jq
```

### Mix válido e inválido

```bash
curl -s -X POST http://localhost:3000/transactions \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "account": 9999,
    "transactions": [
      { "dtTransaction": "20260330", "description": "Payment",  "value": 300.00 },
      { "dtTransaction": "20260401", "description": "Ab",       "value": -1.00  },
      { "dtTransaction": "20260329", "description": "Transfer", "value": 75.00  }
    ]
  }' | jq
```

### Sem token

```bash
curl -s -X POST http://localhost:3000/transactions \
  -H "Content-Type: application/json" \
  -d '{"account":9999,"transactions":[{"dtTransaction":"20260330","description":"Payment","value":100}]}' | jq
```

### Health check

```bash
curl -s http://localhost:3000/health | jq
```

---

## Testes

```bash
# Executa todos os testes com relatório de cobertura
make test

# Modo watch (re-executa ao salvar)
make test-watch
```

### Cobertura por arquivo

| Arquivo | Cobertura |
|---|---|
| `schemas/transactionSchema.ts` | 100% |
| `services/transactionService.ts` | 100% |
| `controllers/transactionController.ts` | 100% |
| `routes/transactions.ts` | 100% |
| `middleware/auth.ts` | ~88% |
| `app.ts` | 100% |

### Suítes de teste

| Arquivo | O que testa |
|---|---|
| `tests/middleware/auth.test.ts` | Token válido, ausente, inválido e malformado |
| `tests/schemas/transactionSchema.test.ts` | Todas as regras Zod isoladas |
| `tests/services/transactionService.test.ts` | Validação por transação, UUIDs, acúmulo de erros |
| `tests/controllers/transactionController.test.ts` | Lógica HTTP sem dependência de rede |
| `tests/routes/transactions.test.ts` | Integração completa via supertest |

---

## Seed

O seed envia automaticamente todos os cenários de validação para o servidor e exibe as respostas formatadas.

```bash
# Com o servidor rodando em outro terminal:
make seed
```

Cenários cobertos:

| Categoria | Cenário |
|---|---|
| Auth | Sem token, token errado |
| Body | account ausente/negativo, transactions ausente/vazio |
| Value | Negativo, zero |
| Description | 2 chars, vazia |
| Data | Futura, formato inválido, data inexistente |
| Multi | 3 issues na mesma transação |
| Mix | 2 válidas + 1 inválida |
| Sucesso | Todas as transações válidas |

---

## Arquitetura

```
src/
├── config/
│   └── env.ts                  # Leitura e validação de env vars
├── controllers/
│   └── transactionController.ts # Camada HTTP: parse, UUID, resposta
├── middleware/
│   ├── auth.ts                  # Bearer token com timingSafeEqual
│   └── errorHandler.ts          # Handler global de erros (sem stack em prod)
├── routes/
│   └── transactions.ts          # Registro das rotas → controller
├── schemas/
│   └── transactionSchema.ts     # Schemas Zod (estrutural + negócio)
├── services/
│   └── transactionService.ts    # Regras de negócio por transação
├── types/
│   └── index.ts                 # Interfaces e types do domínio
├── app.ts                       # Express setup (Helmet, rate limit, rotas)
└── server.ts                    # Entrypoint (listen)
```

### Fluxo de uma requisição

```
Request
  └─ authMiddleware       (valida Bearer token)
       └─ controller      (valida estrutura do body via Zod)
            └─ [gera UUID por transação]
                 └─ service (valida regras de negócio por transação)
                      └─ Response (200 ou 422 com erros indexados)
```

### Segurança

| Medida | Detalhe |
|---|---|
| Headers HTTP seguros | `helmet()` |
| Rate limiting | 100 req / 15 min por IP |
| Autenticação | Bearer token com `crypto.timingSafeEqual` (evita timing attacks) |
| Stack trace | Nunca exposto em `NODE_ENV=production` |
| Container | Usuário não-root (`USER node`) |
| Secrets | Apenas via variável de ambiente, nunca no código |

---

## Stack

| Camada | Tecnologia |
|---|---|
| Runtime | Node.js 20 LTS |
| Framework | Express 4 |
| Linguagem | TypeScript 5 (strict mode) |
| Validação | Zod 3 |
| Segurança | Helmet 7, express-rate-limit 7 |
| Testes | Jest 29 + supertest 7 |
| Linter | ESLint 10 + typescript-eslint 8 |
| Container | Docker (Alpine multi-stage) |
