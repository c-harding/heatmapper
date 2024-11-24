import path from "node:path";
import { fileURLToPath } from "node:url";

import eslint from '@eslint/js';
import importPlugin from 'eslint-plugin-import';
import tsParser from "@typescript-eslint/parser";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import unusedImports from "eslint-plugin-unused-imports";
import eslintConfigPrettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';


export default [
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.stylistic,
  eslintConfigPrettier,
  importPlugin.flatConfigs.recommended,
  {
    plugins: {
      "simple-import-sort": simpleImportSort,
      "unused-imports": unusedImports,
      import: fixupPluginRules(_import),
    },

    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2020,
      sourceType: "script",
    },

    rules: {
      "comma-dangle": ["error", "always-multiline"],

      "no-underscore-dangle": [
        "warn",
        {
          allowAfterThis: true,
        },
      ],

      "import/extensions": "off",

      "import/no-duplicates": [
        "error",
        {
          "prefer-inline": true,
        },
      ],

      "unused-imports/no-unused-imports": "error",

      "@typescript-eslint/no-unused-vars": [
        "off",
        {
          ignoreRestSiblings: true,
        },
      ],

      "@typescript-eslint/consistent-type-imports": [
        "warn",
        {
          fixStyle: "inline-type-imports",
        },
      ],

      "import/consistent-type-specifier-style": ["warn", "prefer-inline"],
      "simple-import-sort/imports": "warn",
    },
  },
];
