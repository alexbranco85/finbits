.PHONY: install dev seed test test-watch typecheck lint compile build up down logs help

## Instala as dependências do projeto
install:
	npm install

## Inicia o servidor em modo desenvolvimento com ts-node
dev:
	npm run dev

## Envia cenários de exemplo para o servidor (requer servidor rodando)
seed:
	npx ts-node scripts/seed.ts

## Executa os testes com cobertura
test:
	npm test

## Executa os testes em modo watch
test-watch:
	npm run test:watch

## Verifica tipos TypeScript sem emitir arquivos
typecheck:
	npm run typecheck

## Executa o linter ESLint
lint:
	npm run lint

## Compila TypeScript para dist/
compile:
	npm run build

## Constrói a imagem Docker
build:
	docker compose build

## Sobe os containers em background
up:
	docker compose up -d

## Para e remove os containers
down:
	docker compose down

## Exibe os logs dos containers em tempo real
logs:
	docker compose logs -f

## Exibe os targets disponíveis
help:
	@grep -E '^##' Makefile | sed 's/## //'
