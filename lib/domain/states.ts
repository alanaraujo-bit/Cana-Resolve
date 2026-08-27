/**
 * As máquinas de estado do Canaã Resolve.
 *
 * Este arquivo é a única fonte de verdade sobre "em que ponto uma coisa está e
 * para onde ela pode ir". Rotas, telas e testes leem daqui — nenhum estado é
 * escrito como string solta em outro lugar.
 *
 * Cada estado carrega o rótulo que o operador lê, uma frase curta que explica
 * o que ele significa na prática e um tom, usado pelos selos da interface. Um
 * estado que não faz diferença na operação não deveria existir: se ele só
 * serve para colorir uma coluna, é ruído.
 */

export type Tone = "neutral" | "progress" | "attention" | "positive" | "negative";

/**
 * O que a operação precisa informar junto com uma transição.
 *
 * Fica aqui, e não na tela, porque "encerrar um parceiro pede um motivo" é
 * regra de domínio: vale igual em qualquer lugar de onde a transição for
 * disparada. Como é dado — e não função — atravessa a fronteira entre servidor
 * e cliente sem cerimônia.
 */
export type CampoExtra = {
  nome: "motivo" | "valor";
  rotulo: string;
  tipo: "texto" | "valor" | "escolha";
  opcoes?: { id: string; label: string }[];
};

export type StateMeta<T extends string> = {
  id: T;
  label: string;
  /** O que esse estado quer dizer, em uma linha, para quem opera. */
  hint: string;
  tone: Tone;
  /** Estados finais não avançam sozinhos; saem do que exige atenção. */
  terminal?: boolean;
  /** O que precisa ser informado para chegar a este estado. */
  pede?: CampoExtra[];
};

function index<T extends string>(list: StateMeta<T>[]) {
  const byId = new Map(list.map((s) => [s.id, s]));
  return {
    list,
    ids: list.map((s) => s.id),
    get(id: T | null | undefined): StateMeta<T> | undefined {
      return id ? byId.get(id) : undefined;
    },
    label(id: T | null | undefined) {
      return (id && byId.get(id)?.label) || "—";
    },
    tone(id: T | null | undefined): Tone {
      return (id && byId.get(id)?.tone) || "neutral";
    },
    is(id: unknown): id is T {
      return typeof id === "string" && byId.has(id as T);
    },
  };
}

/* ---------------------------------------------------------------
   Prospect — o funil comercial B2B
   --------------------------------------------------------------- */

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

export const prospectStates = index<ProspectStatus>([
  {
    id: "mapeado",
    label: "Mapeado",
    hint: "A empresa foi identificada, mas ninguém falou com ela ainda.",
    tone: "neutral",
  },
  {
    id: "contatado",
    label: "Contatado",
    hint: "A primeira mensagem foi enviada. Aguardando resposta.",
    tone: "progress",
  },
  {
    id: "interessado",
    label: "Interessado",
    hint: "Respondeu e quer entender melhor a proposta.",
    tone: "progress",
  },
  {
    id: "pagina_enviada",
    label: "Página enviada",
    hint: "Recebeu o link de /parceiros e está avaliando.",
    tone: "progress",
  },
  {
    id: "cadastro_recebido",
    label: "Cadastro recebido",
    hint: "Preencheu o formulário. Ainda não foi avaliado.",
    tone: "attention",
  },
  {
    id: "em_analise",
    label: "Em análise",
    hint: "A qualificação está em andamento.",
    tone: "attention",
  },
  {
    id: "aprovado",
    label: "Aprovado",
    hint: "Passou na qualificação. Falta acertar o pagamento.",
    tone: "positive",
  },
  {
    id: "aguardando_pagamento",
    label: "Aguardando pagamento",
    hint: "A condição foi enviada e o pagamento ainda não entrou.",
    tone: "attention",
  },
  {
    id: "onboarding",
    label: "Onboarding",
    hint: "Pagou. Faltam os dados de perfil para entrar na rede.",
    tone: "progress",
  },
  {
    id: "parceiro_fundador",
    label: "Parceiro Fundador",
    hint: "Virou parceiro. O acompanhamento continua no perfil dele.",
    tone: "positive",
    terminal: true,
  },
  {
    id: "nao_avancou",
    label: "Não avançou",
    hint: "Saiu do funil. O motivo fica registrado.",
    tone: "negative",
    terminal: true,
    pede: [
      {
        nome: "motivo",
        rotulo: "Por que não avançou?",
        tipo: "escolha",
        // Preenchido logo abaixo: a lista de motivos é declarada depois.
        opcoes: [],
      },
    ],
  },
]);

export type ProspectLostReason =
  | "nao_respondeu"
  | "sem_interesse"
  | "preco"
  | "sem_valor_percebido"
  | "fora_de_canaa"
  | "categoria_inadequada"
  | "demanda_suficiente"
  | "outro";

export const prospectLostReasons: { id: ProspectLostReason; label: string }[] = [
  { id: "nao_respondeu", label: "Não respondeu" },
  { id: "sem_interesse", label: "Sem interesse" },
  { id: "preco", label: "Preço" },
  { id: "sem_valor_percebido", label: "Não percebeu valor" },
  { id: "fora_de_canaa", label: "Não atende Canaã" },
  { id: "categoria_inadequada", label: "Categoria inadequada" },
  { id: "demanda_suficiente", label: "Já tem demanda suficiente" },
  { id: "outro", label: "Outro motivo" },
];

// Amarrado aqui porque `prospectLostReasons` é declarado depois do bloco de
// estados — e repetir a lista nos dois lugares seria pedir para elas
// divergirem no primeiro motivo novo.
prospectStates.get("nao_avancou")!.pede![0].opcoes = prospectLostReasons;

/**
 * O funil é uma sequência, mas a vida real anda para trás: alguém marcado como
 * interessado pode voltar a "contatado" depois de sumir. Por isso qualquer
 * passo pode retroceder — o que não pode é pular a etapa que gera dado.
 */
const prospectForward: Record<ProspectStatus, ProspectStatus[]> = {
  mapeado: ["contatado", "interessado", "nao_avancou"],
  contatado: ["interessado", "pagina_enviada", "nao_avancou"],
  interessado: ["pagina_enviada", "cadastro_recebido", "nao_avancou"],
  pagina_enviada: ["cadastro_recebido", "nao_avancou"],
  cadastro_recebido: ["em_analise", "nao_avancou"],
  em_analise: ["aprovado", "nao_avancou"],
  aprovado: ["aguardando_pagamento", "nao_avancou"],
  aguardando_pagamento: ["onboarding", "nao_avancou"],
  onboarding: ["parceiro_fundador", "nao_avancou"],
  parceiro_fundador: [],
  nao_avancou: ["contatado", "interessado"],
};

/** A ordem canônica do funil, usada pelo pipeline e pelo analytics. */
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

export function prospectTransitions(from: ProspectStatus): ProspectStatus[] {
  const forward = prospectForward[from] ?? [];
  const stepBack = prospectFunnel.slice(0, Math.max(0, prospectFunnel.indexOf(from)));
  return unique([...forward, ...stepBack]);
}

/* ---------------------------------------------------------------
   Cadastro enviado em /parceiros
   --------------------------------------------------------------- */

export type ApplicationStatus = "recebido" | "em_analise" | "aprovado" | "recusado";

export const applicationStates = index<ApplicationStatus>([
  {
    id: "recebido",
    label: "Recebido",
    hint: "Chegou pelo formulário e ninguém olhou ainda.",
    tone: "attention",
  },
  {
    id: "em_analise",
    label: "Em análise",
    hint: "A qualificação está sendo feita.",
    tone: "progress",
  },
  {
    id: "aprovado",
    label: "Aprovado",
    hint: "Virou parceiro na rede.",
    tone: "positive",
    terminal: true,
  },
  {
    id: "recusado",
    label: "Recusado",
    hint: "Não entrou. O motivo fica na análise.",
    tone: "negative",
    terminal: true,
  },
]);

const applicationForward: Record<ApplicationStatus, ApplicationStatus[]> = {
  recebido: ["em_analise", "aprovado", "recusado"],
  em_analise: ["aprovado", "recusado", "recebido"],
  aprovado: [],
  recusado: ["em_analise"],
};

/* ---------------------------------------------------------------
   Parceiro
   --------------------------------------------------------------- */

export type PartnerStatus =
  | "aguardando_lancamento"
  | "ativo"
  | "pausado"
  | "suspenso"
  | "encerrado";

export const partnerStates = index<PartnerStatus>([
  {
    id: "aguardando_lancamento",
    label: "Aguardando lançamento",
    hint: "Já faz parte da rede e entra na distribuição quando a operação abrir.",
    tone: "progress",
  },
  {
    id: "ativo",
    label: "Ativo",
    hint: "Recebe oportunidades compatíveis.",
    tone: "positive",
  },
  {
    id: "pausado",
    label: "Pausado",
    hint: "Pediu para não receber por enquanto. Volta quando quiser.",
    tone: "neutral",
    pede: [{ nome: "motivo", rotulo: "Por que está pausando? (fica no histórico)", tipo: "texto" }],
  },
  {
    id: "suspenso",
    label: "Suspenso",
    hint: "Retirado da distribuição por decisão nossa.",
    tone: "negative",
    pede: [{ nome: "motivo", rotulo: "Motivo da suspensão", tipo: "texto" }],
  },
  {
    id: "encerrado",
    label: "Encerrado",
    hint: "Saiu da rede. O histórico permanece.",
    tone: "negative",
    terminal: true,
    pede: [{ nome: "motivo", rotulo: "Motivo do encerramento", tipo: "texto" }],
  },
]);

const partnerForward: Record<PartnerStatus, PartnerStatus[]> = {
  aguardando_lancamento: ["ativo", "pausado", "suspenso", "encerrado"],
  ativo: ["pausado", "suspenso", "encerrado"],
  pausado: ["ativo", "suspenso", "encerrado"],
  suspenso: ["ativo", "pausado", "encerrado"],
  encerrado: ["ativo"],
};

/** Só estes recebem encaminhamento. Usado pelo matching e pelos contadores. */
export const partnerDistributable: PartnerStatus[] = ["ativo"];

/* ---------------------------------------------------------------
   Solicitação do morador
   --------------------------------------------------------------- */

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

export const requestStates = index<RequestStatus>([
  {
    id: "nova",
    label: "Nova",
    hint: "Acabou de entrar. Ninguém leu ainda.",
    tone: "attention",
  },
  {
    id: "em_triagem",
    label: "Em triagem",
    hint: "Alguém está entendendo o pedido e conferindo a categoria.",
    tone: "progress",
  },
  {
    id: "pronta",
    label: "Pronta para encaminhar",
    hint: "Entendida e classificada. Falta escolher os parceiros.",
    tone: "attention",
  },
  {
    id: "encaminhada",
    label: "Encaminhada",
    hint: "Chegou a pelo menos um parceiro.",
    tone: "progress",
  },
  {
    id: "em_atendimento",
    label: "Em atendimento",
    hint: "Algum parceiro já falou com o morador.",
    tone: "progress",
  },
  {
    id: "resolvida",
    label: "Resolvida",
    hint: "O morador conseguiu resolver o problema.",
    tone: "positive",
    terminal: true,
  },
  {
    id: "sem_parceiro",
    label: "Sem parceiro disponível",
    hint: "Não havia ninguém compatível na rede para este pedido.",
    tone: "negative",
    terminal: true,
    pede: [{ nome: "motivo", rotulo: "O que faltou na rede? (ajuda a saber quem trazer)", tipo: "texto" }],
  },
  {
    id: "cancelada",
    label: "Cancelada",
    hint: "O morador desistiu ou resolveu por conta própria.",
    tone: "neutral",
    terminal: true,
    pede: [{ nome: "motivo", rotulo: "Motivo (opcional)", tipo: "texto" }],
  },
  {
    id: "invalida",
    label: "Inválida",
    hint: "Teste, trote ou pedido que não faz sentido atender.",
    tone: "negative",
    terminal: true,
    pede: [{ nome: "motivo", rotulo: "Motivo (opcional)", tipo: "texto" }],
  },
  {
    id: "duplicada",
    label: "Duplicada",
    hint: "O mesmo pedido já existe em outro registro.",
    tone: "neutral",
    terminal: true,
    pede: [{ nome: "motivo", rotulo: "Qual é o pedido original?", tipo: "texto" }],
  },
]);

const requestExits: RequestStatus[] = ["cancelada", "invalida", "duplicada"];

const requestForward: Record<RequestStatus, RequestStatus[]> = {
  nova: ["em_triagem", "pronta", ...requestExits],
  em_triagem: ["pronta", "sem_parceiro", ...requestExits],
  pronta: ["encaminhada", "sem_parceiro", ...requestExits],
  encaminhada: ["em_atendimento", "resolvida", "sem_parceiro", ...requestExits],
  em_atendimento: ["resolvida", ...requestExits],
  resolvida: ["em_atendimento"],
  sem_parceiro: ["pronta", ...requestExits],
  cancelada: ["em_triagem"],
  invalida: ["em_triagem"],
  duplicada: ["em_triagem"],
};

/** O que ainda pede alguma ação da operação. */
export const requestOpen: RequestStatus[] = [
  "nova",
  "em_triagem",
  "pronta",
  "encaminhada",
  "em_atendimento",
];

/** O que espera uma decisão humana agora — o que a Visão Geral destaca. */
export const requestNeedsAttention: RequestStatus[] = ["nova", "em_triagem", "pronta"];

/* ---------------------------------------------------------------
   Oportunidade — a solicitação encaminhada a um parceiro
   --------------------------------------------------------------- */

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

export const opportunityStates = index<OpportunityStatus>([
  {
    id: "selecionado",
    label: "Selecionado",
    hint: "Escolhido para receber, mas ainda não recebeu.",
    tone: "neutral",
  },
  {
    id: "encaminhado",
    label: "Encaminhado",
    hint: "A mensagem foi enviada ao parceiro.",
    tone: "progress",
  },
  {
    id: "respondeu",
    label: "Respondeu",
    hint: "O parceiro deu retorno para a gente.",
    tone: "progress",
  },
  {
    id: "contato_realizado",
    label: "Contato realizado",
    hint: "O parceiro falou com o morador.",
    tone: "progress",
  },
  {
    id: "orcamento",
    label: "Orçamento enviado",
    hint: "Existe um valor na mesa.",
    tone: "progress",
    pede: [
      { nome: "valor", rotulo: "Valor do orçamento (opcional)", tipo: "valor" },
    ],
  },
  {
    id: "contratado",
    label: "Contratado",
    hint: "O serviço foi fechado — até onde sabemos.",
    tone: "positive",
    terminal: true,
  },
  {
    id: "recusou",
    label: "Recusou",
    hint: "O parceiro não quis atender este pedido.",
    tone: "negative",
    terminal: true,
    pede: [{ nome: "motivo", rotulo: "O que ele disse?", tipo: "texto" }],
  },
  {
    id: "indisponivel",
    label: "Indisponível",
    hint: "Queria atender, mas não podia agora.",
    tone: "neutral",
    terminal: true,
    pede: [{ nome: "motivo", rotulo: "Por que não pôde atender agora?", tipo: "texto" }],
  },
  {
    id: "sem_resposta",
    label: "Sem resposta",
    hint: "O parceiro não deu retorno nenhum.",
    tone: "negative",
    terminal: true,
  },
  {
    id: "cliente_nao_respondeu",
    label: "Morador não respondeu",
    hint: "O parceiro procurou e o morador sumiu.",
    tone: "neutral",
    terminal: true,
    pede: [{ nome: "motivo", rotulo: "O que aconteceu?", tipo: "texto" }],
  },
  {
    id: "nao_fechou",
    label: "Não fechou",
    hint: "Houve conversa, mas o serviço não aconteceu.",
    tone: "neutral",
    terminal: true,
    pede: [{ nome: "motivo", rotulo: "Por que não fechou? (é o que mais ensina)", tipo: "texto" }],
  },
]);

const opportunityExits: OpportunityStatus[] = [
  "recusou",
  "indisponivel",
  "sem_resposta",
  "cliente_nao_respondeu",
  "nao_fechou",
];

const opportunityForward: Record<OpportunityStatus, OpportunityStatus[]> = {
  selecionado: ["encaminhado", "recusou", "indisponivel"],
  encaminhado: ["respondeu", "contato_realizado", ...opportunityExits],
  respondeu: ["contato_realizado", ...opportunityExits],
  contato_realizado: ["orcamento", "contratado", ...opportunityExits],
  orcamento: ["contratado", ...opportunityExits],
  contratado: ["nao_fechou"],
  recusou: [],
  indisponivel: [],
  sem_resposta: ["respondeu", "contato_realizado"],
  cliente_nao_respondeu: ["contato_realizado"],
  nao_fechou: ["contratado"],
};

/** Estados em que a oportunidade ainda pode virar um serviço. */
export const opportunityLive: OpportunityStatus[] = [
  "selecionado",
  "encaminhado",
  "respondeu",
  "contato_realizado",
  "orcamento",
];

/* ---------------------------------------------------------------
   Transições
   --------------------------------------------------------------- */

const machines = {
  prospect: { states: prospectStates, next: prospectTransitions },
  application: {
    states: applicationStates,
    next: (from: ApplicationStatus) => applicationForward[from] ?? [],
  },
  partner: {
    states: partnerStates,
    next: (from: PartnerStatus) => partnerForward[from] ?? [],
  },
  request: {
    states: requestStates,
    next: (from: RequestStatus) => requestForward[from] ?? [],
  },
  opportunity: {
    states: opportunityStates,
    next: (from: OpportunityStatus) => opportunityForward[from] ?? [],
  },
} as const;

export type MachineName = keyof typeof machines;

/** Para onde este registro pode ir a partir de onde está. */
export function nextStates(machine: MachineName, from: string): string[] {
  const m = machines[machine];
  if (!m.states.is(from)) return [];
  return (m.next as (s: string) => string[])(from);
}

export function canTransition(machine: MachineName, from: string, to: string) {
  if (from === to) return false;
  return nextStates(machine, from).includes(to);
}

export function stateMeta(machine: MachineName, id: string | null | undefined) {
  return machines[machine].states.get(id as never);
}

export function stateLabel(machine: MachineName, id: string | null | undefined) {
  return machines[machine].states.label(id as never);
}

export function stateTone(machine: MachineName, id: string | null | undefined): Tone {
  return machines[machine].states.tone(id as never);
}

export function statesOf(machine: MachineName) {
  return machines[machine].states.list as readonly StateMeta<string>[];
}

function unique<T>(list: T[]): T[] {
  return [...new Set(list)];
}
