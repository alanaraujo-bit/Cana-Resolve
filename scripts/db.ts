/**
 * Ferramenta de linha de comando do banco.
 *
 *   npm run db:migrate            aplica as migrações pendentes
 *   npm run db:seed               planta/atualiza o catálogo de categorias e serviços
 *   npm run db:operator -- <email> <nome> [senha]   cria ou atualiza um operador
 *   npm run db:status             mostra o que existe hoje no banco
 *
 * É propositalmente idempotente: rodar duas vezes não duplica nada.
 */
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { sql } from "drizzle-orm";
import { Pool } from "pg";

import * as schema from "../lib/db/schema";
import { catalogSeed } from "../lib/domain/catalog-seed";
import { hashPassword } from "../lib/auth/password";

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

async function cmdOperator(args: string[]) {
  const [email, name, senhaArg] = args;
  if (!email || !name) {
    console.error('Uso: npm run db:operator -- <email> "<nome>" [senha]');
    process.exit(1);
  }

  const senha = senhaArg || randomBytes(9).toString("base64url");
  const passwordHash = await hashPassword(senha);

  const existing = await db
    .select({ id: schema.operators.id })
    .from(schema.operators)
    .where(sql`lower(${schema.operators.email}) = lower(${email})`)
    .limit(1);

  if (existing[0]) {
    await db
      .update(schema.operators)
      .set({ name, passwordHash, active: true, updatedAt: new Date() })
      .where(sql`${schema.operators.id} = ${existing[0].id}`);
    console.log(`Operador atualizado: ${email}`);
  } else {
    const total = await db.select({ n: sql<number>`count(*)::int` }).from(schema.operators);
    await db.insert(schema.operators).values({
      email,
      name,
      passwordHash,
      // O primeiro operador é o dono da operação.
      role: total[0].n === 0 ? "owner" : "operator",
    });
    console.log(`Operador criado: ${email}`);
  }

  if (!senhaArg) console.log(`Senha gerada: ${senha}`);
}

async function cmdStatus() {
  const tabelas = [
    ["categorias", schema.categories],
    ["serviços", schema.services],
    ["operadores", schema.operators],
    ["prospects", schema.prospects],
    ["cadastros", schema.partnerApplications],
    ["parceiros", schema.partners],
    ["solicitações", schema.serviceRequests],
    ["oportunidades", schema.opportunities],
    ["atividades", schema.activities],
  ] as const;

  for (const [label, table] of tabelas) {
    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(table);
    console.log(`${label.padEnd(16)} ${n}`);
  }
}

const [command, ...rest] = process.argv.slice(2);

const commands: Record<string, () => Promise<void>> = {
  migrate: cmdMigrate,
  seed: cmdSeed,
  operator: () => cmdOperator(rest),
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
