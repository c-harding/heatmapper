import globals from 'globals';
import tseslint from 'typescript-eslint';

import parent from '../eslint.config.mjs';

export default tseslint.config(
  ...parent,
  { ignores: ['sessions/', 'sessions-mock/'] },
  {
    files: ['**/*.ts'],

    languageOptions: {
      globals: {
        ...globals.node,
      },

      parser: tseslint.parser,
      ecmaVersion: 5,
      sourceType: 'module',
    },

    rules: {
      'no-return-await': 'off',

      'no-param-reassign': [
        'error',
        {
          props: false,
        },
      ],
    },
  },
);
