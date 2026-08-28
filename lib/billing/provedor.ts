import "server-only";

import type { Ambiente, Provedor } from "@/lib/domain/comercial/eventos";

/**
 * A camada de billing — uma porta, quatro provedores, uma só lógica de acesso.
 *
 * O §47 em uma frase: **provedor confirma dinheiro, backend concede acesso.**
 * Apple, Google e um gateway alternativo são fontes de eventos financeiros; o
 * que converte um evento validado em entitlement é `lib/comercial/adesao.ts`, e
 * ele é o mesmo para os quatro. Nenhum adaptador tem permissão de escrever
 * estado comercial por conta própria — todos devolvem uma confirmação, e quem
 * a aplica é uma função só.
 *
 * ## O estado de hoje, dito sem rodeio
 *
 * Um único provedor está ligado: `administrativo`. Não é um atalho nem um
 * dublê — é o modelo comercial corrente (§70, §75): a venda acontece por
 * conversa, o parceiro é qualificado e aprovado, e a ativação é registrada pela
 * administração. Ele valida, registra evento, gera cobrança e deixa trilha de
 * auditoria como qualquer outro.
 *
 * Os outros três estão escritos como contrato e **falham fechados**. Não é
 * preguiça: é a única postura correta sem as credenciais e sem a decisão de
 * política de loja. Um adaptador que "por enquanto" aceita qualquer recibo é
 * exatamente o §49 quebrado, e o pior tipo de bug financeiro — o que só
 * aparece quando alguém descobre.
 *
 * ## Por que não há compra dentro do aplicativo nesta fase
 *
 * Quatro fatos que se somam e não deixam alternativa segura:
 *
 * 1. não há conta Apple Developer nem App Store Connect configurados, nem
 *    produtos IAP criados (`BLOCKERS.md`);
 * 2. não há Google Play Console nem produtos de assinatura;
 * 3. o processo comercial aprovado **exclui** compra indiscriminada: só quem
 *    passou por análise e aprovação vê a condição (§75, §76);
 * 4. um checkout externo dentro do app — Pix, link para o site — depende de
 *    elegibilidade em programas específicos das duas lojas, e colocá-lo sem
 *    essa confirmação é o §45 quebrado.
 *
 * O que a fase entrega, então: a arquitetura inteira pronta, o provedor real
 * de hoje funcionando de verdade, e nenhum caminho de compra não validado.
 * Ver `mobile/COMERCIAL.md`, seção "Lojas".
 */

/** Uma compra que o provedor já confirmou como válida. */
export type CompraValidada = {
  provedor: Provedor;
  ambiente: Ambiente;
  /** O identificador do evento no provedor. Vira a chave de idempotência. */
  idNoProvedor: string;
  /** Referência da compra/assinatura, quando o provedor tiver uma. */
  referencia: string | null;
  /**
   * O produto **segundo o provedor** — nunca segundo o cliente (§16).
   *
   * É por ele que se descobre a oferta, e não pelo que o aplicativo mandou.
   */
  produtoNoProvedor: string;
  valorCentavos: number;
  moeda: string;
  em: Date;
  comprovante: string | null;
};

export type FalhaDeValidacao = {
  /** Um código curto, para log. Nunca vai para a tela do profissional. */
  codigo:
    | "indisponivel"
    | "sem-credencial"
    | "recibo-invalido"
    | "produto-desconhecido"
    | "ambiente-incompativel";
  detalhe: string;
};

export type ResultadoDaValidacao =
  | { ok: true; compra: CompraValidada }
  | { ok: false; falha: FalhaDeValidacao };

/**
 * O contrato que todo provedor cumpre.
 *
 * `validar` recebe o que o cliente enviou e vai perguntar ao provedor se
 * aquilo é verdade. O que ele devolve **não** é o que o cliente disse — é o
 * que o provedor confirmou.
 */
export type AdaptadorDeBilling = {
  nome: Provedor;
  /** Está ligado neste ambiente? `false` quando falta credencial. */
  disponivel(): boolean;
  /**
   * Por que não está disponível, em uma frase técnica. Serve ao log e à área
   * de desenvolvimento; nunca à tela do profissional.
   */
  porqueIndisponivel(): string | null;
  validar(entrada: { recibo: string; ambiente: Ambiente }): Promise<ResultadoDaValidacao>;
};

/** Um adaptador que recusa tudo, com o motivo escrito. */
function fechado(nome: Provedor, motivo: string): AdaptadorDeBilling {
  return {
    nome,
    disponivel: () => false,
    porqueIndisponivel: () => motivo,
    async validar() {
      return {
        ok: false,
        falha: { codigo: "sem-credencial", detalhe: `${nome}: ${motivo}` },
      };
    },
  };
}

/**
 * App Store.
 *
 * Quando as credenciais existirem, `validar` chamará a API de verificação de
 * transações da Apple com o `transactionId` recebido, conferirá o
 * `bundleId`, o ambiente (sandbox × produção) e o produto, e devolverá o que
 * a **Apple** disser — nunca o que o aplicativo mandou. As notificações
 * servidor-a-servidor entram por `webhook.ts`, e não por aqui.
 */
export const apple = fechado(
  "apple",
  "sem conta Apple Developer, sem App Store Connect e sem produtos IAP criados — ver BLOCKERS.md",
);

/**
 * Google Play.
 *
 * Mesmo desenho: verificação do purchase token contra a API do Play, com
 * conferência de pacote, produto e ambiente, e reconhecimento da compra
 * (`acknowledge`) — que, não sendo feito no prazo, faz o Google estornar
 * sozinho.
 */
export const google = fechado(
  "google",
  "sem Google Play Console e sem produtos de assinatura criados — ver BLOCKERS.md",
);

/**
 * Provedor alternativo (Pix, cartão pelo site).
 *
 * Fechado por decisão de **política**, e não por falta de código. Tanto a
 * Apple quanto o Google mantêm programas de billing alternativo com condições
 * próprias de elegibilidade, inscrição, telas obrigatórias, reporte e taxas.
 * Enquanto essa elegibilidade não estiver confirmada por escrito, oferecer
 * este caminho dentro do aplicativo é o §45 quebrado — e a capacidade técnica
 * de fazê-lo não é permissão para fazê-lo (§68).
 */
export const alternativo = fechado(
  "alternativo",
  "billing alternativo depende de elegibilidade confirmada nos programas da Apple e do Google — ver BLOCKERS.md",
);

/**
 * O provedor de hoje: ativação registrada pela administração.
 *
 * Ele não recebe recibo de loja nenhuma — recebe uma ordem administrativa que
 * já foi autenticada pela rota. Por isso `validar` aqui não vai à rede: a
 * validação dele é a autenticação de quem chamou, e ela acontece antes.
 *
 * O que ele **não** faz, e é o §70 inteiro: não existe botão no aplicativo que
 * chegue até aqui. A porta é uma rota administrativa protegida por um segredo
 * que o aplicativo não tem e não pode ter.
 */
export const administrativo: AdaptadorDeBilling = {
  nome: "administrativo",
  disponivel: () => true,
  porqueIndisponivel: () => null,
  async validar() {
    return {
      ok: false,
      falha: {
        codigo: "indisponivel",
        detalhe:
          "A ativação administrativa não passa por validação de recibo: " +
          "ela é autenticada na rota e aplicada por confirmarPagamento.",
      },
    };
  },
};

const ADAPTADORES: Record<Provedor, AdaptadorDeBilling> = {
  apple,
  google,
  alternativo,
  administrativo,
};

export function adaptador(nome: Provedor): AdaptadorDeBilling {
  return ADAPTADORES[nome];
}

/** Quem está ligado agora. Serve ao diagnóstico, nunca à decisão de acesso. */
export function provedoresDisponiveis(): Provedor[] {
  return (Object.keys(ADAPTADORES) as Provedor[]).filter((n) => ADAPTADORES[n].disponivel());
}

/**
 * Existe algum caminho de compra dentro do aplicativo?
 *
 * Hoje, não — e a resposta é honesta em vez de otimista. A tela comercial usa
 * isto para dizer como a contratação acontece de verdade (pelo canal oficial),
 * em vez de mostrar um botão que não leva a lugar nenhum.
 */
export function compraNoAplicativoDisponivel(): boolean {
  return apple.disponivel() || google.disponivel() || alternativo.disponivel();
}
