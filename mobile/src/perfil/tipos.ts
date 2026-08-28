/**
 * O perfil profissional — quem atende, do lado de quem atende.
 *
 * Este perfil não existe para o parceiro "ter uma página bonita". Ele existe
 * porque três coisas dependem dele: **para quem** o Canaã Resolve encaminha
 * uma oportunidade, **se** o morador confia no que lê, e **se** ele decide
 * chamar. Todo campo aqui responde pelo menos uma dessas perguntas — o que não
 * respondia nenhuma não foi pedido.
 *
 * Estes tipos são o contrato da interface. Os dados de exemplo (`exemplos.ts`)
 * e, mais tarde, a API, se adaptam a eles — nunca o contrário.
 */

/**
 * Quem é o titular.
 *
 * Dois, e só dois. Não somos sistema contábil: MEI, autônomo e ME não são
 * categorias de tela — são a mesma pessoa preenchendo o mesmo formulário. O
 * tipo existe por um motivo de apresentação: uma empresa tem logo e
 * responsável; uma pessoa tem rosto e ofício. Forçar uma a parecer a outra é o
 * que deixa o perfil com cara de cadastro.
 */
export type TipoDePerfil = 'profissional' | 'empresa';

export const rotuloTipo: Record<TipoDePerfil, string> = {
  profissional: 'Sou profissional',
  empresa: 'Somos uma empresa',
};

export const explicacaoTipo: Record<TipoDePerfil, string> = {
  profissional: 'Você atende com o seu nome.',
  empresa: 'O atendimento é no nome do negócio.',
};

/** Como chamar o campo do nome, conforme o tipo. */
export const rotuloNome: Record<TipoDePerfil, string> = {
  profissional: 'Seu nome',
  empresa: 'Nome da empresa',
};

/** Como chamar o campo de ofício, conforme o tipo. */
export const rotuloOficio: Record<TipoDePerfil, string> = {
  profissional: 'Sua profissão',
  empresa: 'O que a empresa faz',
};

/**
 * Uma imagem escolhida pelo parceiro.
 *
 * `origem` é a honestidade do módulo: enquanto não existir servidor de mídia,
 * toda imagem é `local` — ela vive no aparelho e só nele. Nada aqui finge que
 * subiu para algum lugar. Ver `imagem.ts` e `PERFIL.md`.
 */
export type Imagem = {
  uri: string;
  largura: number;
  altura: number;
  origem: 'local' | 'remota';
};

/**
 * Um serviço que o parceiro realiza.
 *
 * Categoria e serviço não são a mesma coisa: a categoria é o balcão
 * ("Informática"), o serviço é o que se faz nele ("formatação", "instalação de
 * rede"). É o serviço que faz o encaminhamento acertar.
 */
export type Servico = {
  id: string;
  rotulo: string;
  /** `true` quando o parceiro escreveu em vez de escolher da lista. */
  personalizado: boolean;
};

/** Onde o parceiro atende. O lançamento é hiperlocal; a estrutura não precisa ser. */
export type Atendimento = {
  /** Hoje, sempre Canaã dos Carajás. O campo existe para o dia em que não for. */
  cidade: string;
  /** `true` some com a lista de bairros: quem atende tudo não escolhe nada. */
  cidadeInteira: boolean;
  /** Só vale quando `cidadeInteira` é falso. */
  bairros: string[];
};

/**
 * Como o morador fala com o parceiro.
 *
 * O e-mail da conta e o e-mail comercial são coisas diferentes e não se
 * misturam: um serve para entrar no aplicativo, o outro para aparecer. Quem
 * não quiser publicar e-mail nenhum não publica.
 */
export type Contatos = {
  /** E.164, sem máscara. A interface formata. */
  whatsapp: string | null;
  telefone: string | null;
  /** `true` quando o telefone é o mesmo do WhatsApp — o normal, e não se digita duas vezes. */
  telefoneIgualWhatsapp: boolean;
  /** Comercial. Nunca herdado da conta sem o parceiro mandar. */
  email: string | null;
  /** Só o usuário, sem @ e sem URL. */
  instagram: string | null;
  site: string | null;
};

export type DiaSemana = 'seg' | 'ter' | 'qua' | 'qui' | 'sex' | 'sab' | 'dom';

export const diasDaSemana: DiaSemana[] = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];

export const rotuloDia: Record<DiaSemana, string> = {
  seg: 'Seg',
  ter: 'Ter',
  qua: 'Qua',
  qui: 'Qui',
  sex: 'Sex',
  sab: 'Sáb',
  dom: 'Dom',
};

export const rotuloDiaExtenso: Record<DiaSemana, string> = {
  seg: 'Segunda',
  ter: 'Terça',
  qua: 'Quarta',
  qui: 'Quinta',
  sex: 'Sexta',
  sab: 'Sábado',
  dom: 'Domingo',
};

/** Um intervalo de trabalho. "HH:MM", 24 h — a interface exibe como for melhor. */
export type Janela = { abre: string; fecha: string };

/**
 * Quando o parceiro trabalha.
 *
 * Não confundir com disponibilidade operacional: isto é o horário normal do
 * negócio, que o morador lê antes de ligar. Pausar o recebimento de
 * oportunidades é outra coisa, mora em outro lugar e não se resolve aqui.
 *
 * `porDia` existe para quem realmente trabalha diferente no sábado. Enquanto
 * for `null`, a mesma janela vale para todos os dias marcados — e a tela nem
 * mostra as sete linhas.
 */
export type Disponibilidade = {
  /** Guincho, chaveiro, socorro. Some com o resto quando ligado. */
  atende24h: boolean;
  dias: DiaSemana[];
  janela: Janela;
  porDia: Partial<Record<DiaSemana, Janela>> | null;
};

/**
 * Confiança verificada.
 *
 * Nesta fase só a estrutura e o estado — não existe envio de documento nem
 * quem analise. A tela diz isso com todas as letras em vez de mostrar um botão
 * que não faz nada.
 */
export type EstadoVerificacao =
  | 'nao-iniciada'
  | 'em-analise'
  | 'verificado'
  /** Conferimos e não bateu. Interno — o morador nunca lê isto (Fase 07, §84). */
  | 'rejeitada'
  /** Venceu ou mudou. Precisa ser reenviada para o selo continuar valendo. */
  | 'precisa-atualizacao';

export const rotuloVerificacao: Record<EstadoVerificacao, string> = {
  'nao-iniciada': 'Não verificado',
  'em-analise': 'Em análise',
  verificado: 'Parceiro verificado',
  rejeitada: 'Não confirmado',
  'precisa-atualizacao': 'Precisa de atualização',
};

/**
 * O que pode ser conferido (Fase 07, §81).
 *
 * Três, e nenhum a mais: cada um corresponde a uma conferência que uma pessoa
 * do Canaã Resolve consegue fazer de verdade — ligar para um número, olhar um
 * documento, consultar um registro. Um quarto tipo só entra quando existir o
 * processo que o sustenta.
 */
export type TipoDeVerificacao = 'contato' | 'identidade' | 'empresa';

/**
 * Uma conferência, com o estado dela.
 *
 * O significado público de cada uma — rótulo, descrição, limite e a frase de
 * que verificação não é garantia — mora em `reputacao/verificacao.ts`, junto
 * dos outros sinais de confiança. Aqui fica só o dado.
 *
 * Nada de documento, número ou evidência: isso é do processo interno e não
 * entra no objeto que a interface enxerga (§85, §86, §87).
 */
export type ItemDeVerificacao = {
  tipo: TipoDeVerificacao;
  estado: EstadoVerificacao;
  /** Quando foi confirmada. `null` quando ainda não foi. */
  em: Date | null;
};

export type Verificacao = {
  /**
   * O estado geral, que a Fase 04 já usava. Mantido para não reescrever as
   * telas que o leem — o detalhe por tipo vem em `itens`.
   */
  estado: EstadoVerificacao;
  /** Quando entrou em análise ou foi verificado. */
  em: Date | null;
  /**
   * O que foi conferido, item a item (Fase 07, §80).
   *
   * Vazio é o normal, e é o padrão de produção: não existe processo de
   * verificação aberto, então ninguém tem item nenhum. Um selo que aparecesse
   * por padrão seria o selo falso que o §19 dos critérios proíbe.
   */
  itens: ItemDeVerificacao[];
};

/** Uma foto de trabalho realizado. Não é postagem: não tem curtida nem data em destaque. */
export type ItemDePortfolio = {
  id: string;
  imagem: Imagem;
  /** Curta, opcional. "Instalação em Novo Horizonte" já basta. */
  legenda: string | null;
};

/** Teto desta fase. Não é plano comercial — é o que cabe bem na tela e na memória. */
export const MAXIMO_DE_FOTOS = 8;

/** Teto da descrição. Perfil se lê em dez segundos. */
export const MAXIMO_DA_DESCRICAO = 400;

/** Teto de serviços. Quem faz tudo não ajuda o encaminhamento a acertar. */
export const MAXIMO_DE_SERVICOS = 12;

/** Teto da legenda de uma foto. É legenda, não relato. */
export const MAXIMO_DA_LEGENDA = 60;

export type Perfil = {
  tipo: TipoDePerfil;
  /** Nome público: da pessoa ou do negócio. É o que o morador lê primeiro. */
  nome: string;
  /**
   * Quem responde pela empresa. Interno — não aparece para o morador.
   * `null` em perfil de pessoa, onde seria a mesma informação duas vezes.
   */
  responsavel: string | null;
  /** Foto de quem atende, ou logo do negócio. */
  imagem: Imagem | null;
  /** Id de uma categoria do catálogo. Nunca um texto solto. */
  categoriaId: string | null;
  /** O ofício em uma linha: "Eletricista", "Ar-condicionado e refrigeração". */
  oficio: string;
  descricao: string;
  servicos: Servico[];
  atendimento: Atendimento;
  contatos: Contatos;
  disponibilidade: Disponibilidade;
  portfolio: ItemDePortfolio[];
  verificacao: Verificacao;
  /** Quem entrou no começo. Só é verdade quando o Canaã Resolve disser que é. */
  parceiroFundador: boolean;
};

/** Um perfil recém-criado: vazio, mas válido. Nenhuma tela precisa tratar `undefined`. */
export function perfilVazio(nome: string): Perfil {
  return {
    tipo: 'profissional',
    nome,
    responsavel: null,
    imagem: null,
    categoriaId: null,
    oficio: '',
    descricao: '',
    servicos: [],
    atendimento: { cidade: 'Canaã dos Carajás', cidadeInteira: true, bairros: [] },
    contatos: {
      whatsapp: null,
      telefone: null,
      telefoneIgualWhatsapp: true,
      email: null,
      instagram: null,
      site: null,
    },
    disponibilidade: {
      atende24h: false,
      dias: ['seg', 'ter', 'qua', 'qui', 'sex'],
      janela: { abre: '08:00', fecha: '18:00' },
      porDia: null,
    },
    portfolio: [],
    verificacao: { estado: 'nao-iniciada', em: null, itens: [] },
    parceiroFundador: false,
  };
}

/* -------------------------------------------------------------------------- */
/*  Leitura — como cada informação vira frase                                 */
/* -------------------------------------------------------------------------- */

/** "(99) 99999-9999" a partir de "+5599999999999". */
export function telefoneLegivel(e164: string): string {
  const d = e164.replace(/\D/g, '').replace(/^55/, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return e164;
}

/** O telefone que vale para ligar, respeitando "é o mesmo do WhatsApp". */
export function telefoneDeLigacao(c: Contatos): string | null {
  return c.telefoneIgualWhatsapp ? c.whatsapp : c.telefone;
}

/** "Atende em toda Canaã dos Carajás" ou os bairros, em uma linha. */
export function atendimentoLegivel(a: Atendimento): string {
  if (a.cidadeInteira) return `Toda ${a.cidade}`;
  if (a.bairros.length === 0) return 'Nenhum bairro escolhido';
  if (a.bairros.length <= 3) return a.bairros.join(' · ');
  return `${a.bairros.slice(0, 2).join(' · ')} e mais ${a.bairros.length - 2}`;
}

/** Agrupa dias seguidos: "Seg a Sex", "Seg a Sex · Sáb". */
export function diasLegiveis(dias: DiaSemana[]): string {
  if (dias.length === 0) return 'Nenhum dia escolhido';
  if (dias.length === 7) return 'Todos os dias';

  const ordenados = diasDaSemana.filter((d) => dias.includes(d));
  const blocos: DiaSemana[][] = [];

  for (const dia of ordenados) {
    const ultimo = blocos[blocos.length - 1];
    const anterior = ultimo?.[ultimo.length - 1];
    const seguido =
      anterior !== undefined &&
      diasDaSemana.indexOf(dia) === diasDaSemana.indexOf(anterior) + 1;
    if (seguido && ultimo) ultimo.push(dia);
    else blocos.push([dia]);
  }

  return blocos
    .map((b) =>
      b.length >= 3
        ? `${rotuloDia[b[0]!]} a ${rotuloDia[b[b.length - 1]!]}`
        : b.map((d) => rotuloDia[d]).join(' · '),
    )
    .join(' · ');
}

/** O horário em uma frase, do jeito que o morador lê. */
export function horarioLegivel(d: Disponibilidade): string {
  if (d.atende24h) return 'Atende 24 horas, todos os dias';
  if (d.dias.length === 0) return 'Horário não informado';
  return `${diasLegiveis(d.dias)} · ${d.janela.abre} às ${d.janela.fecha}`;
}
