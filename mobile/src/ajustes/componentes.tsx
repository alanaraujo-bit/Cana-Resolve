/**
 * As peças das Configurações.
 *
 * A decisão que governa este arquivo: **Configurações não é uma coleção de
 * cartões**. É uma lista — seções com título tipográfico, linhas separadas por
 * um fio, valor à direita quando ele responde a pergunta antes do toque. É o
 * desenho que iOS e Android já ensinaram a todo mundo a ler, e esta é a área
 * onde previsibilidade vale mais que invenção (§7 e §71).
 *
 * Três formas de linha, e cada uma significa uma coisa diferente:
 *
 * - **`LinhaDeAjuste`** leva a outro lugar. Tem seta.
 * - **`LinhaDeValor`** só informa. Não tem seta, não recebe toque — mas pode
 *   ter uma ação pequena à direita (copiar, por exemplo).
 * - **`LinhaDeAcao`** faz alguma coisa aqui mesmo. Sem seta, e com a cor
 *   semântica quando a ação é sensível.
 *
 * Um interruptor nunca navega, e uma seta nunca liga nada (§70).
 */

import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { hitTarget, motion, space, useTheme } from '@/theme';
import { CheckIcon, ChevronRightIcon, Text } from '@/ui';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** O fio entre duas linhas. Nunca antes da primeira. */
function useSeparador(primeira?: boolean) {
  const { colors } = useTheme();
  return {
    borderTopColor: colors.line,
    borderTopWidth: primeira ? 0 : StyleSheet.hairlineWidth,
  };
}

/* -------------------------------------------------------------------------- */
/*  Linha que leva a outro lugar                                              */
/* -------------------------------------------------------------------------- */

export function LinhaDeAjuste({
  titulo,
  valor,
  explicacao,
  onPress,
  primeira,
  externo = false,
}: {
  titulo: string;
  /** O estado atual, à direita. "Sistema", "Português (Brasil)". */
  valor?: string;
  /** Uma linha abaixo do título, quando o título sozinho não basta. */
  explicacao?: string;
  onPress: () => void;
  primeira?: boolean;
  /** Abre fora do aplicativo — o leitor de tela precisa saber antes de tocar. */
  externo?: boolean;
}) {
  const { colors, reduceMotion } = useTheme();
  const separador = useSeparador(primeira);
  const press = useSharedValue(0);

  const animado = useAnimatedStyle(() => ({
    backgroundColor: withTiming(press.value ? colors.pressOverlay : 'transparent', {
      duration: motion.duration.instant,
    }),
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
      accessibilityRole={externo ? 'link' : 'button'}
      // O leitor precisa ouvir "Aparência, Sistema" — e não só "botão" (§78).
      accessibilityLabel={valor ? `${titulo}, ${valor}` : titulo}
      accessibilityHint={
        externo ? 'Abre fora do aplicativo' : (explicacao ?? undefined)
      }
      style={[estilos.linha, separador, animado]}
    >
      <View style={estilos.texto}>
        <Text variant="bodyStrong" maxScale={1.25}>
          {titulo}
        </Text>
        {explicacao ? (
          <Text variant="caption" tone="muted" maxScale={1.2}>
            {explicacao}
          </Text>
        ) : null}
      </View>

      {valor ? (
        <Text variant="callout" tone="muted" maxScale={1.2} numberOfLines={1} style={estilos.valor}>
          {valor}
        </Text>
      ) : null}
      <ChevronRightIcon color={colors.faint} />
    </AnimatedPressable>
  );
}

/* -------------------------------------------------------------------------- */
/*  Linha que só informa                                                      */
/* -------------------------------------------------------------------------- */

export function LinhaDeValor({
  titulo,
  valor,
  explicacao,
  direita,
  primeira,
}: {
  titulo: string;
  valor?: string;
  explicacao?: string;
  /** Uma ação pequena à direita — "Copiar", por exemplo. */
  direita?: ReactNode;
  primeira?: boolean;
}) {
  const separador = useSeparador(primeira);

  return (
    <View
      style={[estilos.linha, separador]}
      accessible
      accessibilityLabel={[titulo, valor, explicacao].filter(Boolean).join(', ')}
    >
      <View style={estilos.texto}>
        <Text variant="bodyStrong" maxScale={1.25}>
          {titulo}
        </Text>
        {valor ? (
          <Text variant="callout" tone="muted" maxScale={1.25} selectable>
            {valor}
          </Text>
        ) : null}
        {explicacao ? (
          <Text variant="caption" tone="faint" maxScale={1.2}>
            {explicacao}
          </Text>
        ) : null}
      </View>
      {direita}
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*  Linha que faz alguma coisa                                                */
/* -------------------------------------------------------------------------- */

/**
 * Uma ação dentro da lista.
 *
 * `tom` é semântico e não decorativo. Vermelho fica reservado para o que
 * destrói: sair da conta **não** é destrutivo — encerra a sessão e nada mais —,
 * então sai em cor de texto normal, com peso. Excluir a conta é outra coisa, e
 * essa sim se veste de perigo (§54 e §58).
 */
export function LinhaDeAcao({
  titulo,
  explicacao,
  onPress,
  tom = 'neutro',
  carregando = false,
  desabilitado = false,
  primeira,
}: {
  titulo: string;
  explicacao?: string;
  onPress: () => void;
  tom?: 'neutro' | 'marca' | 'perigo';
  carregando?: boolean;
  desabilitado?: boolean;
  primeira?: boolean;
}) {
  const { colors } = useTheme();
  const separador = useSeparador(primeira);
  const inerte = desabilitado || carregando;

  return (
    <Pressable
      onPress={() => !inerte && onPress()}
      disabled={inerte}
      accessibilityRole="button"
      accessibilityLabel={titulo}
      accessibilityHint={explicacao}
      accessibilityState={{ disabled: inerte, busy: carregando }}
      style={({ pressed }) => [
        estilos.linha,
        separador,
        pressed && !inerte && { backgroundColor: colors.pressOverlay },
        desabilitado && estilos.desabilitada,
      ]}
    >
      <View style={estilos.texto}>
        <Text
          variant="bodyStrong"
          tone={tom === 'perigo' ? 'danger' : tom === 'marca' ? 'brand' : 'ink'}
          maxScale={1.25}
        >
          {titulo}
        </Text>
        {explicacao ? (
          <Text variant="caption" tone="muted" maxScale={1.2}>
            {explicacao}
          </Text>
        ) : null}
      </View>
      {carregando ? <ActivityIndicator size="small" color={colors.muted} /> : null}
    </Pressable>
  );
}

/* -------------------------------------------------------------------------- */
/*  Escolha entre poucas opções                                               */
/* -------------------------------------------------------------------------- */

/**
 * Uma opção de uma lista de escolha única — Sistema, Claro, Escuro.
 *
 * O tique é o que marca, não a cor: quem não distingue verde precisa saber o
 * que está escolhido.
 */
export function OpcaoEscolhida({
  rotulo,
  explicacao,
  escolhida,
  onPress,
  primeira,
}: {
  rotulo: string;
  explicacao?: string;
  escolhida: boolean;
  onPress: () => void;
  primeira?: boolean;
}) {
  const { colors } = useTheme();
  const separador = useSeparador(primeira);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityLabel={rotulo}
      accessibilityHint={explicacao}
      accessibilityState={{ checked: escolhida, selected: escolhida }}
      aria-checked={escolhida}
      style={({ pressed }) => [
        estilos.linha,
        separador,
        pressed && { backgroundColor: colors.pressOverlay },
      ]}
    >
      <View style={estilos.texto}>
        <Text
          variant={escolhida ? 'bodyStrong' : 'body'}
          tone={escolhida ? 'brand' : 'ink'}
          maxScale={1.25}
        >
          {rotulo}
        </Text>
        {explicacao ? (
          <Text variant="caption" tone="muted" maxScale={1.2}>
            {explicacao}
          </Text>
        ) : null}
      </View>
      {escolhida ? <CheckIcon size={18} color={colors.brandInk} /> : null}
    </Pressable>
  );
}

/* -------------------------------------------------------------------------- */
/*  Alternador dentro de um bloco                                             */
/* -------------------------------------------------------------------------- */

/** O `Alternador` da fundação, com o respiro e o fio das linhas da lista. */
export function LinhaDeAlternador({
  primeira,
  children,
}: {
  primeira?: boolean;
  children: ReactNode;
}) {
  const separador = useSeparador(primeira);
  return <View style={[estilos.linhaAlternador, separador]}>{children}</View>;
}

const estilos = StyleSheet.create({
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md + 2,
    minHeight: hitTarget + 4,
  },
  linhaAlternador: {
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  texto: { flex: 1, gap: 2 },
  // O valor cede espaço antes do título: "Português (Brasil)" numa tela de 320
  // não pode empurrar "Idioma" para fora da linha.
  valor: { flexShrink: 1, maxWidth: '48%', textAlign: 'right' },
  desabilitada: { opacity: 0.5 },
});
