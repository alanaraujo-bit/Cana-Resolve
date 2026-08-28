import { useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';

import { useTheme } from '@/theme';

/**
 * O fundo do aplicativo: curvas de nível e duas auroras.
 *
 * As curvas são a mesma referência da marca — a topografia de Canaã dos
 * Carajás. Elas são desenhadas uma vez e não animam sozinhas; quem as move é
 * o gesto do onboarding, devagar, para dar continuidade entre as páginas.
 */
export function BrandCanvas({
  parallax,
  intensity = 1,
}: {
  /** 0 → primeira página, 1 → segunda, e assim por diante. */
  parallax?: SharedValue<number>;
  intensity?: number;
}) {
  const { colors, isDark } = useTheme();
  const { width, height } = useWindowDimensions();

  const lines = useMemo(() => {
    const paths: { d: string; opacity: number }[] = [];
    const count = 15;
    const w = width * 1.5;
    for (let i = 0; i < count; i += 1) {
      const y = height * 0.08 + (i / count) * height * 1.05;
      const amp = 16 + (i % 4) * 9;
      const phase = i * 0.55;
      let d = `M -${width * 0.25} ${y}`;
      for (let x = 0; x <= w; x += w / 12) {
        const t = (x / w) * Math.PI * 2;
        const yy = y + Math.sin(t + phase) * amp + Math.sin(t * 2.3 + phase) * (amp * 0.35);
        d += ` L ${x - width * 0.25} ${yy}`;
      }
      const fade = 1 - Math.abs(i / count - 0.42) * 1.15;
      paths.push({ d, opacity: Math.max(0.16, fade) });
    }
    return paths;
  }, [width, height]);

  const drift = useAnimatedStyle(() => {
    const p = parallax?.value ?? 0;
    return { transform: [{ translateX: -p * 26 }, { translateY: p * 6 }] };
  });

  const base = isDark ? 0.075 : 0.06;

  return (
    // O desenho é maior que a tela de propósito (é o que dá a paralaxe), mas
    // ele precisa ser cortado nela: sem o recorte, na web o excesso alarga a
    // página inteira e leva junto qualquer coisa medida pela janela.
    <View style={[StyleSheet.absoluteFill, styles.recorte]}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }]} />
      <Animated.View style={[StyleSheet.absoluteFill, drift]}>
        <Svg width={width * 1.35} height={height} style={styles.svg}>
          <Defs>
            <RadialGradient id="auroraBrand" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={colors.brand} stopOpacity={isDark ? 0.2 : 0.2} />
              <Stop offset="1" stopColor={colors.brand} stopOpacity="0" />
            </RadialGradient>
            <RadialGradient id="auroraAccent" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={colors.accent} stopOpacity={isDark ? 0.15 : 0.16} />
              <Stop offset="1" stopColor={colors.accent} stopOpacity="0" />
            </RadialGradient>
          </Defs>

          <Circle
            cx={width * 0.86}
            cy={height * 0.12}
            r={width * 0.72 * intensity}
            fill="url(#auroraBrand)"
          />
          <Circle
            cx={width * 0.06}
            cy={height * 0.74}
            r={width * 0.58 * intensity}
            fill="url(#auroraAccent)"
          />

          {lines.map((line, i) => (
            <Path
              key={i}
              d={line.d}
              stroke={colors.contour}
              strokeWidth={i % 4 === 0 ? 1.1 : 0.7}
              strokeOpacity={line.opacity * base * (i % 4 === 0 ? 1.6 : 1)}
              fill="none"
            />
          ))}
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  recorte: { overflow: 'hidden', pointerEvents: 'none' },
  svg: { position: 'absolute', top: 0, left: 0 },
});
