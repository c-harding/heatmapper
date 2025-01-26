import globals from 'globals';
import parser from 'vue-eslint-parser';
import eslintConfigPrettier from 'eslint-config-prettier';
import pluginVue from 'eslint-plugin-vue';
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['**/*.ts', '**/*.vue', '**/*.html'],
    languageOptions: {
      globals: {
        ...globals.node,
      },

      parser: parser,
      ecmaVersion: 2020,
      sourceType: 'commonjs',

      parserOptions: {
        parser: '@typescript-eslint/parser',

        ecmaFeatures: {
          jsx: true,
        },
      },
    },

    rules: {
      'no-redeclare': 'off',

      'vue/html-self-closing': [
        'error',
        {
          html: {
            void: 'always',
          },
        },
      ],

      'vue/attribute-hyphenation': ['error', 'never'],

      // START disabled because of prettier
      'vue/multi-word-component-names': 'off',
      'vue/html-indent': 'off',
      'vue/html-closing-bracket-newline': 'off',
      'vue/max-attributes-per-line': 'off',
      'vue/custom-event-name-casing': 'off',
      'comma-dangle': 'off',
      'vue/html-closing-bracket-spacing': 'off',
      'vue/html-end-tags': 'off',
      'vue/html-quotes': 'off',
      'vue/multiline-html-element-content-newline': 'off',
      'vue/mustache-interpolation-spacing': 'off',
      'vue/no-multi-spaces': 'off',
      'vue/no-spaces-around-equal-signs-in-attribute': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      // END disabled because of prettier
    },
  },
];
