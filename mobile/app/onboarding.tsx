import { useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StageAlcance, StageControle, StageEncaixe } from '@/onboarding/stages';
import { useSession } from '@/session/SessionProvider';
import { gutter, motion, radius, space, useTheme } from '@/theme';
import { Button, GlassSurface, Text, Wordmark, haptics, useCanvasParallax } from '@/ui';

type Pagina = {
  chave: string;
  olho: string;
  titulo: string;
  texto: string;
  Palco: typeof StageAlcance;
};

const PAGINAS: Pagina[] = [
  {
    chave: 'alcance',
    olho: 'A REDE',
    titulo: 'Mais oportunidades para quem resolve.',
    texto:
      'O Canaã Resolve liga quem precisa de um serviço a quem faz esse serviço aqui em Canaã dos Carajás.',
    Palco: StageAlcance,
  },
  {
    chave: 'encaixe',
    olho: 'OS PEDIDOS',
    titulo: 'Pedidos que combinam com o seu trabalho.',
    texto:
      'Você diz o que faz e onde atende. Os pedidos chegam por categoria, serviço e região — não é tudo para todo mundo.',
    Palco: StageEncaixe,
  },
  {
    chave: 'controle',
    olho: 'O SEU RITMO',
    titulo: 'Você continua no controle.',
    texto:
      'Veja o que a pessoa precisa antes de responder. Você escolhe quais pedidos aceitar e conduz o atendimento do seu jeito.',
    Palco: StageControle,
  },
];

export default function Onboarding() {
  const { reduceMotion } = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { completeOnboarding } = useSession();
  const canvas = useCanvasParallax();

  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollX = useSharedValue(0);
  const [indice, setIndice] = useState(0);
  const saindo = useRef(false);

  const progresso = useDerivedValue(() => (width > 0 ? scrollX.value / width : 0), [width]);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
      // O fundo da aplicação segue o dedo: é o mesmo fundo em todas as páginas.
      canvas.value = width > 0 ? event.contentOffset.x / width : 0;
    },
  });

  // A virada de página é o único momento com retorno tátil aqui.
  useAnimatedReaction(
    () => Math.round(progresso.value),
    (atual, anterior) => {
      if (anterior !== null && atual !== anterior) {
        runOnJS(setIndice)(atual);
        runOnJS(haptics.step)();
      }
    },
    [],
  );

  const irPara = useCallback(
    (destino: number) => {
      scrollRef.current?.scrollTo({ x: destino * width, animated: true });
    },
    [scrollRef, width],
  );

  const concluir = useCallback(async () => {
    if (saindo.current) return;
    saindo.current = true;
    haptics.commit();
    canvas.value = withTiming(PAGINAS.length, { duration: motion.duration.deliberate });
    await completeOnboarding();
    router.replace('/entrar');
  }, [canvas, completeOnboarding, router]);

  const avancar = useCallback(() => {
    if (indice >= PAGINAS.length - 1) {
      void concluir();
      return;
    }
    irPara(indice + 1);
  }, [concluir, indice, irPara]);

  const ultimo = indice >= PAGINAS.length - 1;

  const pularEstilo = useAnimatedStyle(() => ({
    opacity: withTiming(progresso.value > PAGINAS.length - 1.4 ? 0 : 1, {
      duration: motion.duration.base,
    }),
  }));

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + space.sm }]}>
        <Wordmark size="sm" subtitle="Para profissionais" />
        <Animated.View style={[pularEstilo, { pointerEvents: ultimo ? 'none' : 'auto' }]}>
          <Pressable
            onPress={concluir}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Pular apresentação"
            accessibilityHint="Vai direto para a tela de entrar"
            style={({ pressed }) => [styles.pular, { opacity: pressed ? 0.55 : 1 }]}
          >
            <Text variant="label" tone="muted">
              Pular
            </Text>
          </Pressable>
        </Animated.View>
      </View>

      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        decelerationRate="fast"
        bounces={false}
        overScrollMode="never"
        style={styles.pager}
        accessibilityRole="tablist"
      >
        {PAGINAS.map((pagina, i) => (
          <PaginaView
            key={pagina.chave}
            pagina={pagina}
            indice={i}
            total={PAGINAS.length}
            width={width}
            progresso={progresso}
            reduceMotion={reduceMotion}
          />
        ))}
      </Animated.ScrollView>

      <View
        style={[
          styles.dockArea,
          { paddingBottom: Math.max(insets.bottom, space.lg), paddingHorizontal: gutter },
        ]}
      >
        <GlassSurface radius={radius['2xl']} style={styles.dock}>
          <Trilho progresso={progresso} total={PAGINAS.length} atual={indice} />
          <Button
            label={ultimo ? 'Começar' : 'Continuar'}
            onPress={avancar}
            haptic={ultimo ? 'none' : 'step'}
            accessibilityHint={
              ultimo ? 'Conclui a apresentação e abre a tela de entrar' : 'Vai para a próxima etapa'
            }
            testID="onboarding-avancar"
          />
        </GlassSurface>
      </View>
    </View>
  );
}

function PaginaView({
  pagina,
  indice,
  total,
  width,
  progresso,
  reduceMotion,
}: {
  pagina: Pagina;
  indice: number;
  total: number;
  width: number;
  progresso: SharedValue<number>;
  reduceMotion: boolean;
}) {
  const relativo = useDerivedValue(() => progresso.value - indice, [indice]);

  const texto = useAnimatedStyle(() => {
    if (reduceMotion) return {};
    const p = relativo.value;
    return {
      // O texto anda mais devagar que a página: dá profundidade sem truque.
      transform: [{ translateX: p * -60 }],
      opacity: interpolate(Math.abs(p), [0, 0.7], [1, 0], 'clamp'),
    };
  });

  const { Palco } = pagina;

  return (
    <View
      style={[styles.pagina, { width }]}
      accessible={false}
      accessibilityLabel={`Etapa ${indice + 1} de ${total}: ${pagina.titulo}`}
    >
      <View style={styles.palco}>
        <Palco progress={relativo} />
      </View>
      <Animated.View style={[styles.copy, texto]}>
        <Text variant="overline" tone="accent">
          {pagina.olho}
        </Text>
        <Text variant="displayLG" style={styles.titulo}>
          {pagina.titulo}
        </Text>
        <Text variant="body" tone="muted" style={styles.texto}>
          {pagina.texto}
        </Text>
      </Animated.View>
    </View>
  );
}

/** Três segmentos: o atual se preenche conforme o dedo anda. */
function Trilho({
  progresso,
  total,
  atual,
}: {
  progresso: SharedValue<number>;
  total: number;
  atual: number;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={styles.trilho}
      accessibilityRole="progressbar"
      accessibilityLabel={`Etapa ${Math.min(atual + 1, total)} de ${total}`}
      accessibilityValue={{ min: 1, max: total, now: Math.min(atual + 1, total) }}
    >
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[styles.trilhoTrack, { backgroundColor: colors.lineStrong }]}
        >
          <SegmentoPreenchido progresso={progresso} indice={i} cor={colors.brand} />
        </View>
      ))}
    </View>
  );
}

function SegmentoPreenchido({
  progresso,
  indice,
  cor,
}: {
  progresso: SharedValue<number>;
  indice: number;
  cor: string;
}) {
  const estilo = useAnimatedStyle(() => ({
    transform: [
      { scaleX: interpolate(progresso.value, [indice - 1, indice], [0, 1], 'clamp') },
    ],
  }));
  return (
    <Animated.View style={[styles.trilhoFill, { backgroundColor: cor }, estilo]} />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: gutter,
    paddingBottom: space.sm,
  },
  pular: { paddingHorizontal: space.sm, paddingVertical: space.sm },
  pager: { flex: 1 },
  pagina: { flex: 1, justifyContent: 'space-between' },
  palco: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: gutter,
    paddingTop: space.lg,
  },
  copy: { paddingHorizontal: gutter, paddingBottom: space['2xl'], gap: space.md },
  titulo: { marginTop: 2 },
  texto: { maxWidth: 420 },
  dockArea: { gap: space.md },
  dock: { padding: space.lg, gap: space.lg },
  trilho: { flexDirection: 'row', gap: space.sm, paddingHorizontal: space.xs },
  trilhoTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  trilhoFill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 2,
    transformOrigin: 'left',
  },
});
