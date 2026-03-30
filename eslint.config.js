'use strict';

const tseslint = require('typescript-eslint');

module.exports = tseslint.config(
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts', 'tests/**/*.ts'],
    rules: {
      // Variáveis não usadas: prefixo _ para ignorar intencionalmente
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Proibir any explícito
      '@typescript-eslint/no-explicit-any': 'error',
      // Exigir tratamento de promises
      '@typescript-eslint/no-floating-promises': 'off',
      // Console: permitir apenas error e warn
      'no-console': ['warn', { allow: ['error', 'warn'] }],
      // Preferir const onde possível
      'prefer-const': 'error',
      // Sem var
      'no-var': 'error',
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'eslint.config.js'],
  }
);
