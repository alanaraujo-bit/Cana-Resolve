/**
 * A situação comercial — o objeto que o aplicativo recebe e desenha.
 *
 * Este é o contrato de `GET /api/v1/comercial/situacao`, e a decisão que o
 * organiza é o §27 e o §48 na mesma frase: **o cliente apresenta, o servidor
 * decide**. Por isso nada aqui é um dado cru a partir do qual o aparelho
 * calcula alguma coisa. `diasRestantes` chega pronto. `podeContratar` chega
 * pronto. `terminando` chega pronto. O aplicativo não faz aritmética de datas
 * para decidir acesso, e nenhuma alteração no relógio do celular muda uma
 * linha do que ele mostra (§29).
 *
 * As datas vão como texto ISO 8601 com fuso, e não como número de dias ou
 * data local: um `timestamptz` atravessa a rede sem perder o instante, e é o
 * aparelho que decide como escrever "30 de dezembro" para quem está lendo.
 *
 * `servidorEm` viaja junto de propósito. Ele é o que permite ao aplicativo
 * mostrar uma contagem que continua fazendo sentido depois de alguns minutos
 * de tela aberta, sem nunca ter de confiar no próprio relógio como referência
 * absoluta — e é o que a área de desenvolvimento usa para mostrar a diferença
 * entre os dois.
 */

import { estaTerminando, janelaDoBeta, type JanelaDoBeta } from "@/lib/domain/beta";
import { paraOAplicativo, type Oferta, type OfertaPublica } from "./catalogo";
import { derivarAcesso, type Acesso, type Entitlement, type OrigemDoAcesso } from "./entitlements";
import {
  ehFundador,
  podeContratar,
  type EstadoDaAdesao,
  type EstadoDaAssinatura,
  type EstadoDoPagamento,
} from "./estados";

/* -------------------------------------------------------------------------- */
/*  O que entra                                                               */
/* -------------------------------------------------------------------------- */

/** A adesão ao Beta, como o banco a guarda. */
export type Adesao = {
  estado: EstadoDaAdesao;
  /** Quando o pagamento foi confirmado. Nunca define, sozinho, o Beta. */
  pagoEm: Date | null;
  /** Só é preenchido no lançamento. Ver `lib/domain/beta.ts`. */
  betaInicio: Date | null;
  /** O par que identifica a condição comprada — ver o versionamento (§15). */
  ofertaCodigo: string | null;
  ofertaVersao: number | null;
  /** Em que categoria a vaga foi reservada, quando houver. */
  categoria: string | null;
};

export type Assinatura = {
  estado: EstadoDaAssinatura;
  ofertaCodigo: string;
  ofertaVersao: number;
  /** Fim do período já pago. Cancelar não encurta isto. */
  periodoFim: Date | null;
  /** `false` quando o profissional já desligou a renovação. */
  renova: boolean;
  /** Onde o profissional gerencia esta assinatura. */
  provedor: string;
};

export type EntradaDaSituacao = {
  agora: Date;
  /** `null` enquanto a operação para moradores não começou (§7). */
  inicioDaOperacao: Date | null;
  adesao: Adesao | null;
  assinatura: Assinatura | null;
  /** A oferta que a adesão comprou, se ainda existir no catálogo. */
  ofertaContratada: Oferta | null;
  /** A oferta ativa que este parceiro poderia contratar agora, se houver. */
  ofertaDisponivel: Oferta | null;
};

/* -------------------------------------------------------------------------- */
/*  O que sai                                                                 */
/* -------------------------------------------------------------------------- */

export type JanelaEnviada = {
  fase: JanelaDoBeta["fase"];
  inicio: string | null;
  fim: string | null;
  diasRestantes: number | null;
  diasDecorridos: number | null;
};

export type SituacaoComercial = {
  /** O relógio do servidor, no instante da resposta. */
  servidorEm: string;

  /**
   * Status histórico de Fundador (§10).
   *
   * Vem separado da adesão e do acesso porque é outra coisa: ele permanece
   * verdadeiro depois de o Beta terminar, e não concede nada.
   */
  fundador: boolean;

  adesao: {
    estado: EstadoDaAdesao;
    pagoEm: string | null;
    /** A condição comprada, como ela era quando foi comprada. */
    oferta: OfertaPublica | null;
    beta: JanelaEnviada;
    /** O Beta está nos últimos dias e vale dizer isso (§32). */
    terminando: boolean;
    categoria: string | null;
  } | null;

  assinatura: {
    estado: EstadoDaAssinatura;
    oferta: OfertaPublica | null;
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

  operacao: {
    /** A operação para moradores já começou? */
    iniciada: boolean;
    /**
     * Quando. `null` significa **não definida**, e é o caso de hoje.
     *
     * Nenhum consumidor deste campo pode inventar um valor quando ele é nulo
     * (§7). A frase certa é "avisaremos quando a operação começar".
     */
    em: string | null;
  };

  /**
   * A oferta que este parceiro pode contratar **agora**.
   *
   * `null` para quem está em análise, para quem já é Fundador pago e para quem
   * não é elegível. É o §77 em um campo: não existe checkout antes de haver
   * elegibilidade, então a interface não precisa lembrar de escondê-lo.
   */
  ofertaDisponivel: OfertaPublica | null;

  /**
   * O que acontece depois do Beta.
   *
   * `definida: false` é a verdade de hoje, e a interface diz exatamente isso —
   * "estamos finalizando as condições de continuidade" (§33). O que ela nunca
   * faz é preencher esse vazio com uma oferta inventada.
   */
  continuidade: {
    definida: boolean;
    /** Renovação automática. Sempre `false` enquanto não houver decisão (§34). */
    renovacaoAutomatica: boolean;
  };
};

const iso = (d: Date | null): string | null => (d ? d.toISOString() : null);

function enviarJanela(j: JanelaDoBeta): JanelaEnviada {
  return {
    fase: j.fase,
    inicio: iso(j.inicio),
    fim: iso(j.fim),
    diasRestantes: j.diasRestantes,
    diasDecorridos: j.diasDecorridos,
  };
}

/**
 * Monta a situação inteira. Pura: mesma entrada, mesma saída, sem I/O.
 *
 * É aqui que os quatro conceitos se encontram sem se misturar — e é por isso
 * que esta função é testável linha a linha sem banco, sem rede e sem loja.
 */
export function montarSituacao(entrada: EntradaDaSituacao): SituacaoComercial {
  const { agora, inicioDaOperacao, adesao, assinatura, ofertaContratada, ofertaDisponivel } =
    entrada;

  const janela = janelaDoBeta(adesao?.betaInicio ?? null, agora);

  const acesso: Acesso = derivarAcesso({
    adesao: adesao ? { estado: adesao.estado, betaFim: janela.fim } : null,
    assinatura: assinatura
      ? { estado: assinatura.estado, periodoFim: assinatura.periodoFim }
      : null,
    agora,
  });

  // A oferta só é apresentada a quem pode contratar. Filtrar aqui, e não na
  // tela, é o que impede um checkout de aparecer para quem está em análise.
  const oferecivel =
    adesao && podeContratar(adesao.estado) && ofertaDisponivel?.estado === "ativa"
      ? paraOAplicativo(ofertaDisponivel)
      : null;

  return {
    servidorEm: agora.toISOString(),
    fundador: adesao ? ehFundador(adesao.estado) : false,

    adesao: adesao
      ? {
          estado: adesao.estado,
          pagoEm: iso(adesao.pagoEm),
          oferta: ofertaContratada ? paraOAplicativo(ofertaContratada) : null,
          beta: enviarJanela(janela),
          terminando: estaTerminando(janela),
          categoria: adesao.categoria,
        }
      : null,

    assinatura: assinatura
      ? {
          estado: assinatura.estado,
          oferta: null,
          periodoFim: iso(assinatura.periodoFim),
          renova: assinatura.renova,
          provedor: assinatura.provedor,
        }
      : null,

    acesso: {
      entitlements: acesso.entitlements,
      origem: acesso.origem,
      ate: iso(acesso.ate),
      justificativa: acesso.justificativa,
    },

    operacao: {
      iniciada: inicioDaOperacao !== null && inicioDaOperacao.getTime() <= agora.getTime(),
      em: iso(inicioDaOperacao),
    },

    ofertaDisponivel: oferecivel,

    /*
     * Enquanto não houver decisão comercial sobre o pós-Beta, os dois campos
     * são fixos — e `renovacaoAutomatica: false` é uma promessa, não um
     * padrão: nenhuma cobrança acontece sem oferta aprovada (§34).
     */
    continuidade: { definida: false, renovacaoAutomatica: false },
  };
}

/* -------------------------------------------------------------------------- */
/*  Histórico de cobrança                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Uma linha do histórico de cobrança (§63).
 *
 * Simples de propósito: data, descrição, valor, estado e o comprovante quando
 * o provedor oferecer um. Não é software contábil, e não emite documento
 * fiscal — ver `BLOCKERS.md` sobre nota fiscal.
 */
export type Cobranca = {
  id: string;
  em: string;
  descricao: string;
  valorCentavos: number;
  moeda: string;
  estado: EstadoDoPagamento;
  /** De onde veio a cobrança, em linguagem de gente. Ex.: "Pagamento direto". */
  origem: string;
  /**
   * Link para o comprovante do provedor, quando existir.
   *
   * `null` é o caso de hoje, e é honesto: não se gera um recibo de mentira
   * para preencher a coluna (§64).
   */
  comprovante: string | null;
};
