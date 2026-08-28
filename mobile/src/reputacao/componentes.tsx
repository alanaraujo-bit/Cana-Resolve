/**
 * As peças da reputação.
 *
 * Nada aqui inventa linguagem: tudo sai dos tokens da Fase 01 e conversa com o
 * que o Perfil já desenhou. Nenhum token novo nasceu por causa desta fase.
 *
 * **O que estas peças recusam a ser (§89):** não há dourado, troféu, medalha,
 * coroa, confete nem faixa de "top". A estrela é um glifo pequeno, na cor da
 * marca, do tamanho de um texto — porque a estrela não é a informação; a
 * informação é a média com a contagem ao lado, e a estrela só ajuda a lê-la de
 * relance.
 *
 * **E o que elas garantem:** a nota nunca chega ao leitor de tela como cinco
 * elementos (§95) — o desenho inteiro é um objeto acessível com um rótulo só —,
 * e nenhum estado depende de cor para ser entendido (§96).
 */

import { useMemo, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { hitTarget, radius, space, useTheme } from '@/theme';
import { Bloco, Nota as NotaVisual, Pill, Text } from '@/ui';
import {
  contagemLegivel,
  dataLegivel,
  explicacaoModeracao,
  mediaLegivel,
  notaAcessivel,
  NOTAS,
  resumirTexto,
  resumoAcessivel,
  VOLUME_PARA_DISTRIBUICAO,
  type Avaliacao,
  type Nota,
  type ResumoDeReputacao,
} from './tipos';

/* -------------------------------------------------------------------------- */
/*  A estrela                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * O glifo. Sempre decorativo — quem fala é o contêiner.
 *
 * Vazia é contorno, e não a mesma forma em cinza claro: em modo escuro, um
 * cinza sobre superfície escura vira invisível, e a diferença entre "3 de 5" e
 * "5 de 5" some. Contorno funciona nas duas paletas sem contraste agressivo
 * (§90).
 */
function Estrela({ cheia, tamanho, cor }: { cheia: boolean; tamanho: number; cor: string }) {
  const d =
    'M12 2.6l2.72 5.52 6.09.89-4.4 4.29 1.04 6.06L12 16.5l-5.45 2.86 1.04-6.06-4.4-4.29 6.09-.89L12 2.6z';

  return (
    <Svg width={tamanho} height={tamanho} viewBox="0 0 24 24">
      <Path
        d={d}
        fill={cheia ? cor : 'none'}
        stroke={cor}
        strokeWidth={cheia ? 0 : 1.6}
        strokeLinejoin="round"
        opacity={cheia ? 1 : 0.45}
      />
    </Svg>
  );
}

/**
 * Uma estrela sozinha, como ícone de unidade — não como medida.
 *
 * O filtro por nota usa: ali "5 ★" quer dizer "as de cinco estrelas", e o
 * número já é a informação. Desenhar as cinco estrelas com uma preenchida
 * diria "1 de 5" ao lado de um "5" — duas coisas contraditórias no mesmo chip.
 */
export function UmaEstrela({ tamanho = 12, cor }: { tamanho?: number; cor: string }) {
  return (
    <View aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Estrela cheia tamanho={tamanho} cor={cor} />
    </View>
  );
}

/**
 * A nota, desenhada.
 *
 * Um único elemento acessível, com o rótulo do §95: "4 de 5 estrelas". Nunca
 * cinco elementos anunciados em sequência.
 */
export function Estrelas({
  nota,
  tamanho = 14,
  tom = 'marca',
}: {
  nota: Nota;
  tamanho?: number;
  tom?: 'marca' | 'suave';
}) {
  const { colors } = useTheme();
  const cor = tom === 'marca' ? colors.brand : colors.muted;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={notaAcessivel(nota)}
      style={estilos.estrelas}
    >
      {NOTAS.map((n) => (
        <Estrela key={n} cheia={n <= nota} tamanho={tamanho} cor={cor} />
      ))}
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*  O resumo                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * O estado sem avaliações (§25, §28, §37).
 *
 * **O estado mais importante desta fase inteira.** No lançamento, a maioria dos
 * parceiros legítimos vai estar aqui, e o que esta caixa comunica decide se
 * chegar primeiro é vantagem ou castigo.
 *
 * Por isso ela não tem "0,0", não tem estrelas vazias e não tem cara de erro.
 * Ela diz que ainda não há avaliações, explica de onde elas virão, e sai do
 * caminho — os outros sinais de confiança do perfil continuam inteiros logo
 * abaixo.
 */
export function SemAvaliacoes({ compacto = false }: { compacto?: boolean }) {
  return (
    <View style={compacto ? estilos.vazioCompacto : estilos.vazio}>
      <Text variant="bodyStrong" maxScale={1.25}>
        Ainda sem avaliações no Canaã Resolve
      </Text>
      <Text variant="callout" tone="muted" maxScale={1.3}>
        Depois que clientes atendidos pelo Canaã Resolve avaliarem a experiência, o retorno deles
        aparece aqui.
      </Text>
    </View>
  );
}

/**
 * Média, estrelas e contagem — nesta ordem, e sempre juntas (§24, §36).
 *
 * A contagem não é um detalhe ao lado da nota: ela é metade da informação. "4,8"
 * sozinho pode ser vinte pessoas ou uma, e as duas coisas significam coisas
 * diferentes. Por isso não existe um componente que mostre a média sem ela.
 */
export function ResumoDeNota({
  resumo,
  tamanho = 'medio',
}: {
  resumo: ResumoDeReputacao;
  tamanho?: 'medio' | 'grande';
}) {
  if (resumo.media === null || resumo.total === 0) return <SemAvaliacoes />;

  const media = mediaLegivel(resumo.media)!;
  // `Math.round` e não `floor`: 4,8 desenha cinco estrelas, que é como a nota
  // se lê. O número ao lado é quem carrega a precisão.
  const cheias = Math.min(5, Math.max(1, Math.round(resumo.media))) as Nota;

  return (
    <View
      accessible
      accessibilityLabel={resumoAcessivel(resumo)}
      style={estilos.resumoLinha}
    >
      <Text variant={tamanho === 'grande' ? 'displayMD' : 'title'} maxScale={1.2}>
        {media}
      </Text>
      <View style={estilos.resumoTexto}>
        {/* Escondida do leitor de tela: o contêiner já anunciou nota e
            contagem juntas, e repetir "4 de 5 estrelas" seria dizer duas
            vezes a mesma coisa. */}
        <View
          aria-hidden
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Estrelas nota={cheias} tamanho={tamanho === 'grande' ? 16 : 14} />
        </View>
        <Text variant="caption" tone="muted" maxScale={1.2}>
          {contagemLegivel(resumo.total)}
        </Text>
      </View>
    </View>
  );
}

/**
 * A distribuição por nota (§45).
 *
 * Só aparece quando há amostra que a sustente. Cinco barras quase vazias sobre
 * duas avaliações não informam nada e dramatizam a única nota baixa — que é
 * exatamente o que o §67 manda não fazer.
 */
export function Distribuicao({ resumo }: { resumo: ResumoDeReputacao }) {
  const { colors } = useTheme();
  if (resumo.total < VOLUME_PARA_DISTRIBUICAO) return null;

  const maior = Math.max(...NOTAS.map((n) => resumo.distribuicao[n]));

  return (
    <View style={estilos.distribuicao}>
      {[...NOTAS].reverse().map((n) => {
        const quantas = resumo.distribuicao[n];
        const fracao = maior > 0 ? quantas / maior : 0;
        return (
          <View
            key={n}
            accessible
            accessibilityLabel={`${n} ${n === 1 ? 'estrela' : 'estrelas'}: ${quantas}`}
            style={estilos.linhaDist}
          >
            <Text variant="caption" tone="muted" maxScale={1.1} style={estilos.distNota}>
              {n}
            </Text>
            <View style={[estilos.trilho, { backgroundColor: colors.surface3 }]}>
              <View
                style={[
                  estilos.trilhoCheio,
                  { width: `${Math.round(fracao * 100)}%`, backgroundColor: colors.brandFill },
                ]}
              />
            </View>
            <Text variant="caption" tone="faint" maxScale={1.1} style={estilos.distQuantas}>
              {quantas}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*  O cartão de uma avaliação                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Uma avaliação na lista.
 *
 * A composição segue a ordem em que se lê: nota, quando, de que serviço, o que
 * a pessoa escreveu, e a resposta do profissional quando houver. Nada de foto,
 * nada de nome completo, nada de curtida — não é postagem (§40).
 *
 * A negativa **não** ganha moldura vermelha nem ícone de alerta (§67). Ela é um
 * cartão igual aos outros, com duas estrelas em vez de cinco. Destacar a crítica
 * seria dramatizar a amostra, e a plataforma que dramatiza a crítica é a mesma
 * que depois é pressionada a escondê-la.
 */
export function CartaoDeAvaliacao({
  avaliacao,
  onPress,
  primeira,
  ultima,
  publico = false,
}: {
  avaliacao: Avaliacao;
  onPress?: () => void;
  primeira?: boolean;
  ultima?: boolean;
  /**
   * `true` na prévia pública — o mesmo cartão, visto do lado do morador.
   *
   * Ele esconde o que é conversa interna, e a lista é curta porque a lista de
   * coisas internas num cartão de avaliação é curta: hoje, só o ponto de "ainda
   * não li". Ele apareceu na prévia na primeira verificação visual, e é o tipo
   * de vazamento que passa despercebido — um ponto verde de 7px ao lado da
   * nota, que o morador leria como algum estado do profissional, e que na
   * verdade era "o João ainda não abriu esta avaliação". A prévia mente sobre
   * o que o morador vê no instante em que mostra qualquer coisa que ele não
   * veria.
   */
  publico?: boolean;
}) {
  const { colors } = useTheme();
  const a = avaliacao;

  const comentario = useMemo(
    () => (a.comentario ? resumirTexto(a.comentario) : null),
    [a.comentario],
  );

  const nota = explicacaoModeracao[a.estado];

  const corpo = (
    <>
      <View style={estilos.cabecalhoCartao}>
        <Estrelas nota={a.nota} />
        {!a.vista && !publico ? <PontoNovo /> : null}
        <View style={estilos.espaco} />
        <Text variant="caption" tone="faint" maxScale={1.15} numberOfLines={1}>
          {dataLegivel(a.em)}
        </Text>
      </View>

      <Text variant="caption" tone="muted" maxScale={1.2} numberOfLines={1}>
        {a.categoria}
      </Text>

      {comentario ? (
        <Text variant="callout" maxScale={1.3} style={estilos.comentario}>
          {comentario.texto}
        </Text>
      ) : (
        // A ausência de comentário é um caso normal, e a frase existe para o
        // cartão não parecer meio carregado (§ cenário D).
        <Text variant="callout" tone="faint" maxScale={1.3} style={estilos.comentario}>
          Avaliou sem deixar comentário.
        </Text>
      )}

      {comentario?.cortado ? (
        <Text variant="caption" tone="brand" maxScale={1.2}>
          Ler tudo
        </Text>
      ) : null}

      {a.resposta ? (
        <View style={[estilos.resposta, { borderLeftColor: colors.brandLine }]}>
          <Text variant="caption" tone="brand" maxScale={1.2}>
            {publico ? 'Resposta do profissional' : 'Sua resposta'}
          </Text>
          <Text variant="caption" tone="muted" maxScale={1.3} numberOfLines={3}>
            {a.resposta.texto}
          </Text>
        </View>
      ) : null}

      {nota && !publico ? (
        <View style={estilos.moderacao}>
          <Pill tone="destaque">{a.estado === 'em-analise' ? 'Em análise' : 'Removida'}</Pill>
          <Text variant="caption" tone="muted" maxScale={1.25}>
            {nota}
          </Text>
        </View>
      ) : null}
    </>
  );

  if (!onPress) {
    return <View style={estilos.cartao}>{corpo}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${notaAcessivel(a.nota)}, ${dataLegivel(a.em)}`}
      accessibilityHint="Abre a avaliação"
      style={({ pressed }) => [
        estilos.cartao,
        {
          borderTopWidth: primeira ? 0 : StyleSheet.hairlineWidth,
          borderTopColor: colors.line,
        },
        ultima && estilos.cartaoUltimo,
        pressed && { backgroundColor: colors.pressOverlay },
      ]}
    >
      {corpo}
    </Pressable>
  );
}

/**
 * O ponto de "ainda não vi" (§77).
 *
 * Discreto, sem número e sem vermelho — e, sobretudo, **fora do selo da aba**.
 * O selo de Oportunidades continua contando oportunidades e só elas (§76);
 * transformar aquele número em "tudo que aconteceu" seria tirar dele o
 * significado que ele tem hoje.
 */
export function PontoNovo() {
  const { colors } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel="Ainda não lida"
      style={[estilos.ponto, { backgroundColor: colors.brand }]}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  Explicações                                                               */
/* -------------------------------------------------------------------------- */

/** Um bloco de texto explicativo dentro de uma folha. */
export function Paragrafo({ children }: { children: ReactNode }) {
  return (
    <Text variant="callout" tone="muted" maxScale={1.35} style={estilos.paragrafo}>
      {children}
    </Text>
  );
}

/** Um item de lista dentro de uma explicação. Marcador tipográfico, sem ícone. */
export function ItemExplicado({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <View style={estilos.itemExplicado}>
      <Text variant="bodyStrong" maxScale={1.25}>
        {titulo}
      </Text>
      <Text variant="callout" tone="muted" maxScale={1.3}>
        {texto}
      </Text>
    </View>
  );
}

/**
 * A linha discreta que abre uma explicação (§125, §31).
 *
 * Texto, não ícone de interrogação flutuando: um "?" numa bolinha é o padrão de
 * ajuda que ninguém toca. "Como funciona" diz o que acontece ao tocar.
 */
export function LinkDeExplicacao({ rotulo, onPress }: { rotulo: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      hitSlop={10}
      style={estilos.link}
    >
      <Text variant="caption" tone="brand" maxScale={1.25}>
        {rotulo}
      </Text>
    </Pressable>
  );
}

/** Reexportados para as telas desta fase não importarem de dois lugares. */
export { Bloco, NotaVisual as Nota };

const estilos = StyleSheet.create({
  estrelas: { flexDirection: 'row', gap: 2 },

  resumoLinha: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  resumoTexto: { gap: 3 },

  vazio: { gap: space.sm },
  vazioCompacto: { gap: space.xs },

  distribuicao: { gap: space.xs, marginTop: space.md },
  linhaDist: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  distNota: { width: 12, textAlign: 'right' },
  distQuantas: { width: 24, textAlign: 'right' },
  trilho: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  trilhoCheio: { height: 6, borderRadius: 3 },

  cartao: { gap: space.xs, paddingVertical: space.lg, paddingHorizontal: space.lg },
  cartaoUltimo: {},
  cabecalhoCartao: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  espaco: { flex: 1 },
  comentario: { marginTop: space.xs },

  resposta: {
    marginTop: space.sm,
    paddingLeft: space.md,
    gap: 2,
    borderLeftWidth: 2,
  },

  moderacao: { gap: space.xs, marginTop: space.sm },

  ponto: { width: 7, height: 7, borderRadius: 4 },

  paragrafo: {},
  itemExplicado: { gap: 2 },

  link: { minHeight: hitTarget - 4, justifyContent: 'center', alignSelf: 'flex-start' },
});

/** Cantos, para quem quiser embrulhar a lista num bloco. */
export const RAIO_DO_CARTAO = radius.lg;
