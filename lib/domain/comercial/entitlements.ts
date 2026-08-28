/**
 * Entitlements — o que esta conta pode usar **agora**.
 *
 * A pergunta que este arquivo responde não é "qual botão de pagamento foi
 * usado?" nem "qual plano ele tem?" (§18). É uma só, e o acesso do aplicativo
 * inteiro depende dela:
 *
 * > Este profissional pode receber oportunidades neste instante?
 *
 * ## Três regras que valem ser lidas antes do código
 *
 * **1. Isto é uma função pura, e roda no servidor.** O `agora` que entra é o
 * relógio do servidor, sempre (§29). Um usuário que muda a data do celular não
 * estende assinatura nenhuma, porque o aparelho não participa da conta — ele
 * recebe o resultado e desenha.
 *
 * **2. Não saber não é poder.** Quando o estado comercial não pôde ser
 * determinado — rede caída, cache vencido, servidor fora —, a resposta é
 * `desconhecido`, e `desconhecido` **não** concede entitlement. É o §17 e o
 * §49 juntos: o caminho de código que trata a ausência de informação como
 * permissão é exatamente o que libera acesso sem pagamento validado.
 *
 * **3. E não saber também não é bloquear o aplicativo.** O §104 é explícito:
 * conta, histórico, cobrança, privacidade, suporte e os dados próprios do
 * profissional continuam acessíveis **em qualquer estado comercial**. Eles não
 * são entitlements — são o produto pertencendo a quem o usa. Por isso este
 * módulo não os enumera como coisas a conceder: `SEMPRE_DISPONIVEL` existe para
 * dizer, por escrito, o que nenhuma regra daqui pode tirar.
 */

import { assinaturaDaAcesso, jaPagou, type EstadoDaAdesao, type EstadoDaAssinatura } from "./estados";

/* -------------------------------------------------------------------------- */
/*  O que se pode conceder                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Os entitlements que existem.
 *
 * São dois, e a lista é curta de propósito. O §19 avisa que ter infraestrutura
 * não é motivo para implementar benefício não aprovado — então recursos
 * premium, limites de portfólio, métricas e exposição patrocinada **não estão
 * aqui**. Quando forem decididos, entram como valores novos; até lá, a ausência
 * é a documentação de que ninguém os decidiu.
 */
export type Entitlement =
  /**
   * Participação ativa na rede: o perfil existe para os moradores, e o
   * profissional conta como parceiro em operação.
   */
  | "participacao_na_rede"
  /**
   * Receber novas oportunidades.
   *
   * É a limitação principal quando não há participação paga (§105) — e é uma
   * limitação sobre o que **chega**, nunca sobre o que já chegou: o §103
   * proíbe destruir o contexto de uma oportunidade em andamento porque um
   * período terminou.
   */
  | "receber_oportunidades";

export const ENTITLEMENTS: Entitlement[] = ["participacao_na_rede", "receber_oportunidades"];

/**
 * O que **não** é entitlement, e por isso nenhuma regra daqui alcança (§104).
 *
 * Está escrito como dado, e não como comentário, para que a próxima pessoa que
 * for construir um paywall encontre a lista antes de escrever o `if`.
 */
export const SEMPRE_DISPONIVEL = [
  "os próprios dados da conta",
  "o histórico de oportunidades já recebidas",
  "o histórico de cobrança e os comprovantes",
  "as informações de privacidade e os pedidos sobre dados pessoais",
  "o suporte e o canal oficial de contato",
  "sair da conta e alterar a senha",
] as const;

/* -------------------------------------------------------------------------- */
/*  De onde o acesso vem                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Por que este parceiro está — ou não está — ativo.
 *
 * Este campo é a resposta do §113: "por que este parceiro tem acesso?" precisa
 * ser respondível sem arqueologia, e uma lista de entitlements sozinha não
 * responde. `origem` diz de onde veio; `ate` diz até quando vale.
 */
export type OrigemDoAcesso =
  /** Beta Fundador em curso. */
  | "beta"
  /** Uma assinatura recorrente viva. Hoje não existe nenhuma. */
  | "assinatura"
  /** Há direito reconhecido, mas o período ainda não começou. */
  | "aguardando-lancamento"
  /** Não há nada que conceda acesso agora. */
  | "nenhuma"
  /** Não foi possível determinar. Não concede, e não bloqueia o aplicativo. */
  | "desconhecida";

export type Acesso = {
  entitlements: Entitlement[];
  origem: OrigemDoAcesso;
  /** Até quando o acesso atual vale. `null` quando não há acesso ou não há fim. */
  ate: Date | null;
  /**
   * Uma frase em português dizendo por que o acesso é o que é.
   *
   * Vai para o log de auditoria e para a área de desenvolvimento — nunca é o
   * texto que o profissional lê. A tela dele fala de "participação" e "Beta",
   * não de entitlement.
   */
  justificativa: string;
};

/** O que a derivação precisa saber. Nada além disso decide acesso. */
export type FonteDoAcesso = {
  adesao: {
    estado: EstadoDaAdesao;
    /** Fim da janela do Beta, já calculado por `lib/domain/beta.ts`. */
    betaFim: Date | null;
  } | null;
  assinatura: {
    estado: EstadoDaAssinatura;
    /** Fim do período já pago. Cancelar não encurta isto (§87). */
    periodoFim: Date | null;
  } | null;
  /** O relógio do servidor. Nunca o do aparelho. */
  agora: Date;
};

const SEM_ACESSO: Entitlement[] = [];
const ACESSO_COMPLETO: Entitlement[] = ["participacao_na_rede", "receber_oportunidades"];

/**
 * A derivação. Uma função, um resultado, nenhum efeito.
 *
 * A ordem importa: assinatura primeiro, Beta depois. Um Fundador que
 * futuramente assinar um plano tem os dois — `FounderStatus` e `Plan` coexistem
 * (§121) — e quem manda no acesso é o que estiver vivo, não o que veio antes.
 */
export function derivarAcesso(fonte: FonteDoAcesso): Acesso {
  const { adesao, assinatura, agora } = fonte;

  if (assinatura && assinaturaDaAcesso(assinatura.estado)) {
    // O estado autoriza, mas o período é quem termina. Sem esta segunda
    // condição, uma assinatura `cancelada` daria acesso para sempre.
    const dentro = !assinatura.periodoFim || assinatura.periodoFim.getTime() > agora.getTime();
    if (dentro) {
      return {
        entitlements: ACESSO_COMPLETO,
        origem: "assinatura",
        ate: assinatura.periodoFim,
        justificativa:
          assinatura.estado === "cancelada"
            ? "Assinatura cancelada, com acesso até o fim do período já pago."
            : `Assinatura em estado "${assinatura.estado}".`,
      };
    }
  }

  if (adesao && jaPagou(adesao.estado)) {
    if (adesao.estado === "reservado") {
      return {
        entitlements: SEM_ACESSO,
        origem: "aguardando-lancamento",
        ate: null,
        justificativa:
          "Beta Fundador pago e confirmado; a operação para moradores ainda não começou.",
      };
    }

    const dentro = adesao.betaFim !== null && adesao.betaFim.getTime() > agora.getTime();
    if (adesao.estado === "ativo" && dentro) {
      return {
        entitlements: ACESSO_COMPLETO,
        origem: "beta",
        ate: adesao.betaFim,
        justificativa: "Beta Fundador em curso.",
      };
    }

    return {
      entitlements: SEM_ACESSO,
      origem: "nenhuma",
      ate: null,
      justificativa:
        "Beta Fundador encerrado. A condição histórica de Fundador permanece; " +
        "o acesso comercial depende da continuidade, ainda não definida.",
    };
  }

  if (!adesao && !assinatura) {
    return {
      entitlements: SEM_ACESSO,
      origem: "nenhuma",
      ate: null,
      justificativa: "Nenhuma adesão e nenhuma assinatura registradas para esta conta.",
    };
  }

  return {
    entitlements: SEM_ACESSO,
    origem: "nenhuma",
    ate: null,
    justificativa: adesao
      ? `Adesão em "${adesao.estado}", que não concede acesso.`
      : `Assinatura em "${assinatura?.estado}", que não concede acesso.`,
  };
}

/**
 * O acesso quando não deu para perguntar.
 *
 * Existe como função, e não como `null` espalhado, porque é o caso em que o
 * erro custa caro nos dois sentidos: conceder sem saber quebra o §17; bloquear
 * o aplicativo inteiro por uma falha de rede quebra o §104 e o §107.
 */
export function acessoDesconhecido(motivo = "Não foi possível conferir a situação comercial."): Acesso {
  return {
    entitlements: SEM_ACESSO,
    origem: "desconhecida",
    ate: null,
    justificativa: motivo,
  };
}

/* -------------------------------------------------------------------------- */
/*  As perguntas que as telas fazem                                           */
/* -------------------------------------------------------------------------- */

export function temEntitlement(acesso: Acesso, qual: Entitlement): boolean {
  return acesso.entitlements.includes(qual);
}

/** A pergunta principal do produto. Nenhuma tela deve reimplementá-la. */
export function podeReceberOportunidades(acesso: Acesso): boolean {
  return temEntitlement(acesso, "receber_oportunidades");
}

/**
 * A situação é conhecida?
 *
 * Uma tela que precisa explicar por que algo não está disponível tem de
 * distinguir "seu período terminou" de "não consegui conferir agora". Dizer o
 * primeiro quando é o segundo é acusar alguém de não ter pago.
 */
export function situacaoConhecida(acesso: Acesso): boolean {
  return acesso.origem !== "desconhecida";
}
