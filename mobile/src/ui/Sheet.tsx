import { useEffect } from 'react';
import {
  BackHandler,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ReactNode } from 'react';

import { gutter, motion, radius, space, useTheme } from '@/theme';
import { CloseIcon } from './icons';
import { Text } from './Text';

/**
 * Uma folha que sobe da base — para decisões curtas que não merecem uma tela.
 *
 * Ela existe porque a alternativa era pior nos dois lados: transformar
 * "por que você não consegue atender?" em uma página é burocracia, e enfiar a
 * mesma pergunta num alerta de sistema tira dela o desenho da casa.
 *
 * O que ela garante:
 * - fundo escurecido que fecha ao toque, e botão de fechar com rótulo;
 * - `Escape`/voltar do Android fecham;
 * - safe area respeitada na base, com o indicador de Home;
 * - conteúdo rola quando a fonte do sistema cresce;
 * - sem movimento quando o sistema pede menos movimento.
 *
 * Não usa `GlassSurface`: a folha nasce em outra hierarquia nativa, onde não há
 * o que desfocar atrás. Superfície sólida da paleta é o acabamento honesto.
 *
 * **A Fase 07 acrescentou duas coisas, e as duas são opcionais de propósito.**
 * Até aqui toda folha era um seletor de opções — o motivo da recusa, o "como
 * terminou?" — e nenhuma tinha campo de texto. Responder e denunciar uma
 * avaliação são as primeiras que têm, e com o teclado aberto a ação de enviar
 * ficava escondida (§94 da Fase 07). Daí `comTeclado` e `rodape`. Quem não
 * passa nenhum dos dois recebe exatamente a folha da Fase 03, sem uma linha de
 * diferença — que é a condição para mexer num arquivo da fundação.
 */
export function Sheet({
  aberta,
  titulo,
  descricao,
  onFechar,
  children,
  comTeclado = false,
  rodape,
}: {
  aberta: boolean;
  titulo: string;
  descricao?: string;
  onFechar: () => void;
  children: ReactNode;
  /**
   * A folha tem campo de texto: sobe com o teclado em vez de ficar embaixo
   * dele. Só quem precisa liga — o comportamento padrão continua o de antes.
   */
  comTeclado?: boolean;
  /**
   * Uma ação fixa na base, fora da rolagem. Com teclado aberto e um texto
   * longo digitado, o botão dentro do `ScrollView` some para baixo; aqui ele
   * fica onde o polegar espera.
   */
  rodape?: ReactNode;
}) {
  const { colors, reduceMotion } = useTheme();
  const insets = useSafeAreaInsets();
  const entrada = useSharedValue(0);

  useEffect(() => {
    if (!aberta) {
      entrada.value = 0;
      return;
    }
    entrada.value = reduceMotion
      ? 1
      : withTiming(1, {
          duration: motion.duration.base,
          easing: Easing.bezier(...motion.easing.out),
        });
  }, [aberta, entrada, reduceMotion]);

  useEffect(() => {
    if (!aberta) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onFechar();
      return true;
    });
    return () => sub.remove();
  }, [aberta, onFechar]);

  const painel = useAnimatedStyle(() => ({
    opacity: entrada.value,
    transform: [{ translateY: (1 - entrada.value) * 28 }],
  }));

  const veu = useAnimatedStyle(() => ({ opacity: entrada.value }));

  return (
    <Modal
      visible={aberta}
      transparent
      animationType={reduceMotion ? 'none' : 'fade'}
      onRequestClose={onFechar}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        // `padding` no iOS e `height` no Android é a combinação que funciona
        // dentro de um `Modal` — e sem `comTeclado` o comportamento é
        // `undefined`, ou seja, o de antes desta fase.
        behavior={comTeclado ? (Platform.OS === 'ios' ? 'padding' : 'height') : undefined}
        style={styles.palco}
      >
        <Animated.View style={[StyleSheet.absoluteFill, veu]}>
          {/* O véu fecha ao toque, mas não é anunciado: quem usa leitor de
              tela fecha pelo botão ou pelo gesto do sistema, e dois "Fechar"
              na mesma tela só atrapalhariam. */}
          <Pressable
            style={[StyleSheet.absoluteFill, styles.veu]}
            onPress={onFechar}
            accessible={false}
            importantForAccessibility="no-hide-descendants"
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.painel,
            {
              backgroundColor: colors.surface,
              borderColor: colors.line,
              paddingBottom: Math.max(insets.bottom, space.lg) + space.sm,
            },
            painel,
          ]}
        >
          <View style={[styles.puxador, { backgroundColor: colors.lineStrong }]} />

          <View style={styles.cabecalho}>
            <View style={styles.cabecalhoTexto}>
              <Text variant="title" accessibilityRole="header" maxScale={1.3}>
                {titulo}
              </Text>
              {descricao ? (
                <Text variant="callout" tone="muted" maxScale={1.3}>
                  {descricao}
                </Text>
              ) : null}
            </View>
            <Pressable
              onPress={onFechar}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Fechar"
              style={({ pressed }) => [
                styles.fechar,
                { backgroundColor: colors.surface2, opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <CloseIcon size={18} color={colors.muted} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.rolagem}
            contentContainerStyle={styles.conteudo}
            showsVerticalScrollIndicator={false}
            bounces={false}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>

          {rodape ? <View style={styles.rodape}>{rodape}</View> : null}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/**
 * Uma escolha dentro da folha. Linha inteira tocável, marca à direita — nada
 * de rádio-botão desenhado à mão, que ninguém acerta com o polegar.
 */
export function OpcaoDaFolha({
  rotulo,
  selecionada,
  onPress,
  primeira = false,
}: {
  rotulo: string;
  selecionada: boolean;
  onPress: () => void;
  primeira?: boolean;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityLabel={rotulo}
      accessibilityState={{ checked: selecionada, selected: selecionada }}
      aria-checked={selecionada}
      style={({ pressed }) => [
        styles.opcao,
        !primeira && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
        pressed && { backgroundColor: colors.pressOverlay },
      ]}
    >
      <Text
        variant={selecionada ? 'bodyStrong' : 'body'}
        tone={selecionada ? 'brand' : 'ink'}
        style={styles.opcaoTexto}
        maxScale={1.3}
      >
        {rotulo}
      </Text>
      <View
        style={[
          styles.marca,
          {
            borderColor: selecionada ? colors.brand : colors.lineStrong,
            backgroundColor: selecionada ? colors.brand : 'transparent',
          },
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // O `Modal` nasce em outra hierarquia nativa e não herda a largura da tela:
  // sem `alignItems: stretch` explícito, o painel se dimensiona pelo conteúdo
  // e o botão de fechar sai pela borda direita.
  palco: { flex: 1, justifyContent: 'flex-end', alignItems: 'stretch' },
  veu: { backgroundColor: 'rgba(8,13,11,0.5)' },
  painel: {
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    borderWidth: StyleSheet.hairlineWidth,
    paddingTop: space.md,
    maxHeight: '88%',
    width: '100%',
  },
  puxador: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: space.lg,
  },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.lg,
    paddingHorizontal: gutter,
  },
  cabecalhoTexto: { flex: 1, gap: space.xs },
  fechar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -3,
  },
  rolagem: { marginTop: space.xl },
  conteudo: { paddingHorizontal: gutter, gap: space.lg, paddingBottom: space.xs },
  rodape: { paddingHorizontal: gutter, paddingTop: space.lg, gap: space.sm },
  opcao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    minHeight: 52,
    paddingVertical: space.md,
    paddingHorizontal: space.xs,
  },
  opcaoTexto: { flex: 1 },
  marca: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.6,
  },
});
