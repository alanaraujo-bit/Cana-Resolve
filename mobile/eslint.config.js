// O aplicativo tem a sua própria verificação: o `eslint.config.mjs` da raiz é
// do site (Next.js) e ignora este diretório de propósito.
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['node_modules/**', '.expo/**', 'dist/**', 'expo-env.d.ts'],
  },
]);
