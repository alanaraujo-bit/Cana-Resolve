/**
 * A administração comercial, pela linha de comando.
 *
 *   npm run comercial -- situacao
 *   npm run comercial -- aprovar PA-0002 eletrica
 *   npm run comercial -- pagar PA-0002 pix-2026-09-10-001
 *   npm run comercial -- abrir 2026-10-01T03:00:00Z
 *   npm run comercial -- historia PA-0002
 *   npm run comercial -- encerrar-vencidos
 *
 * ## Por que existe, tendo rota
 *
 * Pela mesma razão de `npm run push:teste` existir sem rota de envio: quem roda
 * isto já tem a `DATABASE_URL`, então o comando **não acrescenta superfície
 * nenhuma** — enquanto a rota administrativa precisa de um segredo, de um
 * cabeçalho e de alguém cuidando para que os dois não vazem.
 *
 * A rota continua existindo para quando a administração for uma tela; hoje, a
 * operação é uma pessoa com um terminal, e este é o caminho mais curto e mais
 * seguro entre "o Pix caiu" e "a vaga está reservada".
 *
 * ## O que ele não faz
 *
 * Não inventa data de lançamento, não marca ninguém como pago sem referência
 * do pagamento real, e não escreve `beta_started_at` a não ser pelo `abrir` —
 * que é o único momento em que os 90 dias podem começar.
 */
import { readFileSync } from "node:fs";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "../lib/db/schema";

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
  ssl: /@(localhost|127\.0\.0\.1)[:/]/.test(process.env.DATABASE_URL)
    ? false
    : { rejectUnauthorized: false },
});
const db = drizzle(pool, { schema, casing: "snake_case" });

/** Os módulos de serviço são carregados só depois do `DATABASE_URL`. */
async function servicos() {
  return {
    adesao: await import("../lib/comercial/adesao"),
    catalogo: await import("../lib/comercial/catalogo"),
    livro: await import("../lib/comercial/livro"),
    operacao: await import("../lib/comercial/operacao"),
    situacao: await import("../lib/comercial/situacao"),
  };
}

async function parceiroPorCodigo(codigo: string): Promise<{ id: string; name: string }> {
  const [linha] = await db
    .select({ id: schema.partners.id, name: schema.partners.name })
    .from(schema.partners)
    .where(eq(schema.partners.code, codigo.trim().toUpperCase()))
    .limit(1);
  if (!linha) {
    console.error(`Nenhum parceiro com o código ${codigo}.`);
    process.exit(1);
  }
  return linha;
}

const dinheiro = (centavos: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(centavos / 100);

async function cmdSituacao() {
  const { operacao, catalogo } = await servicos();

  const abertura = await operacao.inicioDaOperacao();
  console.log("");
  console.log(
    `  Operação: ${abertura ? abertura.toISOString() : "ainda não definida — e nada a inventa"}`,
  );

  const ofertas = await catalogo.ofertasAtivas();
  console.log(`  Ofertas ativas: ${ofertas.length}`);
  for (const o of ofertas) {
    console.log(
      `    ${o.codigo} v${o.versao} — ${dinheiro(o.precoCentavos)} / ${o.periodoDias ?? "—"} dias`,
    );
  }

  const linhas = await db.execute<{
    code: string;
    name: string;
    status: string;
    paid_at: Date | null;
    beta_started_at: Date | null;
    beta_ends_at: Date | null;
  }>(sql`
    select p.code, p.name, f.status, f.paid_at, f.beta_started_at, f.beta_ends_at
      from founder_enrollments f
      join partners p on p.id = f.partner_id
     order by p.code
  `);

  const registros =
    ((linhas as unknown as { rows?: unknown[] }).rows ?? (linhas as unknown as unknown[])) || [];
  console.log(`  Adesões: ${(registros as unknown[]).length}`);
  console.log("");
  if ((registros as unknown[]).length > 0) console.table(registros);
}

async function cmdAprovar(codigo: string, categoria?: string) {
  const { adesao } = await servicos();
  const parceiro = await parceiroPorCodigo(codigo);
  const linha = await adesao.aprovarParaOBeta(parceiro.id, categoria ?? null);
  console.log(`  ${parceiro.name}: ${linha.status}${categoria ? ` (${categoria})` : ""}`);
}

async function cmdPagar(codigo: string, referencia: string, valor?: string) {
  const { adesao, catalogo } = await servicos();
  const parceiro = await parceiroPorCodigo(codigo);

  const oferta = await catalogo.ofertaAtiva("beta-fundador");
  if (!oferta) {
    console.error("Não há oferta ativa do Beta Fundador no catálogo.");
    process.exit(1);
  }

  const centavos = valor ? Math.round(Number(valor) * 100) : oferta.precoCentavos;
  if (!Number.isInteger(centavos) || centavos <= 0) {
    console.error(`Valor inválido: ${valor}`);
    process.exit(1);
  }

  const r = await adesao.confirmarPagamento({
    partnerId: parceiro.id,
    provedor: "administrativo",
    ambiente: "producao",
    idNoProvedor: `pagamento:${referencia}`,
    valorCentavos: centavos,
    moeda: oferta.moeda,
    ofertaCodigo: oferta.codigo,
    ofertaVersao: oferta.versao,
    em: new Date(),
    descricao: `${oferta.nome} — Beta de ${oferta.periodoDias ?? 90} dias`,
    referencia,
  });

  console.log("");
  if (!r.novo) {
    console.log(`  Este pagamento já tinha sido registrado. Estado: ${r.estado}.`);
  } else if (r.estado === "reservado") {
    console.log(`  ${parceiro.name}: vaga reservada.`);
    console.log("  Os 90 dias começam quando a operação for aberta aos moradores.");
  } else {
    console.log(`  ${parceiro.name}: Beta ativo desde ${r.betaInicio?.toISOString()}.`);
  }
  console.log("");
}

async function cmdAbrir(quando: string) {
  const { adesao, operacao } = await servicos();
  const em = new Date(quando);
  if (Number.isNaN(em.getTime())) {
    console.error(`"${quando}" não é uma data. Use ISO 8601: 2026-10-01T03:00:00Z`);
    process.exit(1);
  }

  const gravada = await operacao.definirInicioDaOperacao(em);
  if (!gravada.gravada) {
    console.log("");
    console.log(`  A operação já tinha data: ${gravada.jaHavia?.toISOString()}.`);
    console.log("  Mudá-la mexeria no fim do Beta de todo mundo — não é um comando de rotina.");
    console.log("");
  }

  const r = await adesao.abrirOperacao(em);
  console.log("");
  console.log(
    r.novo
      ? `  Operação aberta em ${em.toISOString()}. ${r.ativados} Fundador(es) começaram o Beta.`
      : "  A abertura desta data já tinha sido processada. Nada mudou.",
  );
  console.log("");
}

async function cmdHistoria(codigo: string) {
  const { livro, situacao } = await servicos();
  const parceiro = await parceiroPorCodigo(codigo);

  const s = await situacao.situacaoDoParceiro(parceiro.id);
  console.log("");
  console.log(`  ${parceiro.name}`);
  console.log(`  Fundador: ${s.fundador ? "sim" : "não"}`);
  console.log(`  Adesão: ${s.adesao?.estado ?? "nenhuma"}`);
  console.log(`  Beta: ${s.adesao?.beta.fase ?? "—"}, restam ${s.adesao?.beta.diasRestantes ?? "—"}`);
  console.log(`  Acesso: ${s.acesso.origem} — ${s.acesso.justificativa}`);
  console.log("");

  const eventos = await livro.historiaDoParceiro(parceiro.id);
  if (eventos.length > 0) console.table(eventos);
}

async function cmdEncerrar() {
  const { adesao } = await servicos();
  console.log(`  ${await adesao.encerrarBetasVencidos()} adesão(ões) encerrada(s).`);
}

const USO = [
  "uso: npm run comercial -- situacao",
  "     npm run comercial -- aprovar PA-0002 [categoria]",
  "     npm run comercial -- pagar PA-0002 <referência do pagamento> [valor em reais]",
  "     npm run comercial -- abrir 2026-10-01T03:00:00Z",
  "     npm run comercial -- historia PA-0002",
  "     npm run comercial -- encerrar-vencidos",
].join("\n");

async function main() {
  const [comando, ...resto] = process.argv.slice(2);

  switch (comando) {
    case "situacao":
      return cmdSituacao();
    case "aprovar":
      if (!resto[0]) break;
      return cmdAprovar(resto[0], resto[1]);
    case "pagar":
      if (!resto[0] || !resto[1]) break;
      return cmdPagar(resto[0], resto[1], resto[2]);
    case "abrir":
      if (!resto[0]) break;
      return cmdAbrir(resto[0]);
    case "historia":
      if (!resto[0]) break;
      return cmdHistoria(resto[0]);
    case "encerrar-vencidos":
      return cmdEncerrar();
  }

  console.error(USO);
  process.exit(1);
}

/**
 * Duas conexões, dois fechamentos.
 *
 * Este arquivo abre um pool próprio (para as consultas diretas), e os módulos
 * de serviço abrem o deles em `lib/db/client`. Fechar só o primeiro deixa o
 * processo pendurado até o Node desistir — o comando termina, imprime o
 * resultado e **não sai**, o que num terminal parece travamento e num script de
 * automação é um `timeout`.
 */
async function encerrar() {
  await pool.end().catch(() => {});
  try {
    const { getPool } = await import("../lib/db/client");
    await getPool().end();
  } catch {
    /* o pool dos serviços só existe se algum comando os tiver usado */
  }
}

main()
  .catch((erro) => {
    console.error(erro instanceof Error ? erro.message : erro);
    process.exitCode = 1;
  })
  .finally(() => void encerrar());
