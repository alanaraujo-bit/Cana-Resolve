/**
 * As peças que o Perfil repete.
 *
 * Nada aqui inventa linguagem: tudo sai dos tokens e conversa com o que a
 * Fase 01 já definiu. Estas peças moram no módulo, e não em `src/ui/`, porque
 * ainda não se repetem fora dele — o dia em que a área do morador precisar de
 * uma delas, ela sobe para a fundação. É mais fácil promover do que remendar.
 */

import type { ReactNode } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Switch,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { gutter, hitTarget, motion, radius, space, useTheme } from '@/theme';
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon, Text } from '@/ui';
import type { Imagem, TipoDePerfil } from './tipos';

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
/*  Cabeçalho das telas empilhadas                                            */
/* -------------------------------------------------------------------------- */

/** Voltar à esquerda, título no meio da linha, ação opcional à direita. */
export function CabecalhoDeTela({
  titulo,
  aoVoltar,
  direita,
}: {
  titulo: string;
  aoVoltar: () => void;
  direita?: ReactNode;
}) {
  const { colors } = useTheme();

  return (
    <View style={estilos.cabecalho}>
      <Pressable
        onPress={aoVoltar}
        accessibilityRole="button"
        accessibilityLabel="Voltar"
        hitSlop={12}
        style={estilos.voltar}
      >
        <ChevronLeftIcon color={colors.ink} />
      </Pressable>

      <Text variant="title" numberOfLines={1} maxScale={1.2} style={estilos.cabecalhoTitulo}>
        {titulo}
      </Text>

      <View style={estilos.cabecalhoDireita}>{direita}</View>
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

/** O bloco branco que agrupa linhas. Uma superfície, não seis cartões. */
export function Bloco({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        estilos.bloco,
        { backgroundColor: colors.surface, borderColor: colors.line },
        style,
      ]}
    >
      {children}
    </View>
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
/*  Alternador                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Uma decisão de sim ou não, com a explicação junto quando ela ajuda.
 *
 * A **linha inteira** aciona, não só o interruptor: o `Switch` do sistema tem
 * cerca de 40 × 20, bem abaixo dos 48 que a fundação exige, e mirar nele com o
 * polegar em pé no meio de uma obra é pedir demais. O interruptor continua ali
 * como o desenho do estado — só não é mais o único jeito de mexer nele.
 */
export function Alternador({
  titulo,
  explicacao,
  valor,
  onChange,
}: {
  titulo: string;
  explicacao?: string;
  valor: boolean;
  onChange: (v: boolean) => void;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={() => onChange(!valor)}
      accessibilityRole="switch"
      accessibilityLabel={titulo}
      accessibilityHint={explicacao}
      accessibilityState={{ checked: valor }}
      style={estilos.alternador}
    >
      <View style={estilos.alternadorTexto}>
        <Text variant="bodyStrong" maxScale={1.25}>
          {titulo}
        </Text>
        {explicacao ? (
          <Text variant="caption" tone="muted" maxScale={1.2}>
            {explicacao}
          </Text>
        ) : null}
      </View>
      {/* Só desenho: quem recebe o toque e fala com o leitor de tela é a linha,
          para não haver dois controles para a mesma decisão. */}
      <View
        style={estilos.semToque}
        aria-hidden
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Switch
          value={valor}
          onValueChange={onChange}
          trackColor={{ false: colors.surface3, true: colors.brandFill }}
          thumbColor={colors.surface}
          ios_backgroundColor={colors.surface3}
        />
      </View>
    </Pressable>
  );
}

/* -------------------------------------------------------------------------- */
/*  Avisos e vazios                                                           */
/* -------------------------------------------------------------------------- */

/** Nota discreta. Explica, não assusta: fundo suave, sem ícone de perigo. */
export function Nota({
  children,
  tom = 'neutro',
}: {
  /** Texto — aceita interpolação, que o JSX entrega como vários pedaços. */
  children: ReactNode;
  tom?: 'neutro' | 'destaque';
}) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityRole="text"
      style={[
        estilos.nota,
        {
          backgroundColor: tom === 'destaque' ? colors.accentSoft : colors.surface2,
          borderColor: tom === 'destaque' ? colors.accentLine : colors.line,
        },
      ]}
    >
      <Text variant="caption" tone={tom === 'destaque' ? 'accent' : 'muted'} maxScale={1.3}>
        {children}
      </Text>
    </View>
  );
}

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

/** Título de grupo dentro de uma tela de edição. */
export function Grupo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <View style={estilos.grupo}>
      <Text variant="overline" tone="faint" accessibilityRole="header">
        {titulo.toUpperCase()}
      </Text>
      {children}
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

  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: gutter - 8,
    minHeight: hitTarget,
  },
  voltar: {
    width: hitTarget,
    height: hitTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cabecalhoTitulo: { flex: 1 },
  cabecalhoDireita: { minWidth: hitTarget, alignItems: 'flex-end' },

  bloco: {
    borderRadius: radius.lg,
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

  alternador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    minHeight: hitTarget,
  },
  alternadorTexto: { flex: 1, gap: 2 },
  semToque: { pointerEvents: 'none' },

  nota: {
    padding: space.md,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },

  vazio: { gap: space.sm, paddingVertical: space['3xl'], paddingHorizontal: space.lg },

  grupo: { gap: space.md },
});
