/**
 * A situação comercial — o contrato, do lado do aplicativo.
 *
 * O outro lado deste contrato é `lib/domain/comercial/situacao.ts`, no
 * repositório do site. Os dois precisam concordar, e a forma de garantir isso é
 * a mesma da Fase 06: **`lerSituacao` recusa o que não bater**, e o aplicativo
 * trata uma resposta desconhecida como "não consegui conferir" em vez de
 * estourar ou, pior, de assumir permissão.
 *
 * ## A regra que atravessa este módulo inteiro
 *
 * > **O aplicativo não calcula acesso, não conta dias e não confia no relógio
 * > do aparelho.**
 *
 * `diasRestantes`, `terminando`, `podeContratar` e a lista de entitlements
 * chegam prontos do servidor. Aqui não existe `Date.now() - inicio`, não
 * existe `if (fundador) liberar`, e não existe nenhum caminho pelo qual mudar
 * a data do celular estenda coisa alguma. O que este arquivo faz é **traduzir
 * estado em português** — que é o trabalho de uma interface.
 *
 * ## E a regra que decide o que aparece na tela
 *
 * `desconhecida` é um estado de primeira classe, e ele **não é** "sem acesso".
 * Uma tela que diz "seu período terminou" quando na verdade não deu para
 * perguntar está acusando alguém de não ter pago. As duas frases são
 * diferentes, e a diferença mora em `situacaoConhecida`.
 */

/* -------------------------------------------------------------------------- */
/*  O contrato                                                                */
/* -------------------------------------------------------------------------- */

export type EstadoDaAdesao =
  | 'em_analise'
  | 'aprovado'
  | 'pagamento_pendente'
  | 'reservado'
  | 'ativo'
  | 'encerrado'
  | 'categoria_cheia'
  | 'nao_elegivel'
  | 'cancelado';

export type EstadoDaAssinatura =
  | 'pendente'
  | 'ativa'
  | 'pagamento_atrasado'
  | 'tolerancia'
  | 'cancelada'
  | 'expirada';

export type EstadoDoPagamento =
  | 'criado'
  | 'aguardando'
  | 'aprovado'
  | 'falhou'
  | 'cancelado'
  | 'reembolsado'
  | 'contestado';

export type Entitlement = 'participacao_na_rede' | 'receber_oportunidades';

export type OrigemDoAcesso =
  | 'beta'
  | 'assinatura'
  | 'aguardando-lancamento'
  | 'nenhuma'
  | 'desconhecida';

export type FaseDoBeta = 'aguardando-lancamento' | 'ativo' | 'encerrado';

export type Recorrencia = 'unica' | 'mensal' | 'anual';

export type Oferta = {
  codigo: string;
  versao: number;
  nome: string;
  resumo: string;
  descricao: string;
  precoCentavos: number;
  moeda: string;
  periodoDias: number | null;
  recorrencia: Recorrencia;
  plataformas: string[];
  mercado: string;
  beneficios: string[];
  estado: 'rascunho' | 'ativa' | 'encerrada';
  exigeAprovacao: boolean;
};

export type Janela = {
  fase: FaseDoBeta;
  inicio: string | null;
  fim: string | null;
  diasRestantes: number | null;
  diasDecorridos: number | null;
};

export type SituacaoComercial = {
  servidorEm: string;
  fundador: boolean;
  adesao: {
    estado: EstadoDaAdesao;
    pagoEm: string | null;
    oferta: Oferta | null;
    beta: Janela;
    terminando: boolean;
    categoria: string | null;
  } | null;
  assinatura: {
    estado: EstadoDaAssinatura;
    oferta: Oferta | null;
    periodoFim: string | null;
    renova: boolean;
    provedor: string;
  } | null;
  acesso: {
    entitlements: Entitlement[];
    origem: OrigemDoAcesso;
    ate: string | null;
    justificativa: string;
  };
  operacao: { iniciada: boolean; em: string | null };
  ofertaDisponivel: Oferta | null;
  continuidade: { definida: boolean; renovacaoAutomatica: boolean };
};

export type Cobranca = {
  id: string;
  em: string;
  descricao: string;
  valorCentavos: number;
  moeda: string;
  estado: EstadoDoPagamento;
  origem: string;
  comprovante: string | null;
};

/* -------------------------------------------------------------------------- */
/*  Leitura defensiva                                                         */
/* -------------------------------------------------------------------------- */

const ADESOES: readonly EstadoDaAdesao[] = [
  'em_analise',
  'aprovado',
  'pagamento_pendente',
  'reservado',
  'ativo',
  'encerrado',
  'categoria_cheia',
  'nao_elegivel',
  'cancelado',
];

const ORIGENS: readonly OrigemDoAcesso[] = [
  'beta',
  'assinatura',
  'aguardando-lancamento',
  'nenhuma',
  'desconhecida',
];

const ENTITLEMENTS: readonly Entitlement[] = ['participacao_na_rede', 'receber_oportunidades'];

function texto(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v : null;
}

function numero(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function lerOferta(bruto: unknown): Oferta | null {
  if (!bruto || typeof bruto !== 'object') return null;
  const o = bruto as Record<string, unknown>;
  const codigo = texto(o.codigo);
  const preco = numero(o.precoCentavos);
  if (!codigo || preco === null) return null;

  return {
    codigo,
    versao: numero(o.versao) ?? 1,
    nome: texto(o.nome) ?? 'Participação',
    resumo: texto(o.resumo) ?? '',
    descricao: texto(o.descricao) ?? '',
    precoCentavos: preco,
    moeda: texto(o.moeda) ?? 'BRL',
    periodoDias: numero(o.periodoDias),
    recorrencia:
      o.recorrencia === 'mensal' || o.recorrencia === 'anual' ? o.recorrencia : 'unica',
    plataformas: Array.isArray(o.plataformas) ? o.plataformas.filter((p) => typeof p === 'string') : [],
    mercado: texto(o.mercado) ?? 'BR',
    beneficios: Array.isArray(o.beneficios)
      ? o.beneficios.filter((b): b is string => typeof b === 'string')
      : [],
    estado: o.estado === 'ativa' || o.estado === 'encerrada' ? o.estado : 'rascunho',
    exigeAprovacao: o.exigeAprovacao !== false,
  };
}

function lerJanela(bruto: unknown): Janela {
  const j = (bruto ?? {}) as Record<string, unknown>;
  const fase =
    j.fase === 'ativo' || j.fase === 'encerrado' ? j.fase : ('aguardando-lancamento' as const);
  return {
    fase,
    inicio: texto(j.inicio),
    fim: texto(j.fim),
    diasRestantes: numero(j.diasRestantes),
    diasDecorridos: numero(j.diasDecorridos),
  };
}

/**
 * Lê a resposta do servidor sem confiar em nada.
 *
 * Devolve `null` quando a resposta não é reconhecível — e quem chamou trata
 * isso como situação desconhecida, **nunca** como situação vazia. A diferença
 * importa: uma situação vazia diria "você não tem nada", que é uma afirmação
 * sobre a conta de alguém, e não sobre a nossa incapacidade de ler a resposta.
 */
export function lerSituacao(bruto: unknown): SituacaoComercial | null {
  if (!bruto || typeof bruto !== 'object') return null;
  const s = bruto as Record<string, unknown>;

  const servidorEm = texto(s.servidorEm);
  const acessoBruto = s.acesso as Record<string, unknown> | undefined;
  if (!servidorEm || !acessoBruto) return null;

  const origem = ORIGENS.includes(acessoBruto.origem as OrigemDoAcesso)
    ? (acessoBruto.origem as OrigemDoAcesso)
    : 'desconhecida';

  const entitlements = Array.isArray(acessoBruto.entitlements)
    ? (acessoBruto.entitlements.filter((e) =>
        ENTITLEMENTS.includes(e as Entitlement),
      ) as Entitlement[])
    : [];

  const adesaoBruta = s.adesao as Record<string, unknown> | null | undefined;
  const adesao =
    adesaoBruta && ADESOES.includes(adesaoBruta.estado as EstadoDaAdesao)
      ? {
          estado: adesaoBruta.estado as EstadoDaAdesao,
          pagoEm: texto(adesaoBruta.pagoEm),
          oferta: lerOferta(adesaoBruta.oferta),
          beta: lerJanela(adesaoBruta.beta),
          terminando: adesaoBruta.terminando === true,
          categoria: texto(adesaoBruta.categoria),
        }
      : null;

  const assinaturaBruta = s.assinatura as Record<string, unknown> | null | undefined;
  const assinatura = assinaturaBruta?.estado
    ? {
        estado: assinaturaBruta.estado as EstadoDaAssinatura,
        oferta: lerOferta(assinaturaBruta.oferta),
        periodoFim: texto(assinaturaBruta.periodoFim),
        renova: assinaturaBruta.renova === true,
        provedor: texto(assinaturaBruta.provedor) ?? 'desconhecido',
      }
    : null;

  const operacao = (s.operacao ?? {}) as Record<string, unknown>;
  const continuidade = (s.continuidade ?? {}) as Record<string, unknown>;

  return {
    servidorEm,
    fundador: s.fundador === true,
    adesao,
    assinatura,
    acesso: {
      entitlements,
      origem,
      ate: texto(acessoBruto.ate),
      justificativa: texto(acessoBruto.justificativa) ?? '',
    },
    operacao: { iniciada: operacao.iniciada === true, em: texto(operacao.em) },
    ofertaDisponivel: lerOferta(s.ofertaDisponivel),
    // Na dúvida, **não** definida e **não** renovando: a omissão nunca pode
    // virar "sim, isso renova sozinho".
    continuidade: {
      definida: continuidade.definida === true,
      renovacaoAutomatica: continuidade.renovacaoAutomatica === true,
    },
  };
}

export function lerCobrancas(bruto: unknown): Cobranca[] {
  const lista = (bruto as { cobrancas?: unknown })?.cobrancas;
  if (!Array.isArray(lista)) return [];

  return lista
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const c = item as Record<string, unknown>;
      const id = texto(c.id);
      const valor = numero(c.valorCentavos);
      const em = texto(c.em);
      if (!id || valor === null || !em) return null;
      return {
        id,
        em,
        descricao: texto(c.descricao) ?? 'Cobrança',
        valorCentavos: valor,
        moeda: texto(c.moeda) ?? 'BRL',
        estado: (texto(c.estado) ?? 'aprovado') as EstadoDoPagamento,
        origem: texto(c.origem) ?? 'Pagamento',
        comprovante: texto(c.comprovante),
      };
    })
    .filter((c): c is Cobranca => c !== null);
}

/**
 * A situação de quem não conseguiu perguntar.
 *
 * Repare no que ela **não** faz: não inventa adesão, não diz que não há nada,
 * e não concede entitlement nenhum. Ela diz "não sei", e a tela sabe dizer
 * isso em português.
 */
export function situacaoDesconhecida(): SituacaoComercial {
  return {
    servidorEm: new Date().toISOString(),
    fundador: false,
    adesao: null,
    assinatura: null,
    acesso: {
      entitlements: [],
      origem: 'desconhecida',
      ate: null,
      justificativa: 'Não foi possível conferir a situação comercial.',
    },
    operacao: { iniciada: false, em: null },
    ofertaDisponivel: null,
    continuidade: { definida: false, renovacaoAutomatica: false },
  };
}

/* -------------------------------------------------------------------------- */
/*  As perguntas que as telas fazem                                           */
/* -------------------------------------------------------------------------- */

export function situacaoConhecida(s: SituacaoComercial): boolean {
  return s.acesso.origem !== 'desconhecida';
}

export function podeReceberOportunidades(s: SituacaoComercial): boolean {
  return s.acesso.entitlements.includes('receber_oportunidades');
}

/** A oferta só aparece quando o servidor a mandou — e ele só manda a quem pode. */
export function podeContratar(s: SituacaoComercial): boolean {
  return s.ofertaDisponivel !== null;
}

/* -------------------------------------------------------------------------- */
/*  Português                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * O nome da área, que muda com o estado (§25).
 *
 * A **rota** é sempre `/ajustes/plano`, para que um deep link gravado hoje
 * continue valendo; o que muda é o título. "Minha participação" é o que uma
 * pessoa em Beta reconhece; "Plano" só faz sentido quando existir um.
 */
export function nomeDaArea(s: SituacaoComercial | null): string {
  if (!s) return 'Minha participação';
  if (s.assinatura) return 'Plano';
  return 'Minha participação';
}

/** O estado, em uma palavra, para a linha das Configurações. */
export function resumoCurto(s: SituacaoComercial | null): string {
  if (!s || !situacaoConhecida(s)) return '';
  if (s.assinatura) return ASSINATURA_LEGIVEL[s.assinatura.estado];
  if (!s.adesao) return 'Sem participação';

  switch (s.adesao.estado) {
    case 'em_analise':
      return 'Em análise';
    case 'aprovado':
      return 'Aprovado';
    case 'pagamento_pendente':
      return 'Pagamento em processamento';
    case 'reservado':
      return 'Vaga garantida';
    case 'ativo':
      return s.adesao.beta.diasRestantes !== null
        ? `Beta ativo · ${s.adesao.beta.diasRestantes} ${s.adesao.beta.diasRestantes === 1 ? 'dia' : 'dias'}`
        : 'Beta ativo';
    case 'encerrado':
      return 'Beta encerrado';
    case 'categoria_cheia':
      return 'Categoria completa';
    case 'nao_elegivel':
      return 'Não elegível';
    case 'cancelado':
      return 'Encerrado';
  }
}

/**
 * Os estados da assinatura em linguagem de gente (§38).
 *
 * Sem `past_due`, sem `grace_period`, sem nome de gateway. "Pagamento
 * pendente" é o que a pessoa entende; `past_due` é o que o sistema chama.
 */
export const ASSINATURA_LEGIVEL: Record<EstadoDaAssinatura, string> = {
  pendente: 'Aguardando confirmação',
  ativa: 'Ativo',
  pagamento_atrasado: 'Pagamento pendente',
  tolerancia: 'Pagamento pendente',
  cancelada: 'Cancelado',
  expirada: 'Encerrado',
};

export const PAGAMENTO_LEGIVEL: Record<EstadoDoPagamento, string> = {
  criado: 'Iniciado',
  aguardando: 'Em processamento',
  aprovado: 'Pago',
  falhou: 'Não concluído',
  cancelado: 'Cancelado',
  reembolsado: 'Reembolsado',
  contestado: 'Em contestação',
};

/* -------------------------------------------------------------------------- */
/*  Dinheiro e datas                                                          */
/* -------------------------------------------------------------------------- */

/**
 * O preço escrito.
 *
 * `Intl` e não `'R$ ' + valor`: no dia em que a loja devolver o preço
 * localizado dela, ou em que houver outro mercado, a concatenação estaria
 * errada em todo lugar de uma vez (§90).
 */
export function precoLegivel(centavos: number, moeda = 'BRL'): string {
  try {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: moeda,
      minimumFractionDigits: 2,
    }).format(centavos / 100);
  } catch {
    // Moeda desconhecida não pode derrubar a tela do plano.
    return `${(centavos / 100).toFixed(2)} ${moeda}`;
  }
}

const UNIDADES = [
  'zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove',
  'dez', 'onze', 'doze', 'treze', 'catorze', 'quinze', 'dezesseis', 'dezessete',
  'dezoito', 'dezenove',
];
const DEZENAS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const CENTENAS = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

function porExtenso(n: number): string {
  if (n < 20) return UNIDADES[n]!;
  if (n < 100) {
    const d = Math.floor(n / 10);
    const u = n % 10;
    return u ? `${DEZENAS[d]} e ${UNIDADES[u]}` : DEZENAS[d]!;
  }
  if (n === 100) return 'cem';
  if (n < 1000) {
    const c = Math.floor(n / 100);
    const r = n % 100;
    return r ? `${CENTENAS[c]} e ${porExtenso(r)}` : CENTENAS[c]!;
  }
  const milhares = Math.floor(n / 1000);
  const r = n % 1000;
  const cabeca = milhares === 1 ? 'mil' : `${porExtenso(milhares)} mil`;
  if (!r) return cabeca;
  return `${cabeca}${r < 100 || r % 100 === 0 ? ' e ' : ' '}${porExtenso(r)}`;
}

/**
 * O preço **falado** — o rótulo que o leitor de tela lê (§139).
 *
 * "R$79" é lido de maneiras diferentes por cada leitor, e "79/90" vira
 * "setenta e nove barra noventa". Escrever isto à mão é o que garante que a
 * informação comercial chegue inteira a quem não a vê.
 */
export function precoFalado(centavos: number, moeda = 'BRL'): string {
  if (moeda !== 'BRL') return precoLegivel(centavos, moeda);
  const reais = Math.floor(centavos / 100);
  const resto = centavos % 100;
  const parte = reais === 1 ? 'um real' : `${porExtenso(reais)} reais`;
  if (!resto) return parte;
  return `${parte} e ${resto === 1 ? 'um centavo' : `${porExtenso(resto)} centavos`}`;
}

/** A periodicidade, que **nunca** é omitida (§58). */
export function periodicidadeLegivel(oferta: Pick<Oferta, 'recorrencia' | 'periodoDias'>): string {
  if (oferta.recorrencia === 'mensal') return 'por mês';
  if (oferta.recorrencia === 'anual') return 'por ano';
  if (oferta.periodoDias === null) return 'pagamento único';
  return `pelos primeiros ${oferta.periodoDias} dias`;
}

export function condicaoLegivel(oferta: Oferta): string {
  return `${precoLegivel(oferta.precoCentavos, oferta.moeda)} ${periodicidadeLegivel(oferta)}`;
}

export function condicaoFalada(oferta: Oferta): string {
  return `${precoFalado(oferta.precoCentavos, oferta.moeda)} ${periodicidadeLegivel(oferta)}`;
}

export function renovaAutomaticamente(oferta: Oferta): boolean {
  return oferta.recorrencia !== 'unica';
}

/** "30 de dezembro de 2026". `null` quando não há data — e aí a tela não a mostra. */
export function dataLegivel(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** "3 de setembro" — sem o ano, para o histórico de cobrança do mesmo ano. */
export function dataCurta(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function diasLegivel(dias: number): string {
  return dias === 1 ? '1 dia' : `${dias} dias`;
}
