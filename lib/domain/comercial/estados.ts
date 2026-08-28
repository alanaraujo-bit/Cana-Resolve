/**
 * O vocabulário comercial — quatro conceitos que **não** são o mesmo.
 *
 * Este arquivo existe para que a confusão entre eles seja impossível de
 * escrever, e não apenas desaconselhada num comentário:
 *
 * | Conceito | Pergunta que responde |
 * | --- | --- |
 * | `EstadoDaAdesao` | onde este parceiro está no processo do Beta Fundador? |
 * | `EstadoDaAssinatura` | existe um contrato recorrente vivo? |
 * | `EstadoDoPagamento` | o que aconteceu com **esta** cobrança específica? |
 * | `Entitlement` | o que esta conta pode usar **agora**? |
 *
 * Eles andam juntos na vida real e divergem exatamente quando importa. Um
 * pagamento aprovado com a operação ainda fechada: adesão `reservado`,
 * assinatura inexistente, pagamento `aprovado`, entitlement de rede **ainda
 * não**. Um reembolso: pagamento `reembolsado`, adesão `cancelado`, e o status
 * histórico de Fundador — que é outra coisa ainda — decidido por política, não
 * por efeito colateral.
 *
 * Nada aqui é enum do Postgres, pela mesma razão de `lib/domain/states.ts`: a
 * fase é de validação e migrar enum a cada ajuste custa caro sem dar segurança
 * que o domínio já não dê.
 */

/* -------------------------------------------------------------------------- */
/*  Adesão ao Beta Fundador                                                   */
/* -------------------------------------------------------------------------- */

/**
 * O ciclo do Beta Fundador, na ordem em que o processo comercial acontece:
 * interessado → análise → aprovado → aceite → pagamento → vaga → operação.
 *
 * `nao_elegivel` e `categoria_cheia` são saídas, não etapas. A distinção
 * importa: "sua categoria está temporariamente completa" e "você não é
 * elegível" dizem coisas diferentes para a mesma pessoa, e a primeira é um
 * convite a voltar.
 */
export type EstadoDaAdesao =
  /** Cadastrou-se, ninguém analisou ainda. */
  | "em_analise"
  /** Aprovado. A condição comercial pode ser apresentada. */
  | "aprovado"
  /** Aceitou e há uma cobrança em curso que ainda não confirmou. */
  | "pagamento_pendente"
  /** Pago e confirmado. A vaga está reservada; o Beta ainda não começou. */
  | "reservado"
  /** A operação começou. Os 90 dias estão correndo. */
  | "ativo"
  /** Os 90 dias terminaram. */
  | "encerrado"
  /** A categoria está temporariamente completa. */
  | "categoria_cheia"
  /** Não entra na rede nesta rodada. */
  | "nao_elegivel"
  /** Desistiu, ou o pagamento foi desfeito. */
  | "cancelado";

export const ESTADOS_DA_ADESAO: EstadoDaAdesao[] = [
  "em_analise",
  "aprovado",
  "pagamento_pendente",
  "reservado",
  "ativo",
  "encerrado",
  "categoria_cheia",
  "nao_elegivel",
  "cancelado",
];

export function ehEstadoDaAdesao(valor: unknown): valor is EstadoDaAdesao {
  return typeof valor === "string" && ESTADOS_DA_ADESAO.includes(valor as EstadoDaAdesao);
}

/**
 * O único estado em que a condição comercial pode ser **oferecida**.
 *
 * É o §75 em uma função: o processo é análise → aprovação → apresentação da
 * condição → aceite → pagamento. Um desconhecido que instala o aplicativo não
 * encontra um botão de comprar.
 */
export function podeContratar(estado: EstadoDaAdesao): boolean {
  return estado === "aprovado";
}

/** A adesão já foi paga e confirmada — antes, durante ou depois do Beta. */
export function jaPagou(estado: EstadoDaAdesao): boolean {
  return estado === "reservado" || estado === "ativo" || estado === "encerrado";
}

/* -------------------------------------------------------------------------- */
/*  Assinatura                                                                */
/* -------------------------------------------------------------------------- */

/**
 * O ciclo de uma assinatura recorrente.
 *
 * **Hoje nenhuma existe**, e é importante que isso esteja escrito: o Beta é
 * uma compra única de 90 dias, não uma assinatura mensal disfarçada (§8). Os
 * estados existem porque a arquitetura precisa comportá-los antes de a
 * primeira assinatura nascer — não porque haja uma.
 *
 * `cancelada` **não** significa acesso perdido: significa que não haverá
 * próxima cobrança. O acesso vai até o fim do período já pago, e a interface
 * precisa dizer isso (§87).
 */
export type EstadoDaAssinatura =
  | "pendente"
  | "ativa"
  | "pagamento_atrasado"
  | "tolerancia"
  | "cancelada"
  | "expirada";

export const ESTADOS_DA_ASSINATURA: EstadoDaAssinatura[] = [
  "pendente",
  "ativa",
  "pagamento_atrasado",
  "tolerancia",
  "cancelada",
  "expirada",
];

/**
 * A assinatura ainda dá acesso?
 *
 * `cancelada` continua dando: cancelar é desligar a renovação. Quem perde o
 * acesso na hora do cancelamento foi enganado sobre o que comprou.
 * `pagamento_atrasado` e `tolerancia` também dão — é para isso que a tolerância
 * serve —, mas **a duração dessa tolerância não está definida** e não é
 * inventada aqui: ver `BLOCKERS.md`. Quem impede o acesso eterno é a data de
 * fim do período, conferida em `entitlements.ts`.
 */
export function assinaturaDaAcesso(estado: EstadoDaAssinatura): boolean {
  return (
    estado === "ativa" ||
    estado === "pagamento_atrasado" ||
    estado === "tolerancia" ||
    estado === "cancelada"
  );
}

/* -------------------------------------------------------------------------- */
/*  Pagamento                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * O que aconteceu com uma cobrança específica.
 *
 * Separado da assinatura de propósito (§39): uma assinatura ativa pode ter uma
 * cobrança falhada no meio, e uma cobrança aprovada pode pertencer a uma
 * assinatura que já foi cancelada.
 */
export type EstadoDoPagamento =
  | "criado"
  | "aguardando"
  | "aprovado"
  | "falhou"
  | "cancelado"
  | "reembolsado"
  | "contestado";

export const ESTADOS_DO_PAGAMENTO: EstadoDoPagamento[] = [
  "criado",
  "aguardando",
  "aprovado",
  "falhou",
  "cancelado",
  "reembolsado",
  "contestado",
];

export function ehEstadoDoPagamento(valor: unknown): valor is EstadoDoPagamento {
  return (
    typeof valor === "string" && ESTADOS_DO_PAGAMENTO.includes(valor as EstadoDoPagamento)
  );
}

/** Só um estado libera qualquer coisa. Os outros seis, nenhum. */
export function pagamentoConfirmado(estado: EstadoDoPagamento): boolean {
  return estado === "aprovado";
}

/**
 * O pagamento foi desfeito depois de confirmado.
 *
 * Reembolso e contestação recebem o mesmo tratamento na derivação de acesso —
 * **a política comercial de cada um, porém, não está definida** e está
 * registrada em `BLOCKERS.md`. O que está definido, e é o que importa para não
 * haver bug financeiro, é que nenhum dos dois deixa o acesso de pé por
 * omissão: um caminho de código que "não trata" reembolso é um caminho que
 * mantém acesso pago por dinheiro que voltou.
 */
export function pagamentoDesfeito(estado: EstadoDoPagamento): boolean {
  return estado === "reembolsado" || estado === "contestado";
}

/**
 * Cancelar o checkout **não é falha** (§82).
 *
 * A interface que trata os dois igual mostra um erro vermelho para quem apenas
 * mudou de ideia.
 */
export function ehFalha(estado: EstadoDoPagamento): boolean {
  return estado === "falhou";
}

/** Ainda pode virar aprovado — não mostre erro, e não libere nada (§79, §84). */
export function pagamentoEmCurso(estado: EstadoDoPagamento): boolean {
  return estado === "criado" || estado === "aguardando";
}

/* -------------------------------------------------------------------------- */
/*  Status de Fundador                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Fundador é **histórico**, e essa palavra carrega tudo (§10).
 *
 * Não significa plano atual, não significa assinatura ativa, não significa
 * prioridade no matching, não significa melhor profissional, não significa
 * acesso vitalício. Significa: esta pessoa entrou na rede quando ela ainda não
 * existia para ninguém.
 *
 * Por isso é derivado de uma adesão paga, e **não** de um booleano que alguém
 * liga. `partners.founder` continua existindo como o registro que a operação
 * manual escreveu; quem decide o que ele vale é esta função.
 *
 * E ele **sobrevive ao fim do Beta**: `encerrado` continua sendo Fundador. O
 * que muda no fim é o entitlement, não a história.
 */
export function ehFundador(estado: EstadoDaAdesao): boolean {
  return jaPagou(estado);
}
