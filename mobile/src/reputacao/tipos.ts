/**
 * A reputação — por que um morador deveria confiar neste profissional.
 *
 * Este módulo responde essa pergunta, e não a outra, mais fácil e mais falsa:
 * "como fazemos este perfil parecer popular?". A diferença aparece em decisões
 * concretas espalhadas por este arquivo, e a mais importante delas é de tipo:
 *
 * > **`media` é `number | null`.** Um perfil sem avaliações não tem média — ele
 * > não tem *zero*. Mostrar "0,0 ★" para um parceiro que acabou de chegar é
 * > dizer que ele é ruim quando o que existe é ausência de dado. Fazer disso um
 * > `null` no tipo, e não um `if` na tela, é o que garante que nenhuma tela
 * > futura consiga regredir para "0,0" por descuido — a mesma disciplina com
 * > que o módulo de oportunidades faz o telefone **não existir** no objeto
 * > antes da hora, em vez de escondê-lo no render.
 *
 * Estes tipos são o contrato da interface. Os exemplos (`exemplos.ts`) e, mais
 * tarde, a API se adaptam a eles — nunca o contrário.
 */

/* -------------------------------------------------------------------------- */
/*  A nota                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * De 1 a 5. Familiar, e por isso não precisa de legenda.
 *
 * O tipo é literal e não `number` porque uma nota 0, 6 ou 4,5 não existe no
 * domínio: se um dia a API mandar uma, o lugar de recusá-la é a fronteira
 * (`repositorio`), e não cada componente que desenha estrela.
 */
export type Nota = 1 | 2 | 3 | 4 | 5;

export const NOTAS: readonly Nota[] = [1, 2, 3, 4, 5];

export function ehNota(v: unknown): v is Nota {
  return v === 1 || v === 2 || v === 3 || v === 4 || v === 5;
}

/**
 * O que o leitor de tela precisa ouvir (§95).
 *
 * "estrela, estrela, estrela, estrela contorno, estrela contorno" não é
 * informação — é ruído. A nota é **um** dado, e se anuncia como um.
 */
export function notaAcessivel(n: Nota): string {
  return `${n} de 5 estrelas`;
}

/**
 * Os poucos aspectos que valem perguntar (§9).
 *
 * Três, opcionais, e cada um só está aqui porque distingue reclamações que a
 * nota geral confunde: "resolveu, mas sumiu por dois dias" e "veio na hora,
 * mas não resolveu" recebem a mesma estrela e são problemas diferentes. Dez
 * critérios virariam uma pesquisa, e a pesquisa não seria respondida.
 */
export type Aspecto = 'atendimento' | 'qualidade' | 'pontualidade';

export const ASPECTOS: readonly Aspecto[] = ['atendimento', 'qualidade', 'pontualidade'];

export const rotuloAspecto: Record<Aspecto, string> = {
  atendimento: 'Atendimento',
  qualidade: 'Qualidade do serviço',
  pontualidade: 'Pontualidade',
};

/* -------------------------------------------------------------------------- */
/*  Moderação                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * O estado de moderação de uma avaliação (§20).
 *
 * Quatro, e a existência deles é o que permite dizer "não" a duas coisas ao
 * mesmo tempo: uma avaliação negativa **não** some porque incomodou (§17,
 * §66), e uma avaliação com o telefone de alguém dentro **não** fica no ar
 * porque ninguém tinha onde marcá-la (§69).
 *
 * O painel de moderação não existe nesta fase e não deveria — ele não é do
 * aplicativo do profissional (§129). O que existe aqui é o vocabulário que
 * torna esse painel possível depois sem migrar dado nenhum.
 */
export type EstadoDeModeracao =
  /** No ar, e contando para a média. O estado normal. */
  | 'publicada'
  /** Denunciada, esperando uma pessoa decidir. Continua visível ao profissional. */
  | 'em-analise'
  /** Decidida como violação. Sai da média e sai da lista pública. */
  | 'removida'
  /** Ocultada preventivamente por motivo grave, antes de a análise terminar. */
  | 'oculta';

/**
 * Quais estados entram na conta pública (§48, §49).
 *
 * A regra, escrita uma vez e decidida aqui e em nenhum outro lugar:
 *
 * - **`publicada` conta.**
 * - **`em-analise` NÃO conta.** É a escolha menos ruim das duas: contar uma
 *   avaliação que talvez seja fraude deixa a fraude funcionar enquanto a
 *   análise corre; não contar tira temporariamente o peso de uma avaliação
 *   possivelmente legítima. O primeiro erro premia quem manipula; o segundo
 *   apenas atrasa. E como a análise só começa por uma denúncia, a saída fica
 *   **visível**: a lista mostra "em análise" com todas as letras e o resumo
 *   informa quantas estão fora da conta — em vez de a média mudar sozinha e
 *   ninguém entender por quê.
 * - **`removida` e `oculta` não contam**, e não aparecem para o morador.
 */
export function contaParaAMedia(estado: EstadoDeModeracao): boolean {
  return estado === 'publicada';
}

/** O que o morador chega a ver. `em-analise` é visível só para o profissional. */
export function visivelPublicamente(estado: EstadoDeModeracao): boolean {
  return estado === 'publicada';
}

export const rotuloModeracao: Record<EstadoDeModeracao, string> = {
  publicada: 'Publicada',
  'em-analise': 'Em análise',
  removida: 'Removida',
  oculta: 'Oculta',
};

/**
 * A frase que o profissional lê, quando o estado não é o normal.
 *
 * `null` em `publicada` de propósito: uma avaliação comum não precisa de
 * etiqueta dizendo que é comum.
 */
export const explicacaoModeracao: Record<EstadoDeModeracao, string | null> = {
  publicada: null,
  'em-analise':
    'Sua contestação foi recebida. Enquanto uma pessoa analisa, esta avaliação não aparece para os moradores e não entra na sua média.',
  removida: 'Esta avaliação foi removida pelo Canaã Resolve e não conta na sua média.',
  oculta: 'Esta avaliação está oculta enquanto o Canaã Resolve analisa o conteúdo dela.',
};

/* -------------------------------------------------------------------------- */
/*  Denúncia                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Por que uma avaliação pode estar errada (§18).
 *
 * Seis motivos, cada um com uma consequência diferente do outro lado. Não há
 * "discordo da nota" na lista, e a ausência é o ponto: discordar não é motivo
 * de remoção, é motivo de **resposta** (§17).
 */
export type MotivoDeDenuncia =
  | 'ofensivo'
  | 'dados-pessoais'
  | 'nao-corresponde'
  | 'spam'
  | 'conflito'
  | 'outro';

export const motivosDeDenuncia: MotivoDeDenuncia[] = [
  'ofensivo',
  'dados-pessoais',
  'nao-corresponde',
  'spam',
  'conflito',
  'outro',
];

export const rotuloMotivoDeDenuncia: Record<MotivoDeDenuncia, string> = {
  ofensivo: 'Conteúdo ofensivo',
  'dados-pessoais': 'Expõe dados pessoais',
  'nao-corresponde': 'Não corresponde a um serviço meu',
  spam: 'Spam ou propaganda',
  conflito: 'Conflito de interesse',
  outro: 'Outro motivo',
};

/** A situação da contestação. Denunciar **não** remove (§19). */
export type SituacaoDaDenuncia = 'enviada' | 'em-analise' | 'concluida';

export type Denuncia = {
  motivo: MotivoDeDenuncia;
  /** Opcional. Ninguém precisa escrever redação para reclamar. */
  comentario: string | null;
  em: Date;
  situacao: SituacaoDaDenuncia;
};

/** Teto do complemento da denúncia. É contexto, não petição. */
export const MAXIMO_DA_DENUNCIA = 400;

/* -------------------------------------------------------------------------- */
/*  Resposta do profissional                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Uma resposta. **Uma** (§14).
 *
 * Por isso é um objeto e não uma lista: a forma do dado é o que impede a
 * discussão pública de existir. Um array aqui viraria thread na primeira
 * semana em que alguém tivesse pressa, e o Canaã Resolve não é rede social.
 *
 * `editadaEm` guarda que houve correção sem expor o histórico ao morador
 * (§15) — quem errou uma palavra não merece um "editado" carimbado por cima
 * da frase.
 */
export type Resposta = {
  texto: string;
  em: Date;
  editadaEm: Date | null;
};

/** Teto da resposta (§71). Espaço para esclarecer, não para manifesto. */
export const MAXIMO_DA_RESPOSTA = 600;

/** O mínimo que faz uma resposta ser uma resposta. */
export const MINIMO_DA_RESPOSTA = 2;

/* -------------------------------------------------------------------------- */
/*  A avaliação                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Uma avaliação de um serviço que aconteceu.
 *
 * `oportunidadeId` não é um campo administrativo: é a definição da entidade
 * (§5, §9). Uma avaliação sem oportunidade não é uma avaliação fraca — ela não
 * é uma avaliação. É o que impede o Canaã Resolve de virar um lugar onde
 * qualquer pessoa acha uma empresa e larga uma estrela (§6).
 *
 * **O que não está aqui é decisão, não esquecimento (§40).** Não há telefone,
 * e-mail, endereço, foto nem id de morador. `autor` é o rótulo já pronto para
 * exibição — "Cliente Canaã Resolve", ou o primeiro nome quando a política
 * permitir —, montado na origem. Uma tela não pode vazar um dado que nunca
 * chegou até ela.
 */
export type Avaliacao = {
  id: string;
  /** A oportunidade real que originou o serviço. Sem ela, não existe. */
  oportunidadeId: string;
  /** Já anonimizado na origem. Nunca um id, nunca um nome completo. */
  autor: string;
  /** O balcão do serviço, para dar contexto a quem lê (§41). Nunca o relato. */
  categoria: string;
  nota: Nota;
  /** Opcionais. `null` quando o morador não respondeu os aspectos. */
  aspectos: Partial<Record<Aspecto, Nota>> | null;
  /** Opcional (§11). A estrela sozinha já é informação. */
  comentario: string | null;
  em: Date;
  /** Quando o morador corrigiu a própria avaliação (§51). */
  editadaEm: Date | null;
  estado: EstadoDeModeracao;
  resposta: Resposta | null;
  /** A contestação deste profissional, quando houver. */
  denuncia: Denuncia | null;
  /** `false` enquanto o profissional não abriu esta avaliação (§77). */
  vista: boolean;
};

/**
 * Onde a lista corta um comentário longo (§97).
 *
 * Truncar existe para a lista continuar legível, não para esconder crítica: o
 * detalhe mostra o texto inteiro, sempre, e a lista diz "Ler tudo" em vez de
 * deixar reticências mudas.
 */
export const CORTE_NA_LISTA = 220;

/** Corta em fronteira de palavra, para não partir no meio de uma. */
export function resumirTexto(
  texto: string,
  limite = CORTE_NA_LISTA,
): { texto: string; cortado: boolean } {
  const limpo = texto.trim();
  if (limpo.length <= limite) return { texto: limpo, cortado: false };
  const fatia = limpo.slice(0, limite);
  const espaco = fatia.lastIndexOf(' ');
  const base = espaco > limite * 0.6 ? fatia.slice(0, espaco) : fatia;
  return { texto: `${base.trimEnd()}…`, cortado: true };
}

/**
 * O saneamento do que a pessoa escreveu (§132).
 *
 * Nada aqui renderiza HTML — o `<Text>` do React Native trata tudo como texto,
 * e é por isso que injeção não é o risco desta tela. O que **é** risco é
 * layout: caracteres de controle, dez linhas em branco seguidas e uma parede de
 * espaços quebram a composição de um cartão. Isso se resolve na entrada, uma
 * vez, e não em cada componente.
 */
export function textoSeguro(bruto: string, teto: number): string {
  const semControles = Array.from(bruto)
    .filter((c) => {
      // A quebra de linha e conteudo; o resto da faixa de controle nao e.
      if (c === '\n') return true;
      const cod = c.codePointAt(0) ?? 0;
      return !(cod < 0x20 || (cod >= 0x7f && cod <= 0x9f));
    })
    .join('');

  return semControles
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, teto);
}

/* -------------------------------------------------------------------------- */
/*  O resumo — a fonte única                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Quanta amostra existe (§26, §27, §45).
 *
 * A UI se adapta ao volume, e é este campo que ela lê. Sem ele, cada tela
 * decidiria sozinha a partir de que número mostrar distribuição — e três telas
 * discordariam na primeira semana.
 */
export type Volume = 'nenhuma' | 'poucas' | 'consistente';

/** A partir daqui a média começa a significar alguma coisa. */
export const VOLUME_CONSISTENTE = 5;

/** A partir daqui a distribuição por nota deixa de ser barra vazia (§45). */
export const VOLUME_PARA_DISTRIBUICAO = 8;

/** A partir daqui filtrar por nota poupa rolagem em vez de acrescentar controle (§44). */
export const VOLUME_PARA_FILTRO = 12;

export type ResumoDeReputacao = {
  /**
   * `null` quando não há avaliação contando. **Nunca 0.** Ver o cabeçalho
   * deste arquivo: é a regra que o tipo existe para tornar impossível de
   * quebrar.
   */
  media: number | null;
  /** Quantas contam para a média. É o número que acompanha a nota (§24). */
  total: number;
  /** Quantas por nota, só entre as que contam. */
  distribuicao: Record<Nota, number>;
  /** Quantas estão fora da conta por moderação. Explica uma média que mudou. */
  foraDaConta: number;
  ultimaEm: Date | null;
  volume: Volume;
};

/**
 * **A fonte única do cálculo (§47, §107).**
 *
 * Perfil, prévia, lista e — no dia em que existir — a área do morador chamam
 * esta função e nenhuma outra. Duas contas independentes divergem no primeiro
 * caso de borda, e quando divergem quem perde credibilidade é a plataforma, não
 * o componente.
 *
 * O arredondamento é de uma casa decimal, decidido aqui (§46). "4,87392" não é
 * mais preciso — é falsamente preciso, sobre uma amostra de vinte pessoas.
 */
export function resumir(avaliacoes: readonly Avaliacao[]): ResumoDeReputacao {
  const distribuicao: Record<Nota, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let soma = 0;
  let total = 0;
  let foraDaConta = 0;
  let ultimaEm: Date | null = null;

  for (const a of avaliacoes) {
    if (!contaParaAMedia(a.estado)) {
      foraDaConta += 1;
      continue;
    }
    total += 1;
    soma += a.nota;
    distribuicao[a.nota] += 1;
    if (!ultimaEm || a.em.getTime() > ultimaEm.getTime()) ultimaEm = a.em;
  }

  return {
    media: total === 0 ? null : Math.round((soma / total) * 10) / 10,
    total,
    distribuicao,
    foraDaConta,
    ultimaEm,
    volume: total === 0 ? 'nenhuma' : total < VOLUME_CONSISTENTE ? 'poucas' : 'consistente',
  };
}

/** "4,8". Uma casa, vírgula decimal, e nada quando não há média. */
export function mediaLegivel(media: number | null): string | null {
  if (media === null) return null;
  return media.toFixed(1).replace('.', ',');
}

/** "23 avaliações" — a contagem que contextualiza a média (§24). */
export function contagemLegivel(total: number): string {
  if (total === 0) return 'Nenhuma avaliação';
  return total === 1 ? '1 avaliação' : `${total} avaliações`;
}

/**
 * A frase honesta sobre o que a amostra permite dizer (§25, §26, §27).
 *
 * Nenhuma delas conclui. "5,0 · 1 avaliação" é verdade e é pouco, e a frase
 * abaixo diz as duas coisas — em vez de "Excelente reputação", que seria uma
 * conclusão tirada de uma pessoa.
 */
export function fraseDeVolume(r: ResumoDeReputacao): string {
  if (r.volume === 'nenhuma') {
    return 'Ainda sem avaliações no Canaã Resolve.';
  }
  if (r.volume === 'poucas') {
    return r.total === 1
      ? 'Uma avaliação ainda diz pouco sobre um histórico. Ela aparece assim mesmo, sem arredondar para cima.'
      : 'Ainda são poucas avaliações. O número aparece como é, sem virar conclusão.';
  }
  return 'Média das avaliações de atendimentos feitos pelo Canaã Resolve.';
}

/**
 * O rótulo acessível do resumo inteiro (§95).
 *
 * Média e contagem chegam juntas ao leitor de tela, porque separadas elas
 * enganam do mesmo jeito que enganam no olho.
 */
export function resumoAcessivel(r: ResumoDeReputacao): string {
  if (r.media === null) return 'Ainda sem avaliações';
  return `${mediaLegivel(r.media)} de 5, em ${contagemLegivel(r.total).toLowerCase()}`;
}

/**
 * Quantas o profissional ainda não abriu (§77).
 *
 * **Esta contagem não é o selo da aba, e nunca pode virar.** O selo de
 * Oportunidades conta oportunidades esperando decisão (`contarEsperando`, no
 * domínio das oportunidades) e continua contando só isso — misturar as duas
 * transformaria um número específico em "tudo que aconteceu no aplicativo"
 * (§76). Este número alimenta um ponto discreto no Perfil, e nada mais.
 */
export function contarNaoVistas(avaliacoes: readonly Avaliacao[]): number {
  return avaliacoes.filter((a) => !a.vista && a.estado !== 'removida').length;
}

/** Mais recentes primeiro (§43). Sem relevância secreta. */
export function ordemDeLeitura(a: Avaliacao, b: Avaliacao): number {
  return b.em.getTime() - a.em.getTime();
}

/** A data como gente lê (§42): "Agosto de 2026". Sem hora. */
export function dataLegivel(d: Date): string {
  const texto = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Quando o mês não basta — no detalhe, onde há espaço. */
export function dataCompleta(d: Date): string {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

/**
 * O que o profissional pode fazer com uma avaliação (§128).
 *
 * A lista do que ele **não** pode é a parte importante, e ela não está aqui
 * porque não existe: não há alterar nota, não há editar comentário do cliente e
 * não há excluir. Não é uma permissão negada em tempo de execução — é uma
 * operação que o módulo inteiro não oferece.
 */
export function podeResponder(a: Avaliacao): boolean {
  return a.resposta === null && a.estado !== 'removida';
}

export function podeDenunciar(a: Avaliacao): boolean {
  return a.denuncia === null && a.estado !== 'removida';
}
