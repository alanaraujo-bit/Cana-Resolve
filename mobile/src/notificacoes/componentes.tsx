/**
 * As duas superfícies que a Fase 06 acrescenta ao produto.
 *
 * Duas, e não mais: a especificação é explícita em **não** construir caixa de
 * entrada, sino, feed nem painel de "últimas notificações" (§84, §85, §86,
 * §122). A entidade continua sendo a oportunidade, e ela já tem Central.
 *
 * As duas herdam a fundação inteira — tokens, tipografia, motion, vidro,
 * claro/escuro (§101). Nenhum estilo novo nasceu por causa de push.
 */
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { gutter, hitTarget, motion, radius, space, useTheme } from '@/theme';
import { Button, CloseIcon, GlassSurface, Text } from '@/ui';

/* -------------------------------------------------------------------------- */
/*  O convite                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * O contexto antes do prompt do sistema (§31, §32).
 *
 * Curto: um título, uma frase, duas ações de igual peso visual. "Agora não"
 * não é um link cinza escondido no rodapé — se fosse, seria o dark pattern que
 * o §32 proíbe pelo nome.
 *
 * Ele aparece na Home, e só depois de a pessoa estar autenticada e ver as
 * próprias oportunidades. É a ordem que faz a frase "mesmo com o aplicativo
 * fechado" significar alguma coisa para quem lê.
 */
export function ConviteDeNotificacoes({
  onAtivar,
  onAdiar,
  ocupado = false,
}: {
  onAtivar: () => void;
  onAdiar: () => void;
  ocupado?: boolean;
}) {
  const { colors, reduceMotion } = useTheme();

  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeInUp.duration(motion.duration.slow)}
      accessibilityRole="summary"
    >
      <View
        style={[
          estilos.convite,
          { backgroundColor: colors.brandSoft, borderColor: colors.brandLine },
        ]}
      >
        <Text variant="title" maxScale={1.3}>
          Não perca uma oportunidade
        </Text>
        <Text variant="body" tone="muted" maxScale={1.35}>
          Ative as notificações para saber quando um pedido compatível com o seu trabalho chegar —
          mesmo com o aplicativo fechado.
        </Text>

        <View style={estilos.conviteAcoes}>
          <Button label="Ativar notificações" onPress={onAtivar} loading={ocupado} />
          {/* Mesma altura, mesmo alvo, texto igualmente legível. Recusar
              precisa custar um toque, como aceitar. */}
          <Button label="Agora não" variant="quiet" onPress={onAdiar} />
        </View>
      </View>
    </Animated.View>
  );
}

/* -------------------------------------------------------------------------- */
/*  A faixa de aviso                                                          */
/* -------------------------------------------------------------------------- */

/** Quanto tempo a faixa fica antes de sumir sozinha. */
const PERMANENCIA = 7000;

/**
 * "Chegou uma oportunidade nova" — com o aplicativo aberto (§25).
 *
 * Tudo o que ela **não** faz é o desenho dela: não bloqueia, não é modal, não
 * ocupa a tela, não fica para sempre e **não navega sozinha** (§24). A pessoa
 * pode estar preenchendo o Perfil; ser arrancada dali porque um pedido chegou
 * seria o produto decidindo pelo profissional.
 *
 * Ela também não substitui a notificação do sistema, nem a desenha: banner
 * nativo é do sistema operacional, e o §102 manda deixá-lo lá.
 */
export function FaixaDeAviso({
  titulo,
  texto,
  acao,
  onAcao,
  onDispensar,
}: {
  titulo: string;
  texto?: string | null;
  /** O rótulo da ação, quando houver para onde ir. */
  acao?: string;
  onAcao?: () => void;
  onDispensar: () => void;
}) {
  const { colors, reduceMotion } = useTheme();
  const insets = useSafeAreaInsets();

  // Some sozinha. Uma faixa que fica indefinidamente vira parte da moldura, e
  // parte da moldura ninguém lê.
  useEffect(() => {
    const relogio = setTimeout(onDispensar, PERMANENCIA);
    return () => clearTimeout(relogio);
  }, [onDispensar]);

  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeInUp.duration(motion.duration.base)}
      exiting={reduceMotion ? undefined : FadeOutUp.duration(motion.duration.fast)}
      pointerEvents="box-none"
      style={[estilos.faixaArea, { top: insets.top + space.xs, paddingHorizontal: gutter }]}
    >
      <GlassSurface radius={radius.xl} style={estilos.faixa}>
        <View
          style={estilos.faixaTexto}
          accessible
          accessibilityLiveRegion="polite"
          accessibilityLabel={texto ? `${titulo}. ${texto}` : titulo}
        >
          <Text variant="label" numberOfLines={1} maxScale={1.2}>
            {titulo}
          </Text>
          {texto ? (
            <Text variant="caption" tone="muted" numberOfLines={1} maxScale={1.2}>
              {texto}
            </Text>
          ) : null}
        </View>

        {acao && onAcao ? (
          <Pressable
            onPress={onAcao}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={acao}
            style={({ pressed }) => [estilos.faixaAcao, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Text variant="label" tone="brand" maxScale={1.2}>
              {acao}
            </Text>
          </Pressable>
        ) : null}

        <Pressable
          onPress={onDispensar}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Dispensar aviso"
          style={({ pressed }) => [estilos.faixaFechar, { opacity: pressed ? 0.5 : 1 }]}
        >
          <CloseIcon size={16} color={colors.faint} />
        </Pressable>
      </GlassSurface>
    </Animated.View>
  );
}

const estilos = StyleSheet.create({
  convite: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: space.lg,
    gap: space.sm,
  },
  conviteAcoes: { gap: space.xs, paddingTop: space.xs },

  faixaArea: { position: 'absolute', left: 0, right: 0, zIndex: 20 },
  faixa: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.sm,
    paddingLeft: space.md,
    paddingRight: space.sm,
    minHeight: hitTarget,
  },
  faixaTexto: { flex: 1, gap: 1 },
  faixaAcao: { paddingHorizontal: space.xs, paddingVertical: space.xs },
  faixaFechar: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
