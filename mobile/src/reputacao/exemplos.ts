/**
 * Avaliações de exemplo — **só desenvolvimento**.
 *
 * Nada daqui é dado real e nada daqui chega a produção: quem lê estes objetos é
 * o repositório, e só quando não há API de dados configurada **e** `__DEV__` é
 * verdadeiro. As telas nunca importam este arquivo.
 *
 * A disciplina é a mesma das fases anteriores, e nesta fase ela pesa mais do
 * que em qualquer outra: uma avaliação inventada que vaze para produção não é
 * um dado errado — é uma mentira sobre uma pessoa da cidade. O §139 diz que um
 * perfil honesto escrito "ainda sem avaliações" vale mais do que um perfil
 * bonito com estrelas falsas, e é isso que este arquivo respeita ao existir
 * atrás de duas portas em vez de uma.
 *
 * **Os comentários não são caricatos (§112).** Nenhum "Excelente!!! Melhor da
 * cidade!!!". São frases do tamanho e do tom que uma pessoa de Canaã escreveria
 * — inclusive as críticas, que existem porque uma plataforma onde todo mundo
 * tem 5,0 não parece boa, parece falsa (§113).
 */

import type { Avaliacao, Nota } from './tipos';

export type Cenario =
  /** A — perfil sem avaliações. O estado mais importante do lançamento. */
  | 'sem-avaliacoes'
  /** B — duas avaliações. Amostra pequena, dita como pequena. */
  | 'poucas'
  /** C — histórico consistente, com uma crítica legítima no meio. */
  | 'consistente'
  /** E — uma negativa em primeiro plano, com resposta possível. */
  | 'negativa'
  /** F — uma avaliação contestada, em análise. */
  | 'denunciada'
  /** Falha ao carregar, para conferir o estado de erro. */
  | 'erro';

export const cenarios: Cenario[] = [
  'sem-avaliacoes',
  'poucas',
  'consistente',
  'negativa',
  'denunciada',
  'erro',
];

export const rotuloCenario: Record<Cenario, string> = {
  'sem-avaliacoes': 'Sem avaliações',
  poucas: 'Duas avaliações',
  consistente: '27 avaliações',
  negativa: 'Com uma negativa',
  denunciada: 'Uma em análise',
  erro: 'Falha ao carregar',
};

/** O rótulo do autor, já anonimizado — como a API terá de entregar (§40). */
const CLIENTE = 'Cliente Canaã Resolve';

const CATEGORIAS = [
  'Serviço de elétrica',
  'Ar-condicionado e refrigeração',
  'Serviço de elétrica',
  'Instalação de chuveiro',
];

function dias(atras: number): Date {
  return new Date(Date.now() - atras * 86_400_000);
}

type Semente = {
  nota: Nota;
  comentario?: string | null;
  atras: number;
  categoria?: string;
  resposta?: string;
  vista?: boolean;
};

function montar(id: string, s: Semente): Avaliacao {
  return {
    id,
    oportunidadeId: `o-${id}`,
    autor: CLIENTE,
    categoria: s.categoria ?? CATEGORIAS[Number(id.replace(/\D/g, '')) % CATEGORIAS.length]!,
    nota: s.nota,
    aspectos: null,
    comentario: s.comentario ?? null,
    em: dias(s.atras),
    editadaEm: null,
    estado: 'publicada',
    resposta: s.resposta
      ? { texto: s.resposta, em: dias(Math.max(0, s.atras - 1)), editadaEm: null }
      : null,
    denuncia: null,
    vista: s.vista ?? true,
  };
}

/* -------------------------------------------------------------------------- */
/*  As frases                                                                 */
/* -------------------------------------------------------------------------- */

const ELOGIOS = [
  'Atendimento rápido e resolveu o problema no mesmo dia.',
  'Explicou o serviço antes de começar e cumpriu o combinado.',
  'Chegou no horário que combinamos e deixou tudo limpo depois.',
  'Preço justo e trabalho bem feito. Já indiquei para um vizinho.',
  'Veio no sábado, que era o único dia que eu tinha. Fez direitinho.',
  'Passou o orçamento por escrito antes e não mudou depois.',
  'Trocou a fiação da cozinha e explicou o que estava errado.',
];

const MORNOS = [
  'O atendimento demorou mais do que eu esperava, mas o problema foi resolvido.',
  'Serviço bom. Só demorou para responder as mensagens no começo.',
  'Resolveu, mas precisei ligar duas vezes para marcar.',
];

const CRITICA_LEGITIMA =
  'Combinamos para as 9h e ele chegou perto do meio-dia, sem avisar que ia atrasar. O serviço em si ficou bom, mas fiquei a manhã inteira esperando.';

const CRITICA_DURA =
  'Marcamos duas vezes e nas duas ele não apareceu nem avisou. Na terceira eu já tinha chamado outra pessoa. Não recomendo pela falta de compromisso.';

/**
 * Um comentário longo de propósito, para provar o truncamento da lista e o
 * texto inteiro no detalhe (§97). Comprido, mas plausível.
 */
const COMENTARIO_LONGO =
  'Chamei para olhar um problema no quadro de energia que já vinha de meses, porque o disjuntor desarmava toda vez que ligava o chuveiro e o micro-ondas junto. Ele veio no mesmo dia, testou circuito por circuito e mostrou que o problema era um fio antigo que estava mal dimensionado para o chuveiro novo que a gente tinha instalado no ano passado. Trocou o trecho inteiro, reorganizou o quadro, identificou cada disjuntor com etiqueta e ainda explicou o que eu deveria evitar ligar ao mesmo tempo. Levou quase o dia todo, cobrou o que tinha falado no orçamento e não apareceu custo nenhum a mais no final.';

/* -------------------------------------------------------------------------- */
/*  Os cenários                                                               */
/* -------------------------------------------------------------------------- */

/** B — duas avaliações, uma delas **sem comentário nenhum** (cenário D). */
function poucas(): Avaliacao[] {
  return [
    montar('a1', { nota: 5, comentario: ELOGIOS[0]!, atras: 9 }),
    // Cenário D: cinco estrelas, sem texto. A ausência de comentário não pode
    // deixar o cartão com cara de erro.
    montar('a2', { nota: 5, comentario: null, atras: 26, vista: false }),
  ];
}

/**
 * C — 27 avaliações, média perto de 4,8, com uma crítica legítima no meio.
 *
 * Montado por semente e não à mão porque 27 objetos escritos um a um seriam 27
 * lugares para errar uma data. As notas são declaradas, não sorteadas: um
 * exemplo que muda a cada recarga é um exemplo que não dá para conferir.
 */
function consistente(): Avaliacao[] {
  const notas: Nota[] = [
    5, 5, 5, 4, 5, 5, 5, 5, 4, 5, 5, 5, 3, 5, 5, 4, 5, 5, 5, 5, 5, 5, 4, 5, 5, 5, 5,
  ];

  return notas.map((nota, i) => {
    const atras = 3 + i * 11;

    if (i === 0) {
      return montar(`c${i}`, {
        nota,
        comentario: COMENTARIO_LONGO,
        atras,
        vista: false,
      });
    }
    if (i === 12) {
      // A crítica legítima: nota 3, motivo concreto, e a resposta do
      // profissional logo abaixo. É o caso que o §66 manda não esconder.
      return montar(`c${i}`, {
        nota,
        comentario: CRITICA_LEGITIMA,
        atras,
        resposta:
          'Você tem razão sobre o atraso, e eu deveria ter avisado. Fiquei preso num serviço antes do seu que passou do tempo. Obrigado por dizer — passei a avisar quando vejo que vou atrasar.',
      });
    }
    if (nota === 4) {
      return montar(`c${i}`, { nota, comentario: MORNOS[i % MORNOS.length]!, atras });
    }
    // Nem toda avaliação tem texto, e a lista precisa saber conviver com isso.
    if (i % 5 === 3) return montar(`c${i}`, { nota, comentario: null, atras });
    return montar(`c${i}`, { nota, comentario: ELOGIOS[i % ELOGIOS.length]!, atras });
  });
}

/** E — a negativa em primeiro plano, ainda sem resposta. */
function negativa(): Avaliacao[] {
  return [
    montar('n1', { nota: 2, comentario: CRITICA_DURA, atras: 2, vista: false }),
    montar('n2', { nota: 5, comentario: ELOGIOS[1]!, atras: 14 }),
    montar('n3', { nota: 4, comentario: MORNOS[0]!, atras: 40 }),
    montar('n4', { nota: 5, comentario: null, atras: 66 }),
    montar('n5', { nota: 5, comentario: ELOGIOS[3]!, atras: 91 }),
  ];
}

/**
 * F — uma avaliação contestada, em análise.
 *
 * O que este cenário existe para provar não é o cartão: é o **resumo**. Com uma
 * das seis fora da conta, a média mostrada tem de ser a das cinco restantes, e
 * a tela precisa dizer por quê — em vez de o número mudar sozinho.
 */
function denunciada(): Avaliacao[] {
  const base = negativa();
  const contestada: Avaliacao = {
    ...montar('d1', { nota: 1, comentario: 'serviço péssimo, não faz nada direito', atras: 5 }),
    estado: 'em-analise',
    denuncia: {
      motivo: 'nao-corresponde',
      comentario: 'Nunca atendi esse cliente. Não tenho registro de serviço com ele.',
      em: dias(4),
      situacao: 'em-analise',
    },
  };
  return [contestada, ...base];
}

export function avaliacoesDeExemplo(cenario: Cenario): Avaliacao[] {
  switch (cenario) {
    case 'sem-avaliacoes':
      return [];
    case 'poucas':
      return poucas();
    case 'consistente':
      return consistente();
    case 'negativa':
      return negativa();
    case 'denunciada':
      return denunciada();
    case 'erro':
      return [];
  }
}
