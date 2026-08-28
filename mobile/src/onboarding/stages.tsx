import { StyleSheet, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { radius, space, useTheme } from '@/theme';
import { BrandMark, GlassSurface, Text } from '@/ui';

/**
 * As três composições do onboarding.
 *
 * Não há ilustração de banco de imagens aqui: a matéria-prima é a própria
 * marca — o pino, as curvas de nível — e um pedaço honesto da interface que a
 * pessoa vai encontrar depois. Tudo que parece conteúdo é marcado como
 * exemplo, porque ainda não temos números para mostrar.
 */

const STAGE_WIDTH = 300;

/** `progress` vai de -1 (página anterior) a 1 (próxima), 0 quando centrada. */
type StageProps = { progress: SharedValue<number> };

function useDepth(progress: SharedValue<number>, depth: number, reduce: boolean) {
  return useAnimatedStyle(() => {
    if (reduce) return { opacity: 1 };
    const p = progress.value;
    return {
      transform: [
        { translateX: p * depth },
        { scale: interpolate(Math.abs(p), [0, 1], [1, 0.94], 'clamp') },
      ],
      opacity: interpolate(Math.abs(p), [0, 0.85], [1, 0], 'clamp'),
    };
  });
}

function Tag({ children }: { children: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.tag, { borderColor: colors.line, backgroundColor: colors.surface2 }]}>
      <Text variant="overline" tone="faint" maxScale={1.1}>
        {children}
      </Text>
    </View>
  );
}

function Row({
  categoria,
  pedido,
  ativo = false,
}: {
  categoria: string;
  pedido: string;
  ativo?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.row,
        {
          borderColor: ativo ? colors.brandLine : 'transparent',
          backgroundColor: ativo ? colors.brandSoft : 'transparent',
          opacity: ativo ? 1 : 0.62,
        },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: ativo ? colors.brand : colors.lineStrong }]} />
      <View style={styles.rowText}>
        <Text variant="caption" tone="muted" numberOfLines={1} maxScale={1.15}>
          {categoria}
        </Text>
        <Text variant="bodyStrong" numberOfLines={1} maxScale={1.15}>
          {pedido}
        </Text>
      </View>
    </View>
  );
}

/** 01 — o alcance: o pino da marca e as curvas que saem dele. */
export function StageAlcance({ progress }: StageProps) {
  const { colors, reduceMotion } = useTheme();
  const front = useDepth(progress, -34, reduceMotion);
  const back = useDepth(progress, -12, reduceMotion);

  return (
    <View style={styles.stage}>
      <Animated.View style={[styles.rings, back]}>
        <Svg width={STAGE_WIDTH} height={STAGE_WIDTH * 0.72} viewBox="0 0 300 216">
          {[42, 66, 90, 114, 138].map((r, i) => (
            <Circle
              key={r}
              cx={150}
              cy={108}
              r={r}
              stroke={colors.contour}
              strokeWidth={i === 1 ? 1.4 : 1}
              strokeOpacity={0.34 - i * 0.05}
              fill="none"
            />
          ))}
          <Circle cx={150} cy={108} r={30} fill={colors.brandSoft} />
          <Circle cx={62} cy={62} r={4} fill={colors.accent} opacity={0.75} />
          <Circle cx={238} cy={148} r={4} fill={colors.accent} opacity={0.6} />
          <Circle cx={214} cy={54} r={3} fill={colors.brand} opacity={0.55} />
        </Svg>
        <View style={styles.markSlot}>
          <BrandMark size={58} pin={colors.brand} check={colors.accent} strokeWidth={1.6} />
        </View>
      </Animated.View>

      <Animated.View style={[styles.chips, front]}>
        {['Elétrica', 'Ar-condicionado', 'Guincho'].map((c) => (
          <View
            key={c}
            style={[styles.chip, { borderColor: colors.line, backgroundColor: colors.surface }]}
          >
            <Text variant="caption" tone="muted" maxScale={1.15}>
              {c}
            </Text>
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

/** 02 — a triagem: entre os pedidos que chegam, o que é do seu ofício. */
export function StageEncaixe({ progress }: StageProps) {
  const { reduceMotion } = useTheme();
  const card = useDepth(progress, -30, reduceMotion);

  return (
    <View style={styles.stage}>
      <Animated.View style={card}>
        <GlassSurface radius={radius.xl} style={styles.card}>
          <View style={styles.cardHead}>
            <Text variant="overline" tone="faint">
              PEDIDOS DE HOJE
            </Text>
            <Tag>EXEMPLO</Tag>
          </View>
          <Row categoria="Mecânica · Vila Bela" pedido="Revisão geral" />
          <Row categoria="Eletricista · Centro" pedido="Chuveiro não esquenta" ativo />
          <Row categoria="Ar-condicionado · Nova Canaã" pedido="Não está gelando" />
        </GlassSurface>
      </Animated.View>
    </View>
  );
}

/** 03 — o controle: entender o pedido e decidir como responder. */
export function StageControle({ progress }: StageProps) {
  const { colors, reduceMotion } = useTheme();
  const card = useDepth(progress, -30, reduceMotion);

  return (
    <View style={styles.stage}>
      <Animated.View style={card}>
        <GlassSurface radius={radius.xl} style={styles.card}>
          <View style={styles.cardHead}>
            <Text variant="overline" tone="faint">
              PEDIDO
            </Text>
            <Tag>EXEMPLO</Tag>
          </View>
          <View style={styles.pedido}>
            <Text variant="bodyStrong" maxScale={1.2}>
              Chuveiro não esquenta
            </Text>
            <Text variant="caption" tone="muted" maxScale={1.2}>
              Eletricista · Centro · hoje pela manhã
            </Text>
          </View>
          <View style={styles.acoes}>
            <View style={[styles.acao, { backgroundColor: colors.brandFill }]}>
              <Text
                variant="label"
                tone="inherit"
                style={{ color: colors.onBrandFill }}
                maxScale={1.15}
              >
                Responder
              </Text>
            </View>
            <View style={[styles.acao, styles.acaoQuieta, { borderColor: colors.lineStrong }]}>
              <Text variant="label" tone="muted" maxScale={1.15}>
                Agora não
              </Text>
            </View>
          </View>
        </GlassSurface>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { alignItems: 'center', justifyContent: 'center', width: '100%' },
  rings: { alignItems: 'center', justifyContent: 'center' },
  markSlot: {
    pointerEvents: 'none', ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: space.sm,
    marginTop: space.lg,
    maxWidth: STAGE_WIDTH,
  },
  chip: {
    paddingHorizontal: space.md,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  card: { width: STAGE_WIDTH, padding: space.lg, gap: space.xs },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.xs,
  },
  tag: {
    paddingHorizontal: space.sm,
    paddingVertical: 3,
    borderRadius: radius.xs,
    borderWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.sm + 2,
    paddingHorizontal: space.md,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  rowText: { flex: 1, gap: 2 },
  pedido: { paddingHorizontal: space.xs, paddingBottom: space.sm, gap: 2 },
  acoes: { flexDirection: 'row', gap: space.sm },
  acao: {
    flex: 1,
    height: 42,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acaoQuieta: { borderWidth: StyleSheet.hairlineWidth, backgroundColor: 'transparent' },
});
