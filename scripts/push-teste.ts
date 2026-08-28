/**
 * Manda um push de teste para um parceiro de verdade.
 *
 *     npm run push:teste -- aparelhos    alice@exemplo.com
 *     npm run push:teste -- oportunidade alice@exemplo.com o1
 *     npm run push:teste -- atualizacao  alice@exemplo.com o1 cancelada
 *     npm run push:teste -- seguranca    alice@exemplo.com
 *
 * **Por que uma ferramenta de linha de comando, e não uma rota.** O §110 pede
 * um mecanismo de teste; o §117 proíbe deixar aberto um jeito de qualquer um
 * mandar push para os usuários. Uma rota HTTP precisaria de autenticação de
 * operador, freio, e ainda assim seria uma superfície nova exposta na
 * internet. Um script que roda na máquina de quem já tem a `DATABASE_URL` não
 * tem superfície nenhuma — o §117 fica atendido por construção, e não por
 * vigilância.
 *
 * Ele não vai para o pacote do aplicativo, não tem tela e não guarda segredo:
 * usa as mesmas variáveis do `.env.local` que o resto do projeto.
 */
import { readFileSync } from "node:fs";

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

/* Os módulos do servidor entram depois do ambiente estar de pé — o pool é
   preguiçoso, mas a ordem aqui é o que garante isso. */
import { sql } from "drizzle-orm";

import { db, getPool } from "../lib/db/client";
import { partners } from "../lib/db/schema";
import { destinosDoParceiro, dispositivosDoParceiro } from "../lib/push/dispositivos";
import { enviar, esquecerEnvios } from "../lib/push/envio";
import {
  avisoDeAtualizacao,
  avisoDeNovaOportunidade,
  avisoDeSenhaAlterada,
  type MotivoDeAtualizacao,
} from "../lib/push/mensagens";

const MOTIVOS: MotivoDeAtualizacao[] = [
  "cancelada",
  "encerrada-pelo-sistema",
  "acao-necessaria",
];

function ajuda(): never {
  console.error(
    [
      "",
      "  Push de teste do Canaã Resolve",
      "",
      "  npm run push:teste -- aparelhos    <email>",
      "  npm run push:teste -- oportunidade <email> [id] [categoria] [bairro]",
      `  npm run push:teste -- atualizacao  <email> <id> <${MOTIVOS.join("|")}>`,
      "  npm run push:teste -- seguranca    <email>",
      "",
      "  O e-mail é o de entrada do parceiro no aplicativo.",
      "  Veja quem existe com: npm run parceiro:senha -- listar",
      "",
    ].join("\n"),
  );
  process.exit(1);
}

async function acharParceiro(alvo: string): Promise<{ id: string; nome: string }> {
  const [linha] = await db
    .select({ id: partners.id, nome: partners.name })
    .from(partners)
    .where(sql`lower(${partners.email}) = ${alvo.trim().toLowerCase()}`)
    .limit(1);

  if (!linha) {
    console.error(`\n  Nenhum parceiro com o e-mail "${alvo}".\n`);
    process.exit(1);
  }
  return linha;
}

/** O relatório de um envio. Nunca imprime token (§96). */
function relatar(r: Awaited<ReturnType<typeof enviar>>) {
  if (r.duplicado) {
    console.log("\n  Nada enviado: este mesmo evento já foi enviado há pouco (deduplicação §48).");
    console.log("  É o comportamento correto — use outro id para mandar de novo.\n");
    return;
  }
  if (r.destinos === 0) {
    console.log("\n  Este parceiro não tem nenhum aparelho registrado.");
    console.log("  Entre no aplicativo com a conta dele e ative as notificações.\n");
    return;
  }

  console.log(
    `\n  Aparelhos: ${r.destinos}   aceitos: ${r.aceitos}   invalidados: ${r.invalidados}`,
  );
  if (r.recusas.length > 0) console.log(`  Recusas: ${r.recusas.join(", ")}`);
  console.log("\n  Aceito pelo provedor não é visto pela pessoa: são coisas diferentes (§94).\n");
}

async function main() {
  const [comando, email, ...resto] = process.argv.slice(2);
  if (!comando || !email) ajuda();

  esquecerEnvios();
  const parceiro = await acharParceiro(email);
  console.log(`\n  Parceiro: ${parceiro.nome}`);

  switch (comando) {
    case "aparelhos": {
      const lista = await dispositivosDoParceiro(parceiro.id);
      if (lista.length === 0) {
        console.log("\n  Nenhum aparelho registrado para receber avisos.\n");
        return;
      }
      console.log(`\n  ${lista.length} aparelho(s) recebendo:\n`);
      for (const d of lista) {
        console.log(`  · ${d.platform.padEnd(8)} ${d.descricao ?? "sem descrição"}`);
        console.log(`    registrado ${d.registradoEm}   visto ${d.vistoEm}`);
      }
      console.log(`\n  Endereços de entrega ativos: ${(await destinosDoParceiro(parceiro.id)).length}\n`);
      return;
    }

    case "oportunidade": {
      const [id = "o1", categoria = "Ar-condicionado", regiao = "Novo Horizonte"] = resto;
      const aviso = avisoDeNovaOportunidade({
        oportunidadeId: id,
        categoria,
        regiao,
        partnerId: parceiro.id,
      });
      console.log(`  Enviando: "${aviso.titulo}" — "${aviso.corpo}"`);
      console.log(`  Ao tocar, abre: ${aviso.carga.destino}`);
      relatar(await enviar(aviso, 1));
      return;
    }

    case "atualizacao": {
      const [id, motivo] = resto;
      if (!id || !motivo) ajuda();
      if (!MOTIVOS.includes(motivo as MotivoDeAtualizacao)) {
        console.error(`\n  Motivo inválido. Use um de: ${MOTIVOS.join(", ")}\n`);
        process.exit(1);
      }
      const aviso = avisoDeAtualizacao({
        oportunidadeId: id,
        categoria: "Ar-condicionado",
        motivo: motivo as MotivoDeAtualizacao,
        partnerId: parceiro.id,
      });
      console.log(`  Enviando: "${aviso.titulo}" — "${aviso.corpo}"`);
      relatar(await enviar(aviso));
      return;
    }

    case "seguranca": {
      const aviso = avisoDeSenhaAlterada({ partnerId: parceiro.id });
      console.log(`  Enviando: "${aviso.titulo}" — "${aviso.corpo}"`);
      relatar(await enviar(aviso));
      return;
    }

    default:
      ajuda();
  }
}

main()
  .catch((erro) => {
    console.error(erro instanceof Error ? erro.message : erro);
    process.exitCode = 1;
  })
  .finally(() => getPool().end());
