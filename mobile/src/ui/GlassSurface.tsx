import { BlurView } from 'expo-blur';
import {
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import type { ReactNode } from 'react';

import { useTheme } from '@/theme';
import { getGlassView, liquidGlassAvailable } from './liquidGlass';

// Resolvido uma vez, na carga do módulo: ou o aparelho tem a API nativa de
// Liquid Glass, ou não tem — isso não muda no meio da sessão.
const NativeGlass = getGlassView();

type Props = {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Raio do recorte — precisa ser passado aqui para o vidro nativo arredondar. */
  radius?: number;
  /** `regular` para superfícies de controle; `clear` para o que flutua sobre imagem. */
  intensity?: 'regular' | 'clear';
  /** Vidro nativo reage ao toque quando o elemento é, ele mesmo, interativo. */
  interactive?: boolean;
  pointerEvents?: ViewProps['pointerEvents'];
};

/**
 * Uma superfície flutuante, com três acabamentos e a mesma silhueta:
 *
 * 1. iOS 26 com a API disponível → Liquid Glass nativo.
 * 2. iOS anterior → desfoque do sistema (`expo-blur`), com filete e realce.
 * 3. Android, ou "reduzir transparência" ligado → superfície sólida da paleta.
 *
 * Nenhum dos três é a versão pobre do outro: os três foram escolhidos com a
 * mesma cor de filete, o mesmo raio e o mesmo peso visual.
 */
export function GlassSurface({
  children,
  style,
  radius = 24,
  intensity = 'regular',
  interactive = false,
  pointerEvents,
}: Props) {
  const { colors, isDark, reduceTransparency, scheme } = useTheme();

  // `pointerEvents` continua sendo prop desta superfície, mas viaja no estilo:
  // como atributo do elemento ele está descontinuado, e avisa no console.
  const toque: ViewStyle = pointerEvents ? { pointerEvents } : {};

  const shell: StyleProp<ViewStyle> = [
    { borderRadius: radius, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
    { borderColor: colors.glassLine },
    toque,
    style,
  ];

  if (reduceTransparency) {
    return (
      <View style={[shell, { backgroundColor: colors.surface }]}>
        {children}
      </View>
    );
  }

  if (NativeGlass && liquidGlassAvailable()) {
    return (
      <NativeGlass
        glassEffectStyle={intensity}
        isInteractive={interactive}
        colorScheme={scheme}
        style={[{ borderRadius: radius, overflow: 'hidden' }, toque, style]}
      >
        {children}
      </NativeGlass>
    );
  }

  if (Platform.OS === 'ios') {
    return (
      <View style={shell}>
        <BlurView
          intensity={intensity === 'clear' ? 34 : 58}
          tint={isDark ? 'systemThickMaterialDark' : 'systemThickMaterialLight'}
          style={StyleSheet.absoluteFill}
        />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.glassTint, opacity: 0.35 }]} />
        {children}
      </View>
    );
  }

  // Android: nada de imitar vidro com blur caro. Uma superfície translúcida da
  // própria paleta, com o mesmo filete — rápida e coerente.
  return (
    <View
      style={[shell, { backgroundColor: colors.glassTint }]}
    >
      {children}
    </View>
  );
}
