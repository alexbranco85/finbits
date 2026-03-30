# ── Stage 1: build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

# Instala todas as deps (incluindo devDeps para compilar o TypeScript)
COPY package*.json tsconfig.build.json tsconfig.json ./
RUN npm ci

COPY src ./src

# Compila TypeScript → dist/
RUN npm run build

# ── Stage 2: runtime ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

ENV NODE_ENV=production

WORKDIR /app

# Instala somente deps de produção
COPY package*.json ./
RUN npm ci --omit=dev

# Copia apenas o output compilado
COPY --from=build /app/dist ./dist

# Usuário não-root para reduzir superfície de ataque
USER node

EXPOSE 3000

CMD ["node", "dist/server.js"]
