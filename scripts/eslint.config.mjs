import globals from 'globals';
import tseslint from 'typescript-eslint';

import parent from '../eslint.config.mjs';

export default tseslint.config(...parent, {
  files: ['**/*.ts'],
  languageOptions: {
    globals: {
      ...globals.node,
    },

    parser: tseslint.parser,
    sourceType: 'module',
  },
});
