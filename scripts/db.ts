/**
 * Ferramenta de linha de comando do banco.
 *
 *   npm run db:migrate            aplica as migrações pendentes
 *   npm run db:seed               planta/atualiza o catálogo de categorias e serviços
 *   npm run db:status             mostra o que existe hoje no banco
 *
 * É propositalmente idempotente: rodar duas vezes não duplica nada.
 */
import { readFileSync } from "node:fs";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { sql } from "drizzle-orm";
import { Pool } from "pg";

import * as schema from "../lib/db/schema";
import { catalogSeed } from "../lib/domain/catalog-seed";

function loadEnv() {
  if (process.env.DATABASE_URL) return;
  try {
    for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
      const match = /^([A-Z_][A-Z0-9_]*)=(.*)$/.exec(line.trim());
      if (!match) continue;
      const [, key, raw] = match;
      if (!process.env[key]) process.env[key] = raw.replace(/^["']|["']$/g, "");
    }
  } catch {
    /* sem .env.local: as variáveis vêm do ambiente */
  }
}

loadEnv();

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL não está definida.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: /@(localhost|127\.0\.0\.1)[:/]/.test(process.env.DATABASE_URL)
    ? false
    : { rejectUnauthorized: false },
});
const db = drizzle(pool, { schema, casing: "snake_case" });

async function cmdMigrate() {
  await migrate(db, { migrationsFolder: "lib/db/migrations" });
  console.log("Migrações aplicadas.");
}

async function cmdSeed() {
  let categorias = 0;
  let servicos = 0;

  for (const category of catalogSeed) {
    await db
      .insert(schema.categories)
      .values({
        id: category.id,
        name: category.name,
        short: category.short,
        blurb: category.blurb,
        position: category.position,
      })
      // O nome e o texto podem ser reescritos aqui; `active` não, porque
      // desativar uma categoria é uma decisão da operação, não da semente.
      .onConflictDoUpdate({
        target: schema.categories.id,
        set: {
          name: category.name,
          short: category.short,
          blurb: category.blurb,
          position: category.position,
          updatedAt: new Date(),
        },
      });
    categorias += 1;

    for (const service of category.services) {
      await db
        .insert(schema.services)
        .values({
          categoryId: category.id,
          slug: service.slug,
          name: service.name,
          position: service.position,
        })
        .onConflictDoNothing({
          target: [schema.services.categoryId, schema.services.slug],
        });
      servicos += 1;
    }
  }

  console.log(`Catálogo pronto: ${categorias} categorias, ${servicos} serviços.`);
}

async function cmdStatus() {
  // Só o que a landing alimenta ou consulta. As outras tabelas continuam de
  // pé, com o histórico do Operations dentro, mas nada aqui escreve nelas.
  const tabelas = [
    ["categorias", schema.categories],
    ["serviços", schema.services],
    ["prospects", schema.prospects],
    ["cadastros", schema.partnerApplications],
    ["solicitações", schema.serviceRequests],
    ["atividades", schema.activities],
  ] as const;

  for (const [label, table] of tabelas) {
    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(table);
    console.log(`${label.padEnd(16)} ${n}`);
  }
}

const [command] = process.argv.slice(2);

const commands: Record<string, () => Promise<void>> = {
  migrate: cmdMigrate,
  seed: cmdSeed,
  status: cmdStatus,
  setup: async () => {
    await cmdMigrate();
    await cmdSeed();
  },
};

const run = commands[command ?? ""];
if (!run) {
  console.error(`Comandos: ${Object.keys(commands).join(", ")}`);
  process.exit(1);
}

run()
  .then(() => pool.end())
  .catch(async (error) => {
    console.error(error);
    await pool.end();
    process.exit(1);
  });
