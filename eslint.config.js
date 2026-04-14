//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'
import tseslint from 'typescript-eslint'

export default [
  ...tanstackConfig,
  {
    files: ['**/*.{js,ts,tsx}'],
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      'import/no-cycle': 'off',
      'import/order': 'off',
      'sort-imports': 'off',
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/require-await': 'off',
      'pnpm/json-enforce-catalog': 'off',
      '@typescript-eslint/no-non-null-assertion': 'error',
    },
  },
  {
    // Test files — use dedicated tsconfig.test.json that includes tests/**
    files: [
      'tests/**/*.{ts,tsx}',
      'src/**/*.test.{ts,tsx}',
      'src/**/__tests__/**/*.{ts,tsx}',
    ],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.test.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    // shadcn-generated files — never modify directly, exclude from strict lint
    files: ['src/components/ui/**'],
    rules: {
      'import/consistent-type-specifier-style': 'off',
    },
  },
  {
    ignores: ['eslint.config.js', 'prettier.config.js', '.output/**', 'node_modules/**', 'public/**/*.js'],
  },
]
