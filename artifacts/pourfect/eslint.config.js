// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'server/*', '.expo/*', 'node_modules/*'],
  },
  {
    files: ['scripts/**/*.{js,ts}', 'jest.config.js', 'metro.config.js', 'eslint.config.js'],
    languageOptions: { globals: { require: 'readonly', module: 'writable', __dirname: 'readonly', process: 'readonly' } },
  },
]);
