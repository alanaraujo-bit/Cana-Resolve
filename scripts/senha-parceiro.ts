/**
 * Credencial de parceiro, pela linha de comando.
 *
 *   npm run parceiro:senha -- listar
 *   npm run parceiro:senha -- definir PA-0002 parceiro@exemplo.com
 *
 * Existe porque ainda não há tela de "criar senha": o cadastro público não pede
 * senha, e alguém precisa dar a primeira. Enquanto essa tela não existir, é por
 * aqui que um parceiro real ganha acesso real.
 *
 * A senha **não** é passada como argumento: argumento fica no histórico do
 * terminal e na lista de processos. Ela é sorteada aqui e mostrada uma vez.
 */
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "../lib/db/schema";
import { gerarHash } from "../lib/auth/senha";

function carregarEnv() {
  if (process.env.DATABASE_URL) return;
  try {
    for (const linha of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
      const m = /^([A-Z_][A-Z0-9_]*)=(.*)$/.exec(linha.trim());
      if (!m) continue;
      const [, chave, cru] = m;
      if (!process.env[chave!]) process.env[chave!] = cru!.replace(/^["']|["']$/g, "");
    }
  } catch {
    /* sem .env.local: as variáveis vêm do ambiente */
  }
}

carregarEnv();

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL não está definida.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const db = drizzle(pool, { schema, casing: "snake_case" });

/**
 * Senha sorteada, legível de viva voz.
 *
 * Sem l/I/1 e sem O/0, que ninguém consegue ditar por telefone sem soletrar. O
 * alfabeto é menor, então o comprimento compensa: 4 blocos de 4 dão folga de
 * sobra contra tentativa em massa, ainda mais com o freio da rota.
 */
function sortearSenha(): string {
  const alfabeto = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(16);
  const letras = [...bytes].map((b) => alfabeto[b % alfabeto.length]).join("");
  return letras.match(/.{1,4}/g)!.join("-");
}

async function listar() {
  const linhas = await db.execute<{
    code: string;
    name: string;
    email: string | null;
    tem_senha: boolean;
  }>(sql`
    select code, name, email, (password_hash is not null) as tem_senha
    from partners
    order by code
  `);

  const registros = (linhas as unknown as { rows?: unknown[] }).rows ?? linhas;
  console.table(registros);
}

async function definir(codigo: string, email: string) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    console.error(`"${email}" não parece um e-mail.`);
    process.exit(1);
  }

  const senha = sortearSenha();
  const hash = await gerarHash(senha);

  const resultado = await db.execute(sql`
    update partners
       set email = ${email.trim().toLowerCase()},
           password_hash = ${hash},
           password_set_at = now(),
           updated_at = now()
     where code = ${codigo.trim().toUpperCase()}
    returning code, name
  `);

  const linhas =
    ((resultado as unknown as { rows?: { code: string; name: string }[] }).rows ??
      (resultado as unknown as { code: string; name: string }[])) || [];

  if (linhas.length === 0) {
    console.error(`Nenhum parceiro com o código ${codigo}.`);
    process.exit(1);
  }

  const parceiro = linhas[0]!;
  console.log("");
  console.log(`  ${parceiro.name} (${parceiro.code})`);
  console.log(`  e-mail: ${email.trim().toLowerCase()}`);
  console.log(`  senha:  ${senha}`);
  console.log("");
  console.log("  Anote agora: a senha não fica guardada em lugar nenhum,");
  console.log("  só o hash dela. Para trocar, rode este comando de novo.");
  console.log("");
}

async function main() {
  const [comando, ...resto] = process.argv.slice(2);

  if (comando === "listar") {
    await listar();
    return;
  }

  if (comando === "definir") {
    const [codigo, email] = resto;
    if (!codigo || !email) {
      console.error("uso: npm run parceiro:senha -- definir PA-0002 parceiro@exemplo.com");
      process.exit(1);
    }
    await definir(codigo, email);
    return;
  }

  console.error("uso: npm run parceiro:senha -- listar");
  console.error("     npm run parceiro:senha -- definir PA-0002 parceiro@exemplo.com");
  process.exit(1);
}

main()
  .catch((erro) => {
    console.error(erro instanceof Error ? erro.message : erro);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
