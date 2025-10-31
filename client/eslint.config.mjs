import globals from 'globals';
import vueParser from 'vue-eslint-parser';
import pluginVue from 'eslint-plugin-vue';
import pinia from 'eslint-plugin-pinia';
import tseslint from 'typescript-eslint';
import parent from '../eslint.config.mjs';

export default tseslint.config(
  ...parent,
  ...pluginVue.configs['flat/recommended'],
  pinia.configs['recommended-flat'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
      parser: vueParser,
      ecmaVersion: 2020,
      sourceType: 'module',

      parserOptions: {
        extraFileExtensions: ['.vue'],
        parser: tseslint.parser,
        ecmaFeatures: {
          jsx: true,
        },
      },
    },

    rules: {
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
);
