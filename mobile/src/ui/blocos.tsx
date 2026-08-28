import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { motion, radius, space, useTheme } from '@/theme';
import { Text } from './Text';

/**
 * Peças pequenas que a Home pediu e que o resto do produto vai reusar.
 * Só entrou aqui o que já se repete — o que apareceu uma vez ficou na tela.
 */

/** Iniciais da pessoa. Sem foto por enquanto: não temos de onde tirar. */
export function Avatar({ nome, size = 40 }: { nome: string; size?: number }) {
  const { colors } = useTheme();
  const iniciais = nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <View
      accessible={false}
      importantForAccessibility="no"
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.brandSoft,
          borderColor: colors.brandLine,
        },
      ]}
    >
      <Text variant="label" tone="brand" maxScale={1.1} style={{ fontSize: size * 0.36 }}>
        {iniciais}
      </Text>
    </View>
  );
}

/**
 * Título de seção. Um olho tipográfico e, quando houver, uma ação à direita —
 * nunca um cartão em volta só para separar assunto.
 */
export function SectionHeader({
  titulo,
  contagem,
  style,
}: {
  titulo: string;
  /** Aparece só quando o número ajuda a decidir alguma coisa. */
  contagem?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.secao, style]}>
      <Text variant="overline" tone="faint" accessibilityRole="header">
        {titulo.toUpperCase()}
      </Text>
      {typeof contagem === 'number' && contagem > 0 ? (
        <Text variant="overline" tone="faint">
          {contagem}
        </Text>
      ) : null}
    </View>
  );
}

export type PillTone = 'neutro' | 'marca' | 'destaque';

/** Etiqueta curta: urgência, estado. Texto sempre — nunca só a cor. */
export function Pill({ children, tone = 'neutro' }: { children: string; tone?: PillTone }) {
  const { colors } = useTheme();
  const fundo =
    tone === 'marca' ? colors.brandSoft : tone === 'destaque' ? colors.accentSoft : colors.surface2;
  const traco =
    tone === 'marca' ? colors.brandLine : tone === 'destaque' ? colors.accentLine : colors.line;

  return (
    <View style={[styles.pill, { backgroundColor: fundo, borderColor: traco }]}>
      <Text
        variant="caption"
        tone={tone === 'marca' ? 'brand' : tone === 'destaque' ? 'accent' : 'muted'}
        maxScale={1.15}
        numberOfLines={1}
        style={styles.pillTexto}
      >
        {children}
      </Text>
    </View>
  );
}

/**
 * Bloco de carregamento. Segue a forma do conteúdo real, respira devagar e
 * para de respirar quando o sistema pede menos movimento.
 */
export function Skeleton({
  width,
  height = 14,
  style,
}: {
  width?: number | `${number}%`;
  height?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors, reduceMotion } = useTheme();
  const pulso = useSharedValue(0.55);

  useEffect(() => {
    if (reduceMotion) return;
    pulso.value = withRepeat(
      withTiming(1, { duration: motion.duration.deliberate }),
      -1,
      true,
    );
  }, [pulso, reduceMotion]);

  const animado = useAnimatedStyle(() => ({ opacity: reduceMotion ? 0.7 : pulso.value }));

  return (
    <Animated.View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width,
          height,
          borderRadius: height >= 40 ? radius.sm : height / 2,
          backgroundColor: colors.surface3,
        },
        animado,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  secao: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.md,
  },
  pill: {
    paddingHorizontal: space.sm + 2,
    paddingVertical: 4,
    borderRadius: radius.xs,
    borderWidth: StyleSheet.hairlineWidth,
    alignSelf: 'flex-start',
    // Nomes de balcão são longos. Numa tela de 320 a etiqueta precisa ceder
    // espaço, em vez de empurrar o vizinho para fora da linha.
    flexShrink: 1,
  },
  pillTexto: { fontSize: 12, lineHeight: 16 },
});
