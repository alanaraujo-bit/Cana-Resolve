/**
 * A oportunidade — o que o Canaã Resolve entrega ao profissional.
 *
 * Uma pessoa de Canaã descreveu um problema, e esse problema chegou a quem
 * sabe resolver. Do lado de quem pede, isso é um **pedido**; do lado de quem
 * atende, é uma **oportunidade**. Mesmo objeto, dois pontos de vista — e este
 * é o aplicativo do profissional.
 *
 * Estes tipos são o contrato da interface. Os dados de exemplo (`exemplos.ts`)
 * e, mais tarde, a API, se adaptam a eles — nunca o contrário.
 */

/**
 * Estados de uma oportunidade, do ponto de vista do profissional.
 *
 * Cinco, e só cinco. Eles se agrupam em três seções visíveis (`Grupo`), porque
 * o que a pessoa precisa saber é mais grosso do que o que o sistema precisa
 * registrar: `nova` e `vista` pedem a mesma coisa dela — uma decisão.
 *
 * O Canaã Resolve não é um CRM. Não há etapa, funil nem pipeline: só saber se
 * a bola está com você, com a pessoa, ou se acabou.
 */
export type Estado =
  /** Chegou e você ainda não abriu. É o único que se anuncia. */
  | 'nova'
  /** Você já leu, mas ainda não decidiu. Continua esperando você. */
  | 'vista'
  /** Você disse que consegue atender. A pessoa espera seu contato. */
  | 'interessado'
  /** Você já falou com a pessoa. Agora depende dela. */
  | 'em-contato'
  /** Acabou — com serviço feito, sem acordo, ou porque você não pôde atender. */
  | 'encerrada';

/** As três seções que a pessoa vê. Deriva do estado; nunca é armazenado. */
export type Grupo = 'atencao' | 'andamento' | 'encerradas';

export const grupos: Grupo[] = ['atencao', 'andamento', 'encerradas'];

export const grupoDoEstado: Record<Estado, Grupo> = {
  nova: 'atencao',
  vista: 'atencao',
  interessado: 'andamento',
  'em-contato': 'andamento',
  encerrada: 'encerradas',
};

export const rotuloGrupo: Record<Grupo, string> = {
  atencao: 'Esperando você',
  andamento: 'Em andamento',
  encerradas: 'Encerradas',
};

/**
 * O mesmo nome, curto o bastante para caber inteiro em um terço da largura de
 * um telefone pequeno. Reticências no meio de um controle de navegação não são
 * densidade: são um rótulo que não se lê. O nome por extenso continua sendo o
 * que o leitor de tela anuncia.
 */
export const rotuloGrupoCurto: Record<Grupo, string> = {
  atencao: 'Esperando',
  andamento: 'Andamento',
  encerradas: 'Encerradas',
};

/** A frase vazia de cada seção. Nenhuma delas comunica fracasso. */
export const vazioDoGrupo: Record<Grupo, { titulo: string; texto: string }> = {
  atencao: {
    titulo: 'Nenhuma oportunidade nova por enquanto.',
    texto: 'Você continua disponível para receber quem precisar do seu serviço aqui na cidade.',
  },
  andamento: {
    titulo: 'Nada em andamento agora.',
    texto: 'Quando você disser que consegue atender, a oportunidade fica aqui até você encerrar.',
  },
  encerradas: {
    titulo: 'Você ainda não encerrou nenhuma.',
    texto: 'O que você concluir, recusar ou não fechar fica guardado aqui.',
  },
};

/**
 * O rótulo do estado, para quem lê. Ele existe para que a cor nunca seja a
 * única pista do que está acontecendo.
 */
export const rotuloEstado: Record<Estado, string> = {
  nova: 'Nova',
  vista: 'Aguardando sua resposta',
  interessado: 'Você respondeu',
  'em-contato': 'Contato iniciado',
  encerrada: 'Encerrada',
};

/**
 * A urgência vem de quem pediu, em linguagem de gente. O sistema não a
 * inventa, não a aumenta e não a usa para apressar ninguém.
 */
export type Urgencia = 'agora' | 'hoje' | 'proximos-dias' | 'sem-pressa';

export const urgencias: Urgencia[] = ['agora', 'hoje', 'proximos-dias', 'sem-pressa'];

export const rotuloUrgencia: Record<Urgencia, string> = {
  agora: 'Precisa agora',
  hoje: 'Para hoje',
  'proximos-dias': 'Nos próximos dias',
  'sem-pressa': 'Sem pressa',
};

/** Só as duas primeiras merecem destaque visual. As outras são texto. */
export function urgenciaEmDestaque(u: Urgencia): boolean {
  return u === 'agora' || u === 'hoje';
}

/**
 * Como uma oportunidade terminou. Sem "ganho" e "perdido": o profissional não
 * precisa entender CRM para dizer o que aconteceu.
 */
export type Resultado =
  | 'servico-realizado'
  | 'cliente-decidindo'
  | 'cliente-nao-respondeu'
  | 'nao-fechamos'
  | 'nao-consegui-atender'
  | 'outro';

export const rotuloResultado: Record<Resultado, string> = {
  'servico-realizado': 'Serviço realizado',
  'cliente-decidindo': 'Cliente ainda está decidindo',
  'cliente-nao-respondeu': 'Cliente não respondeu',
  'nao-fechamos': 'Não fechamos',
  'nao-consegui-atender': 'Não consegui atender',
  outro: 'Outro motivo',
};

/** A ordem em que as opções de encerramento aparecem. */
export const resultadosDeEncerramento: Resultado[] = [
  'servico-realizado',
  'cliente-decidindo',
  'cliente-nao-respondeu',
  'nao-fechamos',
  'outro',
];

/**
 * Por que o profissional não consegue atender. Opcional — a recusa acontece
 * com ou sem motivo; o motivo só existe porque um dia melhora o encaminhamento.
 */
export type MotivoRecusa =
  | 'fora-da-area'
  | 'nao-faco-esse-servico'
  | 'sem-disponibilidade'
  | 'outro';

export const rotuloMotivoRecusa: Record<MotivoRecusa, string> = {
  'fora-da-area': 'Fora da minha área de atendimento',
  'nao-faco-esse-servico': 'Não faço esse tipo de serviço',
  'sem-disponibilidade': 'Sem disponibilidade agora',
  outro: 'Outro motivo',
};

export const motivosDeRecusa: MotivoRecusa[] = [
  'fora-da-area',
  'nao-faco-esse-servico',
  'sem-disponibilidade',
  'outro',
];

/**
 * Um acontecimento real na vida da oportunidade. Nada aqui é decorativo: se
 * não aconteceu, não vira linha.
 */
export type TipoDeEvento = 'recebida' | 'vista' | 'interesse' | 'contato' | 'encerrada';

export type Evento = {
  tipo: TipoDeEvento;
  em: Date;
  /** Complemento só quando ele diz algo que o tipo não diz. */
  detalhe?: string;
};

export const rotuloEvento: Record<TipoDeEvento, string> = {
  recebida: 'Chegou até você',
  vista: 'Você abriu',
  interesse: 'Você disse que consegue atender',
  contato: 'Você iniciou o contato',
  encerrada: 'Encerrada',
};

/**
 * Como falar com a pessoa.
 *
 * Nasce `null` e só é preenchido depois que o profissional se coloca à
 * disposição. Isso não é uma regra de tela: é o repositório que não entrega o
 * telefone antes da hora, para que nenhuma tela possa vazá-lo por descuido.
 */
export type Contato = {
  /** Só o primeiro nome. Não somos rede social. */
  primeiroNome: string;
  /** E.164, sem máscara. A interface formata. */
  telefone: string;
  whatsapp: boolean;
};

export type Oportunidade = {
  id: string;
  /** O balcão: "Ar-condicionado e refrigeração", "Elétrica", "Informática". */
  categoria: string;
  /** O problema em uma linha, na voz da pessoa. É o título da tela. */
  necessidade: string;
  /** O relato completo, quando a pessoa escreveu mais do que uma linha. */
  descricao: string | null;
  /** Bairro. Nunca o endereço. */
  regiao: string;
  urgencia: Urgencia;
  /** Observações que a pessoa acrescentou. `null` quando não houver. */
  observacoes: string | null;
  recebidaEm: Date;
  /** Quando o conteúdo mudou pela última vez. Igual a `recebidaEm` se nunca. */
  atualizadaEm: Date;
  estado: Estado;
  /** `null` até o profissional demonstrar interesse. */
  contato: Contato | null;
  /** Preenchido no encerramento. */
  resultado: Resultado | null;
  motivoRecusa: MotivoRecusa | null;
  /** Do mais antigo para o mais recente. */
  historico: Evento[];
};

/** O que a Home precisa saber sobre quem abriu o aplicativo. */
export type ResumoProfissional = {
  primeiroNome: string;
  empresa: string | null;
  categorias: string[];
  /** Falso quando a pessoa pausou o recebimento. */
  recebendo: boolean;
};

/** Uma pendência só existe quando muda o que a pessoa recebe. */
export type Pendencia = {
  id: string;
  titulo: string;
  explicacao: string;
  acao: string;
};

/** O que uma leitura da carteira devolve. */
export type Carteira = {
  profissional: ResumoProfissional;
  oportunidades: Oportunidade[];
  pendencia: Pendencia | null;
  /** `true` enquanto a conta nunca recebeu nada. */
  contaNova: boolean;
};

/** Ordena o que espera resposta primeiro, e dentro disso o mais recente. */
export function ordemDeLeitura(a: Oportunidade, b: Oportunidade): number {
  const peso: Record<Estado, number> = {
    nova: 0,
    vista: 1,
    interessado: 2,
    'em-contato': 3,
    encerrada: 4,
  };
  const dp = peso[a.estado] - peso[b.estado];
  if (dp !== 0) return dp;
  return b.recebidaEm.getTime() - a.recebidaEm.getTime();
}

/** Quanto disso ainda espera uma decisão sua. É o número do selo da aba. */
export function contarEsperando(lista: Oportunidade[]): number {
  return lista.filter((o) => grupoDoEstado[o.estado] === 'atencao').length;
}

/** Quanto tempo faz, em linguagem de conversa. */
export function tempoRelativo(data: Date, agora: Date = new Date()): string {
  const minutos = Math.max(0, Math.round((agora.getTime() - data.getTime()) / 60000));
  if (minutos < 2) return 'agora';
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `há ${horas} h`;
  const dias = Math.round(horas / 24);
  if (dias === 1) return 'ontem';
  if (dias < 7) return `há ${dias} dias`;
  const semanas = Math.round(dias / 7);
  return semanas === 1 ? 'há 1 semana' : `há ${semanas} semanas`;
}

/** A data por extenso, para quando "há 3 dias" não bastar. */
export function dataPorExtenso(data: Date): string {
  const dia = data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
  const hora = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${dia}, ${hora}`;
}

/** (99) 99999-9999 a partir de +5599999999999. */
export function telefoneLegivel(e164: string): string {
  const d = e164.replace(/\D/g, '').replace(/^55/, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return e164;
}
