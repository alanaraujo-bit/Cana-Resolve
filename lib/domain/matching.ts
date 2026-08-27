import "server-only";

import { inArray, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { partners } from "@/lib/db/schema";
import { opportunityLive, partnerDistributable } from "./states";

/**
 * Matching assistido.
 *
 * Três compromissos governam este arquivo:
 *
 * 1. **Nada de motor opaco.** Cada candidato volta com a lista de motivos pelos
 *    quais está ali e, quando é o caso, com a ressalva que o desqualifica.
 *    Quem encaminha vê o raciocínio inteiro e decide — a máquina ordena, ela
 *    não escolhe.
 *
 * 2. **Quem paga mais não passa na frente.** A ordenação usa compatibilidade
 *    com o problema do morador e distribuição justa. Nenhum sinal comercial —
 *    plano, valor pago, condição de Fundador — entra na conta. Se um dia
 *    existirem planos, o benefício deles precisa ser outro; não este.
 *
 * 3. **Sem inventar sinal que não temos.** Tempo de resposta, taxa de
 *    fechamento e reputação estão fora porque ainda não existem dados reais
 *    para eles. O lugar de entrarem é a pontuação em `findCandidates`, quando
 *    existirem.
 */

export type Candidato = {
  id: string;
  code: string;
  name: string;
  whatsapp: string;
  founder: boolean;
  status: string;
  servesWholeCity: boolean;
  neighborhoods: string[];
  /** Compatibilidade com este pedido, de 0 a 100. */
  score: number;
  /** Por que ele apareceu. Em linguagem de operação, não de algoritmo. */
  motivos: string[];
  /** O que pesa contra. Não impede o encaminhamento; informa a decisão. */
  ressalvas: string[];
  /** Já recebeu este pedido. */
  jaEncaminhado: boolean;
  /** Encaminhamentos vivos agora — a carga atual dele. */
  cargaAtual: number;
  /** Encaminhamentos nos últimos 30 dias — a base da distribuição justa. */
  recebidos30d: number;
};

const TRINTA_DIAS = 30 * 86_400_000;

export async function findCandidates(input: {
  requestId: string;
  categoryId: string | null;
  serviceId: string | null;
  neighborhood: string | null;
}): Promise<Candidato[]> {
  const desde = new Date(Date.now() - TRINTA_DIAS);
  // Lista literal para o `in` do SQL: um array cru viraria um parâmetro só.
  const vivos = sql`(${sql.join(opportunityLive.map((s) => sql`${s}`), sql`, `)})`;

  const linhas = await db
    .select({
      id: partners.id,
      code: partners.code,
      name: partners.name,
      whatsapp: partners.whatsapp,
      founder: partners.founder,
      status: partners.status,
      servesWholeCity: partners.servesWholeCity,
      neighborhoods: partners.neighborhoods,
      categoriaPrincipal: sql<boolean>`coalesce((
        select pc.is_primary from partner_categories pc
        where pc.partner_id = partners.id
          and pc.category_id = ${input.categoryId ?? ""}
        limit 1
      ), false)`,
      temCategoria: sql<boolean>`exists (
        select 1 from partner_categories pc
        where pc.partner_id = partners.id
          and pc.category_id = ${input.categoryId ?? ""}
      )`,
      temServico: input.serviceId
        ? sql<boolean>`exists (
            select 1 from partner_services ps
            where ps.partner_id = partners.id
              and ps.service_id = ${input.serviceId}
          )`
        : sql<boolean>`false`,
      jaEncaminhado: sql<boolean>`exists (
        select 1 from opportunities o
        where o.partner_id = partners.id
          and o.request_id = ${input.requestId}
      )`,
      cargaAtual: sql<number>`(
        select count(*)::int from opportunities o
        where o.partner_id = partners.id
          and o.status in ${vivos}
      )`,
      recebidos30d: sql<number>`(
        select count(*)::int from opportunities o
        where o.partner_id = partners.id
          and o.created_at >= ${desde}
      )`,
    })
    .from(partners)
    .where(sql`${partners.status} <> 'encerrado'`);

  const maiorCarga = Math.max(1, ...linhas.map((l) => l.recebidos30d));

  const candidatos = linhas.map((l): Candidato => {
    const motivos: string[] = [];
    const ressalvas: string[] = [];
    let score = 0;

    if (l.temServico) {
      score += 45;
      motivos.push("Faz exatamente esse serviço");
    } else if (l.categoriaPrincipal) {
      score += 35;
      motivos.push("É a categoria principal dele");
    } else if (l.temCategoria) {
      score += 25;
      motivos.push("Atende essa categoria");
    } else if (input.categoryId) {
      ressalvas.push("Não tem essa categoria no perfil");
    }

    const bairro = input.neighborhood?.trim().toLowerCase();
    if (l.servesWholeCity) {
      score += 15;
      motivos.push("Atende Canaã inteira");
    } else if (
      bairro &&
      l.neighborhoods.some((n) => n.trim().toLowerCase() === bairro)
    ) {
      score += 18;
      motivos.push(`Atende ${input.neighborhood}`);
    } else if (bairro) {
      ressalvas.push(`Não informou atendimento em ${input.neighborhood}`);
    }

    if ((partnerDistributable as string[]).includes(l.status)) {
      score += 20;
    } else if (l.status === "aguardando_lancamento") {
      ressalvas.push("Ainda aguardando o lançamento da operação");
    } else {
      ressalvas.push(
        l.status === "pausado" ? "Pediu para pausar os recebimentos" : "Está fora da distribuição",
      );
    }

    // Distribuição justa: quem recebeu menos nos últimos 30 dias sobe. Vale
    // até 20 pontos — o suficiente para desempatar entre iguais, nunca para
    // colocar alguém incompatível na frente de alguém compatível.
    const folga = 1 - l.recebidos30d / maiorCarga;
    score += Math.round(folga * 20);
    if (l.recebidos30d === 0) {
      motivos.push("Ainda não recebeu nada nos últimos 30 dias");
    } else if (folga < 0.25) {
      ressalvas.push(`Já recebeu ${l.recebidos30d} pedidos em 30 dias`);
    }

    if (l.jaEncaminhado) {
      ressalvas.push("Já recebeu este pedido");
    }

    return {
      id: l.id,
      code: l.code,
      name: l.name,
      whatsapp: l.whatsapp,
      founder: l.founder,
      status: l.status,
      servesWholeCity: l.servesWholeCity,
      neighborhoods: l.neighborhoods,
      score: Math.max(0, Math.min(100, score)),
      motivos,
      ressalvas,
      jaEncaminhado: l.jaEncaminhado,
      cargaAtual: l.cargaAtual,
      recebidos30d: l.recebidos30d,
    };
  });

  return candidatos.sort((a, b) => {
    // Quem já recebeu vai para o fim: continua visível, mas fora da escolha.
    if (a.jaEncaminhado !== b.jaEncaminhado) return a.jaEncaminhado ? 1 : -1;
    if (b.score !== a.score) return b.score - a.score;
    return a.name.localeCompare(b.name, "pt-BR");
  });
}

/** Quantos parceiros existem hoje, para separar "rede vazia" de "sem match". */
export async function networkSize() {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(partners)
    .where(inArray(partners.status, partnerDistributable));
  return row?.n ?? 0;
}
