/**
 * Eventos financeiros — idempotência, auditoria e reconciliação.
 *
 * Três problemas moram aqui, e os três são do tipo que só aparece em produção:
 *
 * **1. O mesmo evento chega duas vezes** (§51). Toda loja e todo gateway
 * reentrega o que acha que não foi confirmado. Uma compra que chega duas vezes
 * não pode virar duas adesões, dois períodos ou duas cobranças no histórico. A
 * defesa não é um `if` na rota — é uma **chave** e um índice único no banco.
 * Um `if` tem janela; um índice único não.
 *
 * **2. Não se sabe por que alguém está ativo** (§113, §114). Um estado
 * sobrescrito não conta história. Por isso os eventos são acrescentados, nunca
 * atualizados, e o estado atual é o que se lê ao final da fila.
 *
 * **3. As três pontas discordam** (§52). Loja diz ativo, servidor diz expirado,
 * aplicativo mostra cancelado. `reconciliar` existe para que essa divergência
 * seja um resultado nomeado, e não uma surpresa que ninguém detecta.
 */

import { createHash } from "node:crypto";

import type { EstadoDoPagamento } from "./estados";

/* -------------------------------------------------------------------------- */
/*  A taxonomia                                                               */
/* -------------------------------------------------------------------------- */

/**
 * O que pode acontecer com dinheiro.
 *
 * A lista cobre o que as lojas emitem (§50) mais o que a operação manual
 * produz. Ela não cobre o que ninguém decidiu ainda — não há `upgrade`,
 * `downgrade` nem `troca_de_plano`, porque não há plano para trocar.
 */
export type TipoDeEvento =
  | "compra"
  | "renovacao"
  | "cancelamento"
  | "reembolso"
  | "contestacao"
  | "expiracao"
  | "falha_de_cobranca"
  /** A administração registrou uma ativação legítima feita fora do app (§70). */
  | "ativacao_administrativa"
  /** A operação para moradores foi aberta. É o que dispara os 90 dias (§155). */
  | "inicio_da_operacao";

export const TIPOS_DE_EVENTO: TipoDeEvento[] = [
  "compra",
  "renovacao",
  "cancelamento",
  "reembolso",
  "contestacao",
  "expiracao",
  "falha_de_cobranca",
  "ativacao_administrativa",
  "inicio_da_operacao",
];

/** Quem originou o evento. `administrativo` é um provedor legítimo (§46). */
export type Provedor = "apple" | "google" | "administrativo" | "alternativo";

export const PROVEDORES: Provedor[] = ["apple", "google", "administrativo", "alternativo"];

/**
 * Sandbox e produção nunca se misturam (§148, §149).
 *
 * Um evento de sandbox que caia na fila de produção concede acesso pago por
 * dinheiro que não existe. Por isso o ambiente é parte da chave de
 * idempotência: o mesmo identificador nos dois ambientes são dois eventos.
 */
export type Ambiente = "sandbox" | "producao";

export type EventoFinanceiro = {
  provedor: Provedor;
  ambiente: Ambiente;
  /** O identificador que o provedor deu a **este** evento. */
  idNoProvedor: string;
  tipo: TipoDeEvento;
  /** Quando o provedor diz que aconteceu. */
  em: Date;
  /** A quem pertence. `null` só enquanto o vínculo não foi resolvido. */
  parceiroId: string | null;
  valorCentavos: number | null;
  moeda: string | null;
  ofertaCodigo: string | null;
  ofertaVersao: number | null;
};

/* -------------------------------------------------------------------------- */
/*  Idempotência                                                              */
/* -------------------------------------------------------------------------- */

/**
 * A chave que torna um evento único.
 *
 * Três partes, e cada uma resolve um jeito diferente de duplicar: o provedor
 * (dois provedores podem usar o mesmo número), o ambiente (sandbox e produção
 * emitem identificadores no mesmo espaço) e o identificador do evento.
 *
 * O resultado é um hash e não a concatenação crua, por um motivo prático: o
 * identificador de uma loja pode ser longo, pode conter qualquer caractere, e
 * vira coluna indexada. Um SHA-256 em base64url tem tamanho fixo, cabe no
 * índice e não vaza formato de identificador nenhum para dentro do banco.
 */
export function chaveDoEvento(
  evento: Pick<EventoFinanceiro, "provedor" | "ambiente" | "idNoProvedor">,
): string {
  const cru = `${evento.provedor}:${evento.ambiente}:${evento.idNoProvedor}`;
  return createHash("sha256").update(cru).digest("base64url");
}

/**
 * A chave de uma tentativa de compra iniciada pelo aplicativo (§83).
 *
 * Serve ao toque duplo: dois toques no botão produzem a mesma chave, e a
 * segunda tentativa encontra a primeira em vez de abrir uma transação nova.
 * Deriva do parceiro, da oferta e da versão — nunca de um número aleatório
 * gerado no aparelho, que seria diferente a cada toque e não protegeria nada.
 */
export function chaveDaTentativa(
  parceiroId: string,
  ofertaCodigo: string,
  ofertaVersao: number,
): string {
  return createHash("sha256")
    .update(`tentativa:${parceiroId}:${ofertaCodigo}:${ofertaVersao}`)
    .digest("base64url");
}

/* -------------------------------------------------------------------------- */
/*  Reconciliação                                                             */
/* -------------------------------------------------------------------------- */

export type Divergencia =
  /** As duas pontas concordam. */
  | "nenhuma"
  /** O provedor diz que vale; o nosso registro, que não. Corrigir para valer. */
  | "provedor-adiante"
  /** O nosso registro diz que vale; o provedor, que não. Revogar. */
  | "registro-adiante"
  /** Não deu para perguntar ao provedor. Não é divergência — é ignorância. */
  | "indeterminada";

/**
 * Compara o que o provedor diz com o que está gravado aqui.
 *
 * Devolve o **nome** do desencontro, e não a correção: aplicar a correção é
 * decisão com efeito financeiro, e ela pertence a quem tem contexto — não a
 * uma função pura. O que esta função garante é que o desencontro nunca fique
 * sem nome, que é a situação do §52.
 */
export function reconciliar(
  noProvedor: EstadoDoPagamento | null,
  noRegistro: EstadoDoPagamento,
): Divergencia {
  if (noProvedor === null) return "indeterminada";
  if (noProvedor === noRegistro) return "nenhuma";
  if (noProvedor === "aprovado") return "provedor-adiante";
  if (noRegistro === "aprovado") return "registro-adiante";
  return "nenhuma";
}

/* -------------------------------------------------------------------------- */
/*  Auditoria                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * O que pode ser registrado em log sobre um evento financeiro (§112).
 *
 * A lista é positiva — o que **pode** entrar —, e não uma lista de coisas a
 * remover. Uma lista negativa esquece o próximo campo sensível que alguém
 * acrescentar; uma lista positiva não deixa nada novo passar sem decisão.
 *
 * Fora daqui, por escrito: número de cartão, CVV, nome no cartão, token do
 * provedor, recibo cru da loja, segredo de webhook, e-mail e telefone.
 */
export function paraOLog(evento: EventoFinanceiro): Record<string, unknown> {
  return {
    provedor: evento.provedor,
    ambiente: evento.ambiente,
    tipo: evento.tipo,
    em: evento.em.toISOString(),
    // O identificador do evento é substituído pela chave: ela identifica sem
    // reproduzir o formato do provedor, e é o que aparece no banco.
    chave: chaveDoEvento(evento),
    parceiroId: evento.parceiroId,
    valorCentavos: evento.valorCentavos,
    moeda: evento.moeda,
    ofertaCodigo: evento.ofertaCodigo,
    ofertaVersao: evento.ofertaVersao,
  };
}
