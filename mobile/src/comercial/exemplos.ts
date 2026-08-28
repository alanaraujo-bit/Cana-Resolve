/**
 * Os nove cenários comerciais — **só desenvolvimento**.
 *
 * Nada daqui é dado real e nada daqui chega a produção: quem lê estes objetos é
 * o repositório, e só quando não há cenário escolhido **e** `__DEV__` é
 * verdadeiro. As telas nunca importam este arquivo.
 *
 * A disciplina vale mais aqui do que em qualquer módulo anterior, e o §147 diz
 * por quê: **uma compra simulada não pode parecer real**. Um exemplo de
 * avaliação que vaze é uma frase inventada; um exemplo comercial que vaze é
 * alguém achando que tem acesso pago que não tem — ou pior, achando que foi
 * cobrado. Por isso não existe nenhuma função aqui que **conceda** coisa
 * alguma: o que existe são situações a desenhar, e o entitlement de cada uma
 * vem escrito como o servidor o escreveria.
 *
 * Os nove cobrem o §146 inteiro, e cada um existe porque desenha uma tela
 * diferente. Se dois cenários produzissem a mesma tela, um deles seria enfeite.
 */

import type { Cobranca, Oferta, SituacaoComercial } from './tipos';

export type Cenario =
  /** A — aprovado, aguardando pagamento. A oferta aparece pela primeira vez. */
  | 'aprovado'
  /** B — pagamento em processamento. Nem sucesso, nem erro. */
  | 'processando'
  /** C — Fundador pago, aguardando o lançamento. O estado de hoje. */
  | 'reservado'
  /** D — Beta ativo, 72 dias restantes. */
  | 'ativo'
  /** E — Beta ativo, 7 dias restantes. O aviso liga. */
  | 'terminando'
  /** F — Beta encerrado, sem oferta posterior definida. */
  | 'encerrado'
  /** G — assinatura futura ativa, coexistindo com o Fundador. */
  | 'assinatura'
  /** H — pagamento falhou. */
  | 'falhou'
  /** I — assinatura cancelada, com acesso até o fim do período. */
  | 'cancelada'
  /** Em análise: o estado de quem se cadastrou e ainda não foi avaliado. */
  | 'analise'
  /** Falha ao carregar, para conferir o estado de "não deu para conferir". */
  | 'erro';

export const cenarios: Cenario[] = [
  'analise',
  'aprovado',
  'processando',
  'reservado',
  'ativo',
  'terminando',
  'encerrado',
  'assinatura',
  'falhou',
  'cancelada',
  'erro',
];

export const rotuloCenario: Record<Cenario, string> = {
  analise: 'Em análise',
  aprovado: 'A — aprovado, aguardando pagamento',
  processando: 'B — pagamento em processamento',
  reservado: 'C — Fundador pago, aguardando lançamento',
  ativo: 'D — Beta ativo, 72 dias',
  terminando: 'E — Beta termina em 7 dias',
  encerrado: 'F — Beta encerrado, sem oferta posterior',
  assinatura: 'G — assinatura futura ativa',
  falhou: 'H — pagamento não concluído',
  cancelada: 'I — assinatura cancelada ao fim do período',
  erro: 'Falha ao conferir a situação',
};

const DIA = 86_400_000;
const agora = () => new Date();
const daqui = (dias: number) => new Date(Date.now() + dias * DIA).toISOString();
const atras = (dias: number) => new Date(Date.now() - dias * DIA).toISOString();

/**
 * A oferta do Beta, como o servidor a entrega.
 *
 * Repare que ela vem **do exemplo do servidor**, e não de uma constante que a
 * tela consulta: o aplicativo publicado lê a oferta da resposta, e nada mais.
 * Esta cópia existe só para que o desenho possa ser conferido sem servidor.
 */
const OFERTA_DO_BETA: Oferta = {
  codigo: 'beta-fundador',
  versao: 1,
  nome: 'Parceiro Fundador',
  resumo: 'R$79 pelos primeiros 90 dias de operação.',
  descricao:
    'Participação na rede do Canaã Resolve como Parceiro Fundador, com a ' +
    'possibilidade de receber oportunidades compatíveis com os seus serviços. ' +
    'Os 90 dias começam quando o Canaã Resolve for oficialmente aberto aos ' +
    'moradores — e não na data do pagamento. Não há renovação automática e não ' +
    'há fidelidade: ao fim do período, você decide se quer continuar.',
  precoCentavos: 7900,
  moeda: 'BRL',
  periodoDias: 90,
  recorrencia: 'unica',
  plataformas: ['administrativa'],
  mercado: 'BR',
  beneficios: [
    'Participação na rede durante os 90 dias do Beta',
    'Possibilidade de receber oportunidades compatíveis',
    'Perfil profissional visível para os moradores',
    'Condição de Parceiro Fundador registrada no seu histórico',
  ],
  estado: 'ativa',
  exigeAprovacao: true,
};

/**
 * Uma assinatura hipotética, **só para desenhar os cenários G e I**.
 *
 * Ela não representa nenhum plano aprovado, e é por isso que não tem preço
 * nem nome de plano: o §12 diz que os valores pós-Beta são hipóteses, e um
 * exemplo com "Profissional — R$79/mês" desenhado bonito é a forma mais rápida
 * de uma hipótese virar decisão sem que ninguém a tenha tomado.
 */
const OFERTA_HIPOTETICA: Oferta = {
  codigo: 'continuidade',
  versao: 1,
  nome: 'Participação mensal',
  resumo: 'Exemplo de desenvolvimento. Nenhum plano pós-Beta foi aprovado.',
  descricao:
    'Este objeto existe apenas para conferir o desenho de uma assinatura ' +
    'recorrente. As condições de continuidade após o Beta ainda não foram ' +
    'definidas.',
  precoCentavos: 0,
  moeda: 'BRL',
  periodoDias: null,
  recorrencia: 'mensal',
  plataformas: ['ios', 'android'],
  mercado: 'BR',
  beneficios: [],
  estado: 'rascunho',
  exigeAprovacao: false,
};

const base = (): SituacaoComercial => ({
  servidorEm: agora().toISOString(),
  fundador: false,
  adesao: null,
  assinatura: null,
  acesso: {
    entitlements: [],
    origem: 'nenhuma',
    ate: null,
    justificativa: 'Nenhuma adesão e nenhuma assinatura registradas para esta conta.',
  },
  operacao: { iniciada: false, em: null },
  ofertaDisponivel: null,
  continuidade: { definida: false, renovacaoAutomatica: false },
});

const ABERTURA = atras(18);

export function situacaoDeExemplo(cenario: Cenario): SituacaoComercial {
  const s = base();

  switch (cenario) {
    case 'analise':
      return {
        ...s,
        adesao: {
          estado: 'em_analise',
          pagoEm: null,
          oferta: null,
          beta: { fase: 'aguardando-lancamento', inicio: null, fim: null, diasRestantes: null, diasDecorridos: null },
          terminando: false,
          categoria: 'Serviço de elétrica',
        },
        acesso: { ...s.acesso, justificativa: 'Adesão em "em_analise", que não concede acesso.' },
      };

    case 'aprovado':
      return {
        ...s,
        adesao: {
          estado: 'aprovado',
          pagoEm: null,
          oferta: null,
          beta: { fase: 'aguardando-lancamento', inicio: null, fim: null, diasRestantes: null, diasDecorridos: null },
          terminando: false,
          categoria: 'Serviço de elétrica',
        },
        acesso: { ...s.acesso, justificativa: 'Adesão em "aprovado", que não concede acesso.' },
        ofertaDisponivel: OFERTA_DO_BETA,
      };

    case 'processando':
      return {
        ...s,
        adesao: {
          estado: 'pagamento_pendente',
          pagoEm: null,
          oferta: OFERTA_DO_BETA,
          beta: { fase: 'aguardando-lancamento', inicio: null, fim: null, diasRestantes: null, diasDecorridos: null },
          terminando: false,
          categoria: 'Serviço de elétrica',
        },
        acesso: {
          ...s.acesso,
          justificativa: 'Adesão em "pagamento_pendente", que não concede acesso.',
        },
      };

    case 'falhou':
      // O estado volta a `aprovado`: a cobrança não passou, então a condição
      // continua disponível e a pessoa pode tentar de novo. Nenhum entitlement
      // foi criado no caminho — que é o §161 inteiro.
      return {
        ...s,
        adesao: {
          estado: 'aprovado',
          pagoEm: null,
          oferta: null,
          beta: { fase: 'aguardando-lancamento', inicio: null, fim: null, diasRestantes: null, diasDecorridos: null },
          terminando: false,
          categoria: 'Serviço de elétrica',
        },
        acesso: { ...s.acesso, justificativa: 'Adesão em "aprovado", que não concede acesso.' },
        ofertaDisponivel: OFERTA_DO_BETA,
      };

    case 'reservado':
      return {
        ...s,
        fundador: true,
        adesao: {
          estado: 'reservado',
          pagoEm: atras(6),
          oferta: OFERTA_DO_BETA,
          beta: { fase: 'aguardando-lancamento', inicio: null, fim: null, diasRestantes: null, diasDecorridos: null },
          terminando: false,
          categoria: 'Serviço de elétrica',
        },
        acesso: {
          entitlements: [],
          origem: 'aguardando-lancamento',
          ate: null,
          justificativa:
            'Beta Fundador pago e confirmado; a operação para moradores ainda não começou.',
        },
      };

    case 'ativo':
      return {
        ...s,
        fundador: true,
        adesao: {
          estado: 'ativo',
          pagoEm: atras(39),
          oferta: OFERTA_DO_BETA,
          beta: {
            fase: 'ativo',
            inicio: ABERTURA,
            fim: daqui(72),
            diasRestantes: 72,
            diasDecorridos: 18,
          },
          terminando: false,
          categoria: 'Serviço de elétrica',
        },
        acesso: {
          entitlements: ['participacao_na_rede', 'receber_oportunidades'],
          origem: 'beta',
          ate: daqui(72),
          justificativa: 'Beta Fundador em curso.',
        },
        operacao: { iniciada: true, em: ABERTURA },
      };

    case 'terminando':
      return {
        ...s,
        fundador: true,
        adesao: {
          estado: 'ativo',
          pagoEm: atras(104),
          oferta: OFERTA_DO_BETA,
          beta: {
            fase: 'ativo',
            inicio: atras(83),
            fim: daqui(7),
            diasRestantes: 7,
            diasDecorridos: 83,
          },
          terminando: true,
          categoria: 'Serviço de elétrica',
        },
        acesso: {
          entitlements: ['participacao_na_rede', 'receber_oportunidades'],
          origem: 'beta',
          ate: daqui(7),
          justificativa: 'Beta Fundador em curso.',
        },
        operacao: { iniciada: true, em: atras(83) },
      };

    case 'encerrado':
      return {
        ...s,
        fundador: true,
        adesao: {
          estado: 'encerrado',
          pagoEm: atras(120),
          oferta: OFERTA_DO_BETA,
          beta: {
            fase: 'encerrado',
            inicio: atras(95),
            fim: atras(5),
            diasRestantes: 0,
            diasDecorridos: 90,
          },
          terminando: false,
          categoria: 'Serviço de elétrica',
        },
        acesso: {
          entitlements: [],
          origem: 'nenhuma',
          ate: null,
          justificativa:
            'Beta Fundador encerrado. A condição histórica de Fundador permanece; ' +
            'o acesso comercial depende da continuidade, ainda não definida.',
        },
        operacao: { iniciada: true, em: atras(95) },
      };

    case 'assinatura':
      return {
        ...s,
        fundador: true,
        adesao: {
          estado: 'encerrado',
          pagoEm: atras(200),
          oferta: OFERTA_DO_BETA,
          beta: {
            fase: 'encerrado',
            inicio: atras(180),
            fim: atras(90),
            diasRestantes: 0,
            diasDecorridos: 90,
          },
          terminando: false,
          categoria: 'Serviço de elétrica',
        },
        assinatura: {
          estado: 'ativa',
          oferta: OFERTA_HIPOTETICA,
          periodoFim: daqui(23),
          renova: true,
          provedor: 'apple',
        },
        acesso: {
          entitlements: ['participacao_na_rede', 'receber_oportunidades'],
          origem: 'assinatura',
          ate: daqui(23),
          justificativa: 'Assinatura em estado "ativa".',
        },
        operacao: { iniciada: true, em: atras(180) },
        continuidade: { definida: true, renovacaoAutomatica: true },
      };

    case 'cancelada':
      return {
        ...s,
        fundador: true,
        adesao: {
          estado: 'encerrado',
          pagoEm: atras(200),
          oferta: OFERTA_DO_BETA,
          beta: {
            fase: 'encerrado',
            inicio: atras(180),
            fim: atras(90),
            diasRestantes: 0,
            diasDecorridos: 90,
          },
          terminando: false,
          categoria: 'Serviço de elétrica',
        },
        assinatura: {
          estado: 'cancelada',
          oferta: OFERTA_HIPOTETICA,
          periodoFim: daqui(12),
          renova: false,
          provedor: 'apple',
        },
        acesso: {
          entitlements: ['participacao_na_rede', 'receber_oportunidades'],
          origem: 'assinatura',
          ate: daqui(12),
          justificativa: 'Assinatura cancelada, com acesso até o fim do período já pago.',
        },
        operacao: { iniciada: true, em: atras(180) },
        continuidade: { definida: true, renovacaoAutomatica: false },
      };

    case 'erro':
      // Tratado antes de chegar aqui — o repositório lança. Este retorno existe
      // só para o tipo ficar exaustivo.
      return s;
  }
}

export function cobrancasDeExemplo(cenario: Cenario): Cobranca[] {
  const pago = (em: string, estado: Cobranca['estado'] = 'aprovado'): Cobranca => ({
    id: `c-${em}`,
    em,
    descricao: 'Parceiro Fundador — Beta de 90 dias',
    valorCentavos: 7900,
    moeda: 'BRL',
    estado,
    origem: 'Pagamento direto',
    comprovante: null,
  });

  switch (cenario) {
    case 'analise':
    case 'aprovado':
      return [];
    case 'falhou':
      return [{ ...pago(atras(1), 'falhou'), descricao: 'Parceiro Fundador — Beta de 90 dias' }];
    case 'processando':
      return [pago(atras(0), 'aguardando')];
    case 'reservado':
      return [pago(atras(6))];
    case 'ativo':
      return [pago(atras(39))];
    case 'terminando':
      return [pago(atras(104))];
    case 'encerrado':
      return [pago(atras(120))];
    case 'assinatura':
    case 'cancelada':
      return [pago(atras(200))];
    case 'erro':
      return [];
  }
}
