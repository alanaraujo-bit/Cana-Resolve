import { readFileSync } from "node:fs";

/**
 * Prepara um banco de verdade para os testes de fluxo.
 *
 * Roda contra um Postgres real — o mesmo servidor, outro banco (`canaa_test`).
 * Um dublê em memória não serviria aqui: o que estes testes precisam provar é
 * justamente o comportamento do Postgres — transação, índice único, sequência
 * — e um dublê fingiria tudo isso funcionando.
 *
 * Este módulo precisa ser importado **antes** de qualquer coisa que toque no
 * banco, porque é ele que aponta `DATABASE_URL` para o banco de teste.
 */
function carregarEnv() {
  try {
    for (const linha of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
      const m = /^([A-Z_][A-Z0-9_]*)=(.*)$/.exec(linha.trim());
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    /* sem .env.local: as variáveis vêm do ambiente */
  }
}

carregarEnv();

const original = process.env.DATABASE_URL;
if (!original) {
  throw new Error("DATABASE_URL não está definida — os testes de fluxo precisam de um banco.");
}

/** Mesmo servidor, banco separado. Nenhum teste toca no banco de trabalho. */
export const TEST_DATABASE_URL = original.replace(/\/[^/?]+(\?|$)/, "/canaa_test$1");

if (TEST_DATABASE_URL === original) {
  throw new Error("Não consegui derivar a URL do banco de teste a partir de DATABASE_URL.");
}

process.env.DATABASE_URL = TEST_DATABASE_URL;
// O pool do teste é pequeno de propósito: se algum caminho esquecer de
// devolver a conexão, o teste trava rápido em vez de mascarar o vazamento.
process.env.CR_DB_POOL_MAX = "3";

/**
 * Um arquivo de teste de cada vez.
 *
 * `node --test` roda os arquivos em processos paralelos, e todos apontam para
 * o mesmo `canaa_test`. Cada arquivo de fluxo começa com um `truncate` e monta
 * as próprias fixtures — em paralelo, um apaga o cenário do outro no meio da
 * rodada, e parceiros criados aqui aparecem no matching de lá. Daí o
 * `--test-concurrency=1` em `package.json`: é a serialização que torna o
 * `truncate` no início de cada arquivo uma garantia de verdade.
 *
 * O caminho alternativo seria um banco por arquivo. Não vale o preço enquanto
 * a suíte inteira roda em menos de um minuto.
 */
