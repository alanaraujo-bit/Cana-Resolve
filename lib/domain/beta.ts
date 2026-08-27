/**
 * Beta Parceiro Fundador.
 *
 * A regra que este arquivo existe para proteger:
 *
 * > **os 90 dias não começam no pagamento.**
 *
 * O parceiro paga, reserva a participação, faz o onboarding e espera. O prazo
 * só passa a correr quando a operação abre para os moradores — porque antes
 * disso não existe nada para ele receber. Por isso o fim do período nunca é
 * gravado: é sempre calculado a partir do início real, e enquanto o
 * lançamento não acontece a resposta honesta é "ainda não começou".
 *
 * O que ainda **não** está decidido — e portanto não está codificado em lugar
 * nenhum — é o que acontece depois dos 90 dias. Valor, formato e regra de
 * renovação são hipóteses. Ver BLOCKERS.md.
 */

/** Condição atual, em centavos. Um número só, num lugar só. */
export const BETA_PRICE_CENTS = 7900;
export const BETA_DAYS = 90;

export type BetaInput = {
  founder: boolean;
  betaPaidAt: Date | null;
  onboardingDoneAt: Date | null;
  betaStartedAt: Date | null;
};

export type BetaPhase =
  | "sem_beta"
  | "aguardando_pagamento"
  | "aguardando_onboarding"
  | "aguardando_lancamento"
  | "em_andamento"
  | "encerrado";

export type BetaStatus = {
  phase: BetaPhase;
  label: string;
  /** O que isso significa para o parceiro, em uma linha. */
  hint: string;
  startsAt: Date | null;
  endsAt: Date | null;
  /** Dias que ainda faltam. `null` enquanto o período não começou. */
  daysLeft: number | null;
  /** 0 a 1. `null` enquanto o período não começou. */
  progress: number | null;
};

export function betaEndsAt(startedAt: Date | null): Date | null {
  if (!startedAt) return null;
  const end = new Date(startedAt);
  end.setDate(end.getDate() + BETA_DAYS);
  return end;
}

export function betaStatus(partner: BetaInput, now = new Date()): BetaStatus {
  const base = { startsAt: null, endsAt: null, daysLeft: null, progress: null };

  if (!partner.founder) {
    return {
      ...base,
      phase: "sem_beta",
      label: "Fora do Beta",
      hint: "Este parceiro não entrou pela condição de Fundador.",
    };
  }

  if (!partner.betaPaidAt) {
    return {
      ...base,
      phase: "aguardando_pagamento",
      label: "Aguardando pagamento",
      hint: "A participação está reservada, mas o pagamento ainda não entrou.",
    };
  }

  if (!partner.onboardingDoneAt) {
    return {
      ...base,
      phase: "aguardando_onboarding",
      label: "Onboarding pendente",
      hint: "Pagou. Faltam os dados de perfil para entrar na distribuição.",
    };
  }

  if (!partner.betaStartedAt) {
    return {
      ...base,
      phase: "aguardando_lancamento",
      label: "Aguardando lançamento",
      hint: "Tudo pronto. Os 90 dias começam quando a operação abrir.",
    };
  }

  const startsAt = partner.betaStartedAt;
  const endsAt = betaEndsAt(startsAt)!;
  const total = endsAt.getTime() - startsAt.getTime();
  const elapsed = now.getTime() - startsAt.getTime();
  const daysLeft = Math.ceil((endsAt.getTime() - now.getTime()) / 86_400_000);

  if (now >= endsAt) {
    return {
      phase: "encerrado",
      label: "Beta encerrado",
      hint: "Os 90 dias terminaram. A continuidade ainda não foi definida.",
      startsAt,
      endsAt,
      daysLeft: 0,
      progress: 1,
    };
  }

  return {
    phase: "em_andamento",
    label: "Beta em andamento",
    hint:
      daysLeft === 1
        ? "Último dia do período de Fundador."
        : `Faltam ${daysLeft} dias para o fim do período de Fundador.`,
    startsAt,
    endsAt,
    daysLeft,
    progress: Math.min(1, Math.max(0, elapsed / total)),
  };
}

/**
 * Quem entra na largada do lançamento: fundador, pago, onboarding concluído e
 * ainda sem data de início. Quem não estiver pronto não tem o relógio disparado
 * — entra depois, com o próprio início.
 */
export function readyForLaunch(partner: BetaInput) {
  return (
    partner.founder &&
    Boolean(partner.betaPaidAt) &&
    Boolean(partner.onboardingDoneAt) &&
    !partner.betaStartedAt
  );
}

export function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
