import tsParser from '@typescript-eslint/parser';
import globals from 'globals';
import js from '@eslint/js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default [
  ...compat.extends('eslint:recommended', 'plugin:@typescript-eslint/recommended'),
  {
    files: ['**/*.ts', '**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },

      parser: tsParser,
      ecmaVersion: 2020,
      sourceType: 'module',
    },

    rules: {
      '@typescript-eslint/no-namespace': 'off',
    },
  },
];
