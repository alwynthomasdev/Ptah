/* eslint-env node */
module.exports = {
  root: true,
  env: { browser: true, node: true, es2022: true },
  parser: 'vue-eslint-parser',
  parserOptions: {
    parser: '@typescript-eslint/parser',
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:vue/vue3-essential',
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    // Formatting is Prettier's job, not ESLint's.
    'vue/multi-word-component-names': 'off',
    'vue/max-attributes-per-line': 'off',
    'vue/singleline-html-element-content-newline': 'off',
    'vue/html-self-closing': 'off',
    'vue/require-default-prop': 'off',
  },
  ignorePatterns: ['dist/', 'dist-electron/', 'release/', 'node_modules/', 'coverage/'],
};
