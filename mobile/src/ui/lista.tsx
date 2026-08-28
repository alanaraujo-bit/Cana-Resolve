/**
 * Listas, blocos e cabeçalhos — o vocabulário de uma tela que organiza coisas.
 *
 * Estas peças nasceram no Perfil (Fase 04) e subiram para a fundação quando
 * Conta e Configurações precisaram das mesmas. É a regra que o módulo já
 * declarava: o que se repete fora de casa vira fundação; o que não, fica onde
 * está. `src/perfil/componentes.tsx` continua exportando os mesmos nomes, agora
 * daqui — nenhuma tela da Fase 04 precisou mudar uma linha.
 *
 * A gramática, para não haver duas: **bloco** é uma superfície que agrupa
 * linhas, **grupo** é um título tipográfico acima delas, **nota** explica sem
 * assustar e **alternador** é uma decisão de sim ou não. Configurações não é
 * uma coleção de cartões — é uma lista com hierarquia.
 */

import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, View, type StyleProp, type ViewStyle } from 'react-native';

import { gutter, hitTarget, radius, space, useTheme } from '@/theme';
import { ChevronLeftIcon } from './icons';
import { Text } from './Text';

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
/*  Superfícies e títulos                                                     */
/* -------------------------------------------------------------------------- */

/** O bloco que agrupa linhas. Uma superfície, não seis cartões. */
export function Bloco({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return (
    <View
      style={[estilos.bloco, { backgroundColor: colors.surface, borderColor: colors.line }, style]}
    >
      {children}
    </View>
  );
}

/** Título de grupo. Um olho tipográfico — nunca uma moldura a mais. */
export function Grupo({
  titulo,
  children,
  style,
}: {
  titulo: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[estilos.grupo, style]}>
      <Text variant="overline" tone="faint" accessibilityRole="header">
        {titulo.toUpperCase()}
      </Text>
      {children}
    </View>
  );
}

/** Nota discreta. Explica, não assusta: fundo suave, sem ícone de perigo. */
export function Nota({
  children,
  tom = 'neutro',
}: {
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
 *
 * Um alternador representa **estado binário real**. Se o toque leva a outra
 * tela, isso é navegação e pede uma linha com seta, não um interruptor.
 */
export function Alternador({
  titulo,
  explicacao,
  valor,
  onChange,
  desabilitado = false,
}: {
  titulo: string;
  explicacao?: string;
  valor: boolean;
  onChange: (v: boolean) => void;
  /** Indisponível agora — continua legível, e diz por quê pela explicação. */
  desabilitado?: boolean;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={() => !desabilitado && onChange(!valor)}
      disabled={desabilitado}
      accessibilityRole="switch"
      accessibilityLabel={titulo}
      accessibilityHint={explicacao}
      accessibilityState={{ checked: valor, disabled: desabilitado }}
      style={[estilos.alternador, desabilitado && estilos.desabilitado]}
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
          disabled={desabilitado}
          trackColor={{ false: colors.surface3, true: colors.brandFill }}
          thumbColor={colors.surface}
          ios_backgroundColor={colors.surface3}
        />
      </View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
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

  grupo: { gap: space.md },

  nota: {
    padding: space.md,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },

  alternador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    minHeight: hitTarget,
  },
  alternadorTexto: { flex: 1, gap: 2 },
  semToque: { pointerEvents: 'none' },
  desabilitado: { opacity: 0.55 },
});
