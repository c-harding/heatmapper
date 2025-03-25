import eslint from '@eslint/js';
import importPlugin from 'eslint-plugin-import';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import unusedImports from 'eslint-plugin-unused-imports';
import eslintConfigPrettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  eslintConfigPrettier,
  ...tseslint.configs.stylisticTypeChecked,
  importPlugin.flatConfigs.recommended,
  {
    ignores: ['eslint.config.mjs'],
  },
  {
    plugins: {
      'simple-import-sort': simpleImportSort,
      'unused-imports': unusedImports,
    },

    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: 2020,
      sourceType: 'script',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },

    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: ['**/tsconfig.json'],
        },
      },
    },

    rules: {
      'comma-dangle': ['error', 'always-multiline'],

      'no-underscore-dangle': [
        'warn',
        {
          allowAfterThis: true,
        },
      ],

      'import/extensions': 'off',

      'import/no-duplicates': ['off'],

      'unused-imports/no-unused-imports': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        {
          fixStyle: 'inline-type-imports',
        },
      ],

      'import/consistent-type-specifier-style': ['warn', 'prefer-inline'],
      'simple-import-sort/imports': 'warn',
      'no-unused-vars': 'off',

      '@typescript-eslint/prefer-nullish-coalescing': ['error', { ignorePrimitives: true }],
    },
  },
  {
    files: ['eslint.config.mjs'],
    rules: {
      'import/no-unresolved': 'off',
    },
  },
);
