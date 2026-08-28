/**
 * As peças que o Perfil repete.
 *
 * Nada aqui inventa linguagem: tudo sai dos tokens e conversa com o que a
 * Fase 01 já definiu. Estas peças moram no módulo porque ainda não se repetem
 * fora dele — o dia em que outra área precisar de uma delas, ela sobe para a
 * fundação. É mais fácil promover do que remendar.
 *
 * **Foi o que aconteceu na Fase 05**: cabeçalho, bloco, grupo, nota e
 * alternador viraram Conta e Configurações também, e mudaram de casa para
 * `src/ui/lista.tsx`. Continuam sendo exportados daqui, com os mesmos nomes,
 * para que nenhuma tela da Fase 04 precisasse ser tocada.
 */

import type { ReactNode } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { hitTarget, motion, radius, space, useTheme } from '@/theme';
import { CheckIcon, ChevronRightIcon, Text } from '@/ui';
import type { Imagem, TipoDePerfil } from './tipos';

// Promovidas para a fundação na Fase 05 — reexportadas para não quebrar as
// telas que já as importavam daqui.
export { Alternador, Bloco, CabecalhoDeTela, Grupo, Nota } from '@/ui';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/* -------------------------------------------------------------------------- */
/*  Retrato                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * A foto de quem atende, ou a logo do negócio.
 *
 * Sem imagem, não cai num boneco cinza de 2009: mostra as iniciais sobre a
 * superfície de marca, que é discreto e continua parecendo o Canaã Resolve.
 * Empresa vem em quadrado de canto arredondado (uma logo não é um rosto);
 * pessoa vem em círculo.
 */
export function Retrato({
  nome,
  imagem,
  tipo,
  tamanho = 64,
}: {
  nome: string;
  imagem: Imagem | null;
  tipo: TipoDePerfil;
  tamanho?: number;
}) {
  const { colors } = useTheme();
  const arredondamento = tipo === 'empresa' ? tamanho * 0.26 : tamanho / 2;

  const iniciais = nome
    .split(' ')
    .filter((p) => p.length > 2 || p === nome.split(' ')[0])
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[
        estilos.retrato,
        {
          width: tamanho,
          height: tamanho,
          borderRadius: arredondamento,
          backgroundColor: colors.brandSoft,
          borderColor: colors.brandLine,
        },
      ]}
    >
      {imagem ? (
        // `cover` porque a imagem já chega quadrada do recorte; nada aqui
        // estica proporção.
        <Image
          source={{ uri: imagem.uri }}
          style={{ width: tamanho, height: tamanho }}
          resizeMode="cover"
        />
      ) : (
        <Text
          variant="label"
          tone="brand"
          maxScale={1.1}
          style={{ fontSize: Math.max(12, tamanho * 0.34) }}
        >
          {iniciais || '·'}
        </Text>
      )}
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*  Linha de seção                                                            */
/* -------------------------------------------------------------------------- */

/**
 * A linha que leva a uma seção de edição.
 *
 * Mostra o que já está preenchido — porque ver o próprio dado vale mais que
 * ver o nome do campo — e, quando falta algo, diz o que falta em vez de
 * pendurar um alerta vermelho. Falta não é erro.
 */
export function LinhaDeSecao({
  titulo,
  resumo,
  falta,
  onPress,
  primeira,
  ultima,
}: {
  titulo: string;
  resumo: string;
  /** Frase curta do que falta. Quando presente, ocupa o lugar do resumo. */
  falta?: string | null;
  onPress: () => void;
  primeira?: boolean;
  ultima?: boolean;
}) {
  const { colors, reduceMotion } = useTheme();
  const press = useSharedValue(0);

  const animado = useAnimatedStyle(() => ({
    backgroundColor: withTiming(
      press.value ? colors.pressOverlay : 'transparent',
      { duration: motion.duration.instant },
    ),
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        press.value = reduceMotion ? 1 : withSpring(1, motion.spring.press);
      }}
      onPressOut={() => {
        press.value = reduceMotion ? 0 : withSpring(0, motion.spring.press);
      }}
      accessibilityRole="button"
      accessibilityLabel={titulo}
      accessibilityHint={falta ? `Falta: ${falta}` : resumo}
      style={[
        estilos.linha,
        {
          borderColor: colors.line,
          borderTopWidth: primeira ? 0 : StyleSheet.hairlineWidth,
        },
        primeira && estilos.linhaPrimeira,
        ultima && estilos.linhaUltima,
        animado,
      ]}
    >
      <View style={estilos.linhaTexto}>
        <Text variant="bodyStrong" maxScale={1.25} numberOfLines={1}>
          {titulo}
        </Text>
        <Text
          variant="caption"
          tone={falta ? 'accent' : 'muted'}
          maxScale={1.2}
          numberOfLines={2}
        >
          {falta ?? resumo}
        </Text>
      </View>
      <ChevronRightIcon color={colors.faint} />
    </AnimatedPressable>
  );
}

/* -------------------------------------------------------------------------- */
/*  Chip selecionável                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Serviço, bairro, dia da semana. Marcado traz o traço e o tique — nunca só a
 * cor, porque quem não distingue verde precisa saber o que está marcado.
 */
export function ChipSelecionavel({
  rotulo,
  marcado,
  onPress,
  onRemover,
}: {
  rotulo: string;
  marcado: boolean;
  onPress: () => void;
  /** Quando existe, o chip vira removível (serviço escrito à mão). */
  onRemover?: () => void;
}) {
  const { colors, reduceMotion } = useTheme();
  const press = useSharedValue(0);

  const animado = useAnimatedStyle(() => ({
    transform: [{ scale: reduceMotion ? 1 : 1 - press.value * 0.03 }],
  }));

  return (
    <AnimatedPressable
      onPress={onRemover ?? onPress}
      onPressIn={() => {
        press.value = reduceMotion ? 1 : withSpring(1, motion.spring.press);
      }}
      onPressOut={() => {
        press.value = reduceMotion ? 0 : withSpring(0, motion.spring.press);
      }}
      accessibilityRole={onRemover ? 'button' : 'checkbox'}
      accessibilityState={onRemover ? undefined : { checked: marcado }}
      accessibilityLabel={rotulo}
      accessibilityHint={onRemover ? 'Toque para remover' : undefined}
      hitSlop={6}
      style={[
        estilos.chip,
        {
          backgroundColor: marcado ? colors.brandSoft : colors.surface2,
          borderColor: marcado ? colors.brandLine : colors.line,
        },
        animado,
      ]}
    >
      {marcado ? <CheckIcon size={14} color={colors.brandInk} /> : null}
      <Text
        variant="callout"
        tone={marcado ? 'brand' : 'ink'}
        maxScale={1.2}
        numberOfLines={1}
        style={estilos.chipTexto}
      >
        {rotulo}
      </Text>
      {onRemover ? (
        <Text variant="caption" tone="faint" maxScale={1.1}>
          ✕
        </Text>
      ) : null}
    </AnimatedPressable>
  );
}

/** O contêiner que embrulha chips em linhas. */
export function Chips({ children }: { children: ReactNode }) {
  return <View style={estilos.chips}>{children}</View>;
}

/* -------------------------------------------------------------------------- */
/*  Avisos e vazios                                                           */
/* -------------------------------------------------------------------------- */

/** Estado vazio de uma seção. Nunca comunica fracasso. */
export function Vazio({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <View style={estilos.vazio}>
      <Text variant="bodyStrong" center maxScale={1.25}>
        {titulo}
      </Text>
      <Text variant="callout" tone="muted" center maxScale={1.25}>
        {texto}
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  retrato: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },

  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md + 2,
    minHeight: hitTarget + 8,
  },
  linhaPrimeira: {},
  linhaUltima: {},
  linhaTexto: { flex: 1, gap: 2 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs + 2,
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 2,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: '100%',
  },
  chipTexto: { flexShrink: 1 },

  vazio: { gap: space.sm, paddingVertical: space['3xl'], paddingHorizontal: space.lg },
});
