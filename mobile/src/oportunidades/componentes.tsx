import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { hitTarget, motion, radius, space, useTheme } from '@/theme';
import { Button, ChevronRightIcon, GlassSurface, Pill, Text } from '@/ui';
import {
  grupoDoEstado,
  rotuloEstado,
  rotuloResultado,
  rotuloUrgencia,
  tempoRelativo,
  urgenciaEmDestaque,
  type Oportunidade,
} from './tipos';

/**
 * Como uma oportunidade aparece.
 *
 * Três formas, e a mesma gramática nas três — quem viu uma reconhece as
 * outras: mesmo topo (balcão à esquerda, tempo à direita), mesma necessidade
 * em corpo grande, mesma linha de contexto embaixo.
 *
 * - **destaque** — a que abre a Home. Traz a ação, porque ali ela é a única.
 * - **cartao** — a da Central. Tocável inteira, sem botão: a lista não é lugar
 *   de "Ver", "Detalhes", "Aceitar" e "Arquivar" empilhados (a experiência
 *   completa é o detalhe).
 * - **linha** — o histórico curto da Home. Compacta, uma linha de texto.
 *
 * O que aparece: o problema, o balcão, o bairro, a pressa e há quanto tempo.
 * O que não aparece: nome, telefone, endereço. Isso pertence ao momento em que
 * a conversa começa, não à vitrine.
 *
 * A novidade se anuncia por peso e composição — filete de marca, um ponto
 * discreto, tipografia mais firme. Sem vermelho, sem badge grande, sem piscar:
 * ver que chegou algo não pode custar um susto.
 */

/** A legenda de estado só aparece quando ela muda o que a pessoa faria. */
function legendaDeEstado(o: Oportunidade): string | null {
  if (o.estado === 'nova') return null;
  if (o.estado === 'encerrada' && o.resultado) return rotuloResultado[o.resultado];
  if (o.estado === 'vista') return null;
  return rotuloEstado[o.estado];
}

function LinhaDeContexto({ o }: { o: Oportunidade }) {
  const grupo = grupoDoEstado[o.estado];
  // A pressa que a pessoa informou deixa de valer quando a oportunidade
  // termina: "Para hoje" numa que foi encerrada há uma semana não informa
  // nada — engana. O que aconteceu já está dito no rodapé do cartão.
  const mostrarUrgencia = grupo !== 'encerradas';
  const destaque = mostrarUrgencia && urgenciaEmDestaque(o.urgencia) && grupo === 'atencao';

  return (
    <View style={styles.contexto}>
      <Text variant="callout" tone="muted" maxScale={1.2} numberOfLines={1} style={styles.regiao}>
        {o.regiao}
      </Text>
      {/* A pressa é sempre uma etiqueta, e é o tom dela que diz o peso. Um
          separador de texto se desamparava quando o bairro é comprido e a
          linha quebra — "· Nos próximos dias" sozinho parecia item de lista. */}
      {mostrarUrgencia ? (
        <Pill tone={destaque ? 'destaque' : 'neutro'}>{rotuloUrgencia[o.urgencia]}</Pill>
      ) : null}
    </View>
  );
}

/** O topo comum às duas formas de cartão. */
function TopoDoCartao({ o, agora, nova }: { o: Oportunidade; agora: Date; nova: boolean }) {
  const { colors } = useTheme();

  return (
    <View style={styles.topo}>
      <View style={styles.topoEsquerda}>
        {nova ? <View style={[styles.pontoNovo, { backgroundColor: colors.brand }]} /> : null}
        <Pill tone={nova ? 'marca' : 'neutro'}>{o.categoria}</Pill>
      </View>
      <Text variant="caption" tone="faint" maxScale={1.15} numberOfLines={1} style={styles.tempo}>
        {tempoRelativo(o.recebidaEm, agora)}
      </Text>
    </View>
  );
}

/** A leitura que um leitor de tela faz do item inteiro, em uma frase só. */
function descricaoAcessivel(o: Oportunidade, agora: Date): string {
  const partes = [
    o.estado === 'nova' ? 'Oportunidade nova' : legendaDeEstado(o),
    o.necessidade,
    o.categoria,
    o.regiao,
    rotuloUrgencia[o.urgencia],
    `recebida ${tempoRelativo(o.recebidaEm, agora)}`,
  ].filter(Boolean);
  return `${partes.join('. ')}.`;
}

/**
 * A oportunidade que abre a Home. Uma ação, e uma só — esta é a única forma
 * que carrega botão, porque ali ele é a ação principal da tela.
 */
export function OportunidadeEmDestaque({
  oportunidade,
  onAbrir,
  agora,
}: {
  oportunidade: Oportunidade;
  onAbrir: (o: Oportunidade) => void;
  agora: Date;
}) {
  const { colors } = useTheme();
  const nova = oportunidade.estado === 'nova';

  return (
    <GlassSurface radius={radius.xl} style={[styles.destaque, { borderColor: colors.brandLine }]}>
      <TopoDoCartao o={oportunidade} agora={agora} nova={nova} />

      <Text variant="title" style={styles.necessidade} maxScale={1.3}>
        {oportunidade.necessidade}
      </Text>

      <LinhaDeContexto o={oportunidade} />

      <Button
        label="Ver oportunidade"
        onPress={() => onAbrir(oportunidade)}
        haptic="step"
        style={styles.acao}
        accessibilityHint={`Abre a oportunidade de ${oportunidade.categoria} em ${oportunidade.regiao}`}
      />
    </GlassSurface>
  );
}

/**
 * O cartão da Central. Tocável inteiro, sem botão nenhum: a lista mostra o que
 * ajuda a decidir se vale abrir, e o resto é o detalhe.
 */
export const CartaoOportunidade = memo(function CartaoOportunidade({
  oportunidade,
  onAbrir,
  agora,
}: {
  oportunidade: Oportunidade;
  onAbrir: (o: Oportunidade) => void;
  agora: Date;
}) {
  const { colors, reduceMotion } = useTheme();
  const press = useSharedValue(0);
  const nova = oportunidade.estado === 'nova';
  const encerrada = oportunidade.estado === 'encerrada';
  const legenda = legendaDeEstado(oportunidade);

  const animado = useAnimatedStyle(() => ({
    transform: [{ scale: reduceMotion ? 1 : 1 - press.value * 0.012 }],
    opacity: 1 - press.value * 0.05,
  }));

  return (
    <Pressable
      onPress={() => onAbrir(oportunidade)}
      onPressIn={() => {
        press.value = withSpring(1, motion.spring.press);
      }}
      onPressOut={() => {
        press.value = withSpring(0, motion.spring.press);
      }}
      accessibilityRole="button"
      accessibilityLabel={descricaoAcessivel(oportunidade, agora)}
      accessibilityHint="Abre a oportunidade"
    >
      <Animated.View
        style={[
          styles.cartao,
          {
            backgroundColor: colors.surface,
            borderColor: nova ? colors.brandLine : colors.line,
            opacity: encerrada ? 0.86 : 1,
          },
          animado,
        ]}
      >
        <TopoDoCartao o={oportunidade} agora={agora} nova={nova} />

        <Text
          variant={nova ? 'title' : 'bodyStrong'}
          tone={encerrada ? 'muted' : 'ink'}
          numberOfLines={2}
          style={styles.necessidade}
          maxScale={1.3}
        >
          {oportunidade.necessidade}
        </Text>

        <LinhaDeContexto o={oportunidade} />

        {legenda ? (
          <View style={[styles.rodape, { borderTopColor: colors.line }]}>
            <View
              style={[
                styles.pontoEstado,
                {
                  backgroundColor: encerrada
                    ? colors.faint
                    : oportunidade.estado === 'em-contato'
                      ? colors.brand
                      : colors.brandLine,
                },
              ]}
            />
            <Text variant="caption" tone={encerrada ? 'faint' : 'muted'} maxScale={1.2}>
              {legenda}
            </Text>
          </View>
        ) : null}
      </Animated.View>
    </Pressable>
  );
});

/** O histórico curto da Home. Linha, não cartão. */
export function LinhaOportunidade({
  oportunidade,
  onAbrir,
  agora,
  primeira = false,
}: {
  oportunidade: Oportunidade;
  onAbrir: (o: Oportunidade) => void;
  agora: Date;
  primeira?: boolean;
}) {
  const { colors, reduceMotion } = useTheme();
  const press = useSharedValue(0);

  const animado = useAnimatedStyle(() => ({
    backgroundColor: press.value > 0.5 ? colors.pressOverlay : 'transparent',
    transform: [{ scale: reduceMotion ? 1 : 1 - press.value * 0.008 }],
  }));

  const corDoPonto =
    oportunidade.estado === 'nova'
      ? colors.brand
      : oportunidade.estado === 'em-contato' || oportunidade.estado === 'interessado'
        ? colors.brandLine
        : oportunidade.estado === 'encerrada'
          ? colors.faint
          : colors.lineStrong;

  const complemento = legendaDeEstado(oportunidade);
  const legenda = [complemento, oportunidade.regiao, tempoRelativo(oportunidade.recebidaEm, agora)]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable
      onPress={() => onAbrir(oportunidade)}
      onPressIn={() => {
        press.value = withSpring(1, motion.spring.press);
      }}
      onPressOut={() => {
        press.value = withSpring(0, motion.spring.press);
      }}
      accessibilityRole="button"
      accessibilityLabel={descricaoAcessivel(oportunidade, agora)}
      accessibilityHint="Abre a oportunidade"
    >
      <Animated.View
        style={[
          styles.linha,
          !primeira && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
          animado,
        ]}
      >
        <View style={[styles.ponto, { backgroundColor: corDoPonto }]} />
        <View style={styles.linhaTexto}>
          <Text variant="bodyStrong" numberOfLines={1} maxScale={1.25}>
            {oportunidade.necessidade}
          </Text>
          <Text variant="caption" tone="muted" numberOfLines={1} maxScale={1.2}>
            {legenda}
          </Text>
        </View>
        <ChevronRightIcon color={colors.faint} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  destaque: { padding: space.xl, gap: space.md },
  cartao: {
    padding: space.xl,
    gap: space.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  topo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  topoEsquerda: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexShrink: 1 },
  // O tempo é curto e nunca cede: quem encolhe é a etiqueta do balcão.
  tempo: { flexShrink: 0 },
  pontoNovo: { width: 7, height: 7, borderRadius: 4 },
  necessidade: { marginTop: space.xxs },
  contexto: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  regiao: { flexShrink: 1 },
  acao: { marginTop: space.sm },
  rodape: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  pontoEstado: { width: 6, height: 6, borderRadius: 3 },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: hitTarget + 12,
    paddingVertical: space.md,
    paddingHorizontal: space.xs,
    borderRadius: radius.sm,
  },
  ponto: { width: 8, height: 8, borderRadius: 4 },
  linhaTexto: { flex: 1, gap: 3 },
});
