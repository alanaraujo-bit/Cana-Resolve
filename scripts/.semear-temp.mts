/**
 * Um parceiro com senha, no banco de **teste**. Nunca no de produção.
 *
 * Serve para provar o percurso inteiro contra uma API de verdade: entrar,
 * guardar a sessão, conferir na abertura, trocar a senha e sair.
 */
import "../tests/setup-db";

import { migrate } from "drizzle-orm/node-postgres/migrator";
import { sql } from "drizzle-orm";

import { db, getPool } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";
import { definirSenha } from "@/lib/auth/parceiro";

await migrate(db, { migrationsFolder: "lib/db/migrations" });

await db.execute(sql`delete from partner_sessions`);
await db.execute(sql`delete from partners where code = 'PA-9900'`);

const [p] = await db
  .insert(schema.partners)
  .values({
    code: "PA-9900",
    name: "João Batista",
    email: "joao@teste.local",
    whatsapp: "5594980009900",
    status: "ativo",
  })
  .returning({ id: schema.partners.id });

await definirSenha(p.id, "senha-de-teste-1");
console.log("parceiro pronto: joao@teste.local / senha-de-teste-1");
await getPool().end();
