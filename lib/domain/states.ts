/**
 * Os estados que o banco guarda.
 *
 * Este arquivo já foi o coração de uma máquina de estados completa — rótulos,
 * transições permitidas, tons de cor, campos extras por estado. Isso tudo
 * pertencia ao Operations, que saiu daqui. O que ficou é o mínimo que ainda
 * tem dono: os nomes que as colunas `status` aceitam.
 *
 * Eles não desapareceram junto com as telas porque as tabelas continuam de pé,
 * com dados dentro. Um pedido gravado com `status: "encaminhada"` continua
 * existindo, e `lib/db/schema.ts` precisa saber que aquele texto é um estado
 * válido — mesmo que nada neste repositório mova um registro para lá.
 *
 * O que a captura de leads move, ela move para o começo: uma solicitação nasce
 * `nova`, um cadastro nasce `recebido`, uma empresa entra no funil em
 * `cadastro_recebido`. O resto é vocabulário herdado, e é assim que deve ser
 * lido — não como recurso que sumiu da interface, mas como histórico que a
 * interface nunca mais vai escrever.
 */

export type ProspectStatus =
  | "mapeado"
  | "contatado"
  | "interessado"
  | "pagina_enviada"
  | "cadastro_recebido"
  | "em_analise"
  | "aprovado"
  | "aguardando_pagamento"
  | "onboarding"
  | "parceiro_fundador"
  | "nao_avancou";

export type ApplicationStatus = "recebido" | "em_analise" | "aprovado" | "recusado";

export type PartnerStatus =
  | "aguardando_lancamento"
  | "ativo"
  | "pausado"
  | "suspenso"
  | "encerrado";

export type RequestStatus =
  | "nova"
  | "em_triagem"
  | "pronta"
  | "encaminhada"
  | "em_atendimento"
  | "resolvida"
  | "sem_parceiro"
  | "cancelada"
  | "invalida"
  | "duplicada";

export type OpportunityStatus =
  | "selecionado"
  | "encaminhado"
  | "respondeu"
  | "contato_realizado"
  | "orcamento"
  | "contratado"
  | "recusou"
  | "indisponivel"
  | "sem_resposta"
  | "cliente_nao_respondeu"
  | "nao_fechou";

/**
 * A ordem do funil comercial, sem os becos sem saída.
 *
 * Sobreviveu porque a entrada ainda a consulta: quando uma empresa que já está
 * no funil manda o cadastro de novo, o registro só avança — a comparação de
 * posição nesta lista é o que impede um cadastro atrasado de puxar de volta
 * para "cadastro recebido" alguém que já foi aprovado. `nao_avancou` fica de
 * fora de propósito: é saída, não etapa.
 */
export const prospectFunnel: ProspectStatus[] = [
  "mapeado",
  "contatado",
  "interessado",
  "pagina_enviada",
  "cadastro_recebido",
  "em_analise",
  "aprovado",
  "aguardando_pagamento",
  "onboarding",
  "parceiro_fundador",
];
