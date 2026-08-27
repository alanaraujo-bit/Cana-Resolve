import "server-only";

import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

/**
 * Conexão com o Postgres.
 *
 * Driver: `node-postgres`. Foi escolhido em vez do driver HTTP porque o
 * domínio depende de transações — toda mudança de estado grava, no mesmo
 * commit, o registro e a linha de histórico. Sem transação, a história do
 * sistema poderia divergir dos dados sem ninguém perceber.
 *
 * O pool é guardado em `globalThis` porque, em desenvolvimento, o Next recarrega
 * os módulos a cada alteração e um pool novo por recarga esgotaria as conexões.
 */

declare global {
  var __crPool: Pool | undefined;
}

export type Db = NodePgDatabase<typeof schema>;

function connectionString() {
  return process.env.DATABASE_URL?.trim() || "";
}

/** Se o banco não está configurado, o produto precisa degradar — não quebrar. */
export function isDatabaseConfigured() {
  return connectionString().length > 0;
}

function createPool() {
  const url = connectionString();
  if (!url) {
    throw new Error(
      "DATABASE_URL não está definida. O Operations precisa do banco; " +
        "as páginas públicas continuam funcionando sem ele.",
    );
  }

  const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);

  return new Pool({
    connectionString: url,
    // O proxy TCP da Railway serve um certificado próprio: a conexão continua
    // criptografada, mas a cadeia não é verificável a partir daqui.
    ssl: local ? false : { rejectUnauthorized: false },
    // O banco fica em outro país: abrir conexão custa caro e vale a pena
    // manter algumas de pé. O limite existe porque o plano do Postgres tem
    // teto — e estourá-lo derruba a operação inteira, não só uma página.
    max: Number(process.env.CR_DB_POOL_MAX ?? 10),
    idleTimeoutMillis: 60_000,
    connectionTimeoutMillis: 15_000,
    // Mantém a conexão viva através do proxy TCP, que corta o que fica quieto.
    keepAlive: true,
  });
}

export function getPool() {
  if (!globalThis.__crPool) {
    const pool = createPool();
    // Sem este listener, um erro em conexão ociosa derruba o processo.
    pool.on("error", (err) => {
      console.error("[db] erro em conexão ociosa", err.message);
    });
    globalThis.__crPool = pool;
  }
  return globalThis.__crPool;
}

let cached: Db | undefined;

export function getDb(): Db {
  if (!cached) cached = drizzle(getPool(), { schema, casing: "snake_case" });
  return cached;
}

/**
 * Acesso preguiçoso: importar este módulo não abre conexão nenhuma. A conexão
 * só nasce na primeira consulta de verdade.
 */
export const db: Db = new Proxy({} as Db, {
  get(_target, prop) {
    const real = getDb() as unknown as Record<string | symbol, unknown>;
    const value = real[prop];
    // Métodos vão amarrados ao objeto real: partes internas do Drizzle usam
    // campos privados, que não sobrevivem a uma chamada com `this` no proxy.
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export { schema };
