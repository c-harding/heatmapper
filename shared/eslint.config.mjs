import globals from 'globals';
import tseslint from 'typescript-eslint';

import parent from '../eslint.config.mjs';

export default tseslint.config(...parent, {
  files: ['**/*.ts', '**/*.js'],
  languageOptions: {
    globals: {
      ...globals.node,
    },

    parser: tseslint.parser,
    ecmaVersion: 2020,
    sourceType: 'module',
  },

  rules: {
    '@typescript-eslint/no-namespace': 'off',
  },
});
