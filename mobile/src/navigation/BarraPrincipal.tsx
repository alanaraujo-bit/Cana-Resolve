import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { gutter, motion, radius, space, useTheme } from '@/theme';
import { GlassSurface, HomeIcon, OportunidadesIcon, PerfilIcon, Text } from '@/ui';
import { useCarteira } from '@/oportunidades/Carteira';

/**
 * A barra principal — a mesma doca de vidro do onboarding, agora permanente.
 *
 * Três destinos, porque três são os que se usa todo dia. Ajustes, ajuda e
 * termos moram dentro do Perfil: barra principal não é menu.
 *
 * Ela flutua sobre o conteúdo, acima do indicador de Home, e por isso as telas
 * reservam `ESPACO_BARRA` no fim do scroll.
 */

const ALTURA = 60;
const MARGEM_INFERIOR = space.md;

/** Quanto uma tela precisa reservar no fim do conteúdo, fora a safe area. */
export const ESPACO_BARRA = ALTURA + MARGEM_INFERIOR + space.md;

const ICONES = {
  inicio: HomeIcon,
  oportunidades: OportunidadesIcon,
  perfil: PerfilIcon,
} as const;

type Rota = keyof typeof ICONES;

export function BarraPrincipal({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  // O único selo do aplicativo. Ele conta o que realmente espera uma decisão —
  // não o total de oportunidades, nem o que já está em andamento.
  const { esperando } = useCarteira();

  return (
    <View
      style={[
        styles.area,
        { paddingBottom: Math.max(insets.bottom, space.md), paddingHorizontal: gutter },
      ]}
    >
      <GlassSurface radius={radius['2xl']} style={styles.barra} interactive>
        {state.routes.map((route, indice) => {
          const { options } = descriptors[route.key];
          const rotulo = options.title ?? route.name;
          const selecionado = state.index === indice;
          const Icone = ICONES[route.name as Rota] ?? HomeIcon;
          const selo = route.name === 'oportunidades' && esperando > 0 ? esperando : 0;

          const aoTocar = () => {
            const evento = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!selecionado && !evento.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <ItemDaBarra
              key={route.key}
              rotulo={rotulo}
              selecionado={selecionado}
              onPress={aoTocar}
              cores={colors}
              selo={selo}
            >
              <Icone
                size={23}
                color={selecionado ? colors.brandInk : colors.muted}
                active={selecionado}
              />
            </ItemDaBarra>
          );
        })}
      </GlassSurface>
    </View>
  );
}

function ItemDaBarra({
  rotulo,
  selecionado,
  onPress,
  cores,
  children,
  selo = 0,
}: {
  rotulo: string;
  selecionado: boolean;
  onPress: () => void;
  cores: ReturnType<typeof useTheme>['colors'];
  children: ReactNode;
  /** Quantas esperam decisão. Zero não desenha nada. */
  selo?: number;
}) {
  const { reduceMotion } = useTheme();
  const press = useSharedValue(0);

  const conteudo = useAnimatedStyle(() => ({
    transform: [{ scale: reduceMotion ? 1 : 1 - press.value * 0.06 }],
  }));

  const fundo = useAnimatedStyle(() => ({
    opacity: withTiming(selecionado ? 1 : 0, { duration: motion.duration.base }),
    transform: [{ scale: withTiming(selecionado ? 1 : 0.9, { duration: motion.duration.base }) }],
  }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        press.value = reduceMotion ? 1 : withSpring(1, motion.spring.press);
      }}
      onPressOut={() => {
        press.value = reduceMotion ? 0 : withSpring(0, motion.spring.press);
      }}
      accessibilityRole="tab"
      accessibilityLabel={selo > 0 ? `${rotulo}, ${selo} esperando você` : rotulo}
      accessibilityState={{ selected: selecionado }}
      aria-selected={selecionado}
      style={styles.item}
    >
      <Animated.View
        style={[styles.selecao, { backgroundColor: cores.brandSoft }, fundo]}
      />
      <Animated.View style={[styles.itemConteudo, conteudo]}>
        <View>
          {children}
          {selo > 0 ? (
            <View
              // Discreto de propósito: um selo pequeno, na cor da marca, com o
              // filete do vidro em volta para se separar do ícone. Sem
              // vermelho e sem tamanho de alarme — a novidade se percebe, não
              // se impõe. O número já está no rótulo acessível.
              accessible={false}
              importantForAccessibility="no-hide-descendants"
              style={[
                styles.seloContagem,
                { backgroundColor: cores.brandFill, borderColor: cores.glassHighlight },
              ]}
            >
              <Text
                variant="overline"
                maxScale={1}
                numberOfLines={1}
                style={[styles.seloTexto, { color: cores.onBrandFill }]}
              >
                {selo > 9 ? '9+' : String(selo)}
              </Text>
            </View>
          ) : null}
        </View>
        <Text
          variant="overline"
          maxScale={1.15}
          numberOfLines={1}
          style={[styles.rotulo, { color: selecionado ? cores.brandInk : cores.muted }]}
        >
          {rotulo}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  area: { position: 'absolute', left: 0, right: 0, bottom: 0, pointerEvents: 'box-none' },
  barra: {
    height: ALTURA,
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingHorizontal: space.xs,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  itemConteudo: { alignItems: 'center', justifyContent: 'center', gap: 4 },
  selecao: {
    pointerEvents: 'none',
    position: 'absolute',
    top: space.sm,
    bottom: space.sm,
    left: space.sm,
    right: space.sm,
    borderRadius: radius.lg,
  },
  rotulo: { letterSpacing: 0.6, fontSize: 10.5 },
  seloContagem: {
    position: 'absolute',
    top: -5,
    left: 13,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    borderWidth: 1.5,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seloTexto: { fontSize: 10, lineHeight: 12, letterSpacing: 0 },
});
