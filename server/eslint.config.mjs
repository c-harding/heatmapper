import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { readGitignoreFiles } from 'eslint-gitignore';
import globals from 'globals';
import tseslint from 'typescript-eslint';

import parent from '../eslint.config.mjs';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default tseslint.config(...parent, {
  files: ['**/*.ts'],
  ignores: readGitignoreFiles({ cwd: dirname }),

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
});
