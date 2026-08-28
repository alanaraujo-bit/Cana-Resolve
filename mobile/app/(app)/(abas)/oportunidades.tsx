import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ESPACO_BARRA } from '@/navigation/BarraPrincipal';
import { useCarteira } from '@/oportunidades/Carteira';
import { CartaoOportunidade } from '@/oportunidades/componentes';
import {
  aplicar,
  categoriasDe,
  contarPorGrupo,
  doGrupo,
  semFiltro,
  temFiltro,
  type Filtro,
} from '@/oportunidades/filtros';
import {
  grupos,
  rotuloGrupo,
  rotuloGrupoCurto,
  vazioDoGrupo,
  type Grupo,
  type Oportunidade,
} from '@/oportunidades/tipos';
import { gutter, motion, radius, space, useTheme } from '@/theme';
import { AlertIcon, BrandMark, Button, OportunidadesIcon, Skeleton, Text } from '@/ui';

/**
 * A Central de Oportunidades.
 *
 * Ela responde, na ordem: **o que espera por mim?**, **o que já está andando?**
 * e **o que já aconteceu?** — três seções, não dez etapas. Nada de funil, de
 * kanban ou de status quase iguais: o profissional precisa saber se a bola está
 * com ele, com a pessoa, ou se acabou.
 *
 * O item é tocável inteiro e não carrega botão nenhum. A decisão mora no
 * detalhe, onde há espaço para tomá-la com o contexto todo à vista.
 *
 * A seção escolhida e o filtro vivem no estado desta tela: abrir uma
 * oportunidade e voltar não desfaz o que a pessoa acabou de escolher.
 */
export default function Oportunidades() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { situacao, oportunidades, erro, atualizando, atualizar, agora } = useCarteira();

  const [grupo, setGrupo] = useState<Grupo>('atencao');
  const [filtro, setFiltro] = useState<Filtro>(semFiltro);

  const contagens = useMemo(() => contarPorGrupo(oportunidades), [oportunidades]);
  const daSecao = useMemo(() => doGrupo(oportunidades, grupo), [oportunidades, grupo]);
  const categorias = useMemo(() => categoriasDe(daSecao), [daSecao]);
  const visiveis = useMemo(() => aplicar(daSecao, filtro), [daSecao, filtro]);

  // Um filtro que não separa nada não é um filtro: some quando a seção tem um
  // balcão só, e a escolha some junto para não ficar presa numa lista vazia.
  const mostrarFiltro = categorias.length > 1;
  const filtroAtivo = mostrarFiltro && temFiltro(filtro);

  const trocarSecao = useCallback((proximo: Grupo) => {
    setGrupo(proximo);
    setFiltro(semFiltro);
  }, []);

  // Tocar na lista é navegar, não é ler. Quem marca a oportunidade como vista é
  // a tela de detalhe, e só ela — assim "visualizada" continua significando
  // uma coisa só, no estado e na medição.
  const aoAbrir = useCallback(
    (o: Oportunidade) => {
      router.push({ pathname: '/oportunidade/[id]', params: { id: o.id } });
    },
    [router],
  );

  const renderizar = useCallback(
    ({ item }: { item: Oportunidade }) => (
      <CartaoOportunidade oportunidade={item} onAbrir={aoAbrir} agora={agora} />
    ),
    [aoAbrir, agora],
  );

  const cabecalho = (
    <View style={styles.topo}>
      <View style={styles.titulo}>
        <Text variant="displayMD" maxScale={1.2}>
          Oportunidades
        </Text>
        <Text variant="callout" tone="muted" maxScale={1.25}>
          Tudo que chegou até você em Canaã dos Carajás.
        </Text>
      </View>

      <Secoes atual={grupo} contagens={contagens} onTrocar={trocarSecao} />

      {mostrarFiltro ? (
        <Balcoes
          categorias={categorias}
          escolhida={filtro.categoria}
          onEscolher={(c) => setFiltro({ categoria: c })}
        />
      ) : null}
    </View>
  );

  return (
    <FlatList
      style={styles.tela}
      data={situacao === 'pronto' ? visiveis : []}
      keyExtractor={(o) => o.id}
      renderItem={renderizar}
      ListHeaderComponent={cabecalho}
      ItemSeparatorComponent={Separador}
      contentContainerStyle={[
        styles.conteudo,
        { paddingTop: insets.top + space.lg, paddingBottom: insets.bottom + ESPACO_BARRA },
      ]}
      showsVerticalScrollIndicator={false}
      // A lista vai crescer: nada de renderizar o histórico inteiro de uma vez.
      initialNumToRender={8}
      maxToRenderPerBatch={8}
      windowSize={9}
      removeClippedSubviews
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={atualizando}
          onRefresh={() => void atualizar()}
          tintColor={colors.brand}
          colors={[colors.brand]}
          progressBackgroundColor={colors.surface}
        />
      }
      ListEmptyComponent={
        situacao === 'carregando' ? (
          <Esqueleto />
        ) : situacao === 'erro' && erro ? (
          <Falha mensagem={erro.message} detalhe={erro.detalhe} onTentar={() => void atualizar()} />
        ) : filtroAtivo ? (
          <SemResultado onLimpar={() => setFiltro(semFiltro)} />
        ) : (
          <Vazio grupo={grupo} />
        )
      }
    />
  );
}

function Separador() {
  return <View style={styles.separador} />;
}

/**
 * As três seções. Um controle segmentado, não abas — a Central já é uma aba, e
 * aba dentro de aba confunde a volta.
 *
 * Sem números à vista, de propósito. Três contadores lado a lado é a densidade
 * de painel que este produto recusa, e em uma tela de 320 eles cortavam os
 * próprios rótulos ("Esper... 3"). O número que importa — quantas esperam você
 * — já está no selo da aba; os outros dois a seção responde ao ser aberta. O
 * leitor de tela continua ouvindo a contagem, onde ela não custa espaço.
 */
function Secoes({
  atual,
  contagens,
  onTrocar,
}: {
  atual: Grupo;
  contagens: Record<Grupo, number>;
  onTrocar: (g: Grupo) => void;
}) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  // Num telefone de 320 os três nomes não cabem em 14. Descer um degrau da
  // escala é melhor do que cortá-los — 13 continua sendo texto de leitura.
  const apertado = width < 360;

  return (
    <View
      style={[styles.secoes, { backgroundColor: colors.surface2, borderColor: colors.line }]}
      accessibilityRole="tablist"
    >
      {grupos.map((g) => {
        const selecionada = g === atual;
        const n = contagens[g];
        return (
          <Pressable
            key={g}
            onPress={() => onTrocar(g)}
            accessibilityRole="tab"
            accessibilityState={{ selected: selecionada }}
            // O estado precisa chegar ao leitor de tela: sozinho,
            // `accessibilityState` não vira atributo nenhum na web, e a seleção
            // ficaria dita só pela cor.
            aria-selected={selecionada}
            accessibilityLabel={`${rotuloGrupo[g]}${n > 0 ? `, ${n}` : ', nenhuma'}`}
            style={({ pressed }) => [
              styles.secao,
              selecionada && { backgroundColor: colors.surface, borderColor: colors.line },
              pressed && !selecionada && { opacity: 0.6 },
            ]}
          >
            <Text
              variant="label"
              numberOfLines={1}
              maxScale={1.15}
              style={[
                { color: selecionada ? colors.ink : colors.muted },
                apertado && styles.secaoApertada,
              ]}
            >
              {rotuloGrupoCurto[g]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** O único filtro: o balcão. Só aparece quando há mais de um para separar. */
function Balcoes({
  categorias,
  escolhida,
  onEscolher,
}: {
  categorias: string[];
  escolhida: string | null;
  onEscolher: (c: string | null) => void;
}) {
  const { colors } = useTheme();

  const chip = (rotulo: string, valor: string | null) => {
    const ativo = escolhida === valor;
    return (
      <Pressable
        key={valor ?? 'todos'}
        onPress={() => onEscolher(ativo ? null : valor)}
        // Escolher um balcão é escolher um entre vários: `radio` é o que
        // descreve isso, e é o papel que carrega o estado escolhido.
        accessibilityRole="radio"
        accessibilityLabel={valor === null ? 'Todos os balcões' : rotulo}
        accessibilityState={{ checked: ativo, selected: ativo }}
        aria-checked={ativo}
        style={({ pressed }) => [
          styles.chip,
          {
            backgroundColor: ativo ? colors.brandSoft : colors.surface,
            borderColor: ativo ? colors.brandLine : colors.line,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        <Text
          variant="caption"
          maxScale={1.2}
          numberOfLines={1}
          style={{ color: ativo ? colors.brandInk : colors.muted }}
        >
          {rotulo}
        </Text>
      </Pressable>
    );
  };

  // Uma fileira só, que corre para o lado. Nomes de balcão são longos ("Ar-
  // condicionado e refrigeração") e, embrulhados, empurrariam as oportunidades
  // para fora da primeira tela — que é justamente o que se veio ver.
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chips}
      // O filtro corre para o lado; a lista continua rolando para baixo.
      style={styles.chipsArea}
      accessibilityRole="radiogroup"
      accessibilityLabel="Filtrar por balcão"
    >
      {chip('Todos', null)}
      {categorias.map((c) => chip(c, c))}
    </ScrollView>
  );
}

function Vazio({ grupo }: { grupo: Grupo }) {
  const { colors } = useTheme();
  const { titulo, texto } = vazioDoGrupo[grupo];

  return (
    <Animated.View
      entering={FadeInDown.duration(motion.duration.slow)}
      style={[styles.vazio, { borderColor: colors.line }]}
    >
      <View style={[styles.vazioMarca, { backgroundColor: colors.brandSoft }]}>
        <BrandMark size={30} pin={colors.brand} check={colors.accent} strokeWidth={1.8} />
      </View>
      <Text variant="title" center maxScale={1.25}>
        {titulo}
      </Text>
      <Text variant="callout" tone="muted" center maxScale={1.25} style={styles.vazioTexto}>
        {texto}
      </Text>
    </Animated.View>
  );
}

function SemResultado({ onLimpar }: { onLimpar: () => void }) {
  const { colors } = useTheme();

  return (
    <Animated.View
      entering={FadeIn.duration(motion.duration.base)}
      style={[styles.vazio, { borderColor: colors.line }]}
      accessibilityLiveRegion="polite"
    >
      <View style={[styles.vazioMarca, { backgroundColor: colors.surface2 }]}>
        <OportunidadesIcon size={26} color={colors.muted} />
      </View>
      <Text variant="bodyStrong" center maxScale={1.25}>
        Nenhuma oportunidade neste balcão.
      </Text>
      <Button label="Limpar filtro" variant="outline" onPress={onLimpar} style={styles.vazioAcao} />
    </Animated.View>
  );
}

function Falha({
  mensagem,
  detalhe,
  onTentar,
}: {
  mensagem: string;
  detalhe?: string;
  onTentar: () => void;
}) {
  const { colors } = useTheme();

  return (
    <View style={[styles.vazio, { borderColor: colors.line }]} accessibilityLiveRegion="polite">
      <AlertIcon size={20} color={colors.muted} />
      <Text variant="bodyStrong" center maxScale={1.25}>
        {mensagem}
      </Text>
      <Text variant="callout" tone="muted" center maxScale={1.25} style={styles.vazioTexto}>
        Isso costuma ser a conexão. O resto do aplicativo continua funcionando.
      </Text>
      {__DEV__ && detalhe ? (
        <Text variant="caption" tone="faint" center>
          {`Desenvolvimento — ${detalhe}`}
        </Text>
      ) : null}
      <Button
        label="Tentar de novo"
        variant="outline"
        onPress={onTentar}
        style={styles.vazioAcao}
      />
    </View>
  );
}

/** O esqueleto tem a forma dos cartões que vão chegar. */
function Esqueleto() {
  const { colors } = useTheme();

  return (
    <View style={styles.esqueleto} accessibilityLabel="Carregando suas oportunidades">
      {[0, 1, 2].map((i) => (
        <View key={i} style={[styles.esqueletoCartao, { borderColor: colors.line }]}>
          <View style={styles.esqueletoTopo}>
            <Skeleton width={132} height={20} />
            <Skeleton width={54} height={12} />
          </View>
          <Skeleton width="94%" height={18} />
          <Skeleton width="62%" height={18} />
          <Skeleton width="46%" height={14} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1 },
  conteudo: { paddingHorizontal: gutter },
  topo: { gap: space.xl, marginBottom: space.xl },
  titulo: { gap: space.sm },
  secoes: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
  secao: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: space.xs,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  // A fileira sangra até a borda da tela e devolve a margem por dentro: o
  // último balcão não fica "colado" ao sumir, e o primeiro alinha ao conteúdo.
  secaoApertada: { fontSize: 13, letterSpacing: -0.1 },
  chipsArea: { marginHorizontal: -gutter },
  chips: { flexDirection: 'row', gap: space.sm, paddingHorizontal: gutter },
  chip: {
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    minHeight: 34,
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  separador: { height: space.md },
  vazio: {
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space['3xl'],
    paddingHorizontal: space.xl,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
  },
  vazioMarca: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vazioTexto: { maxWidth: 300 },
  vazioAcao: { alignSelf: 'stretch', marginTop: space.xs },
  esqueleto: { gap: space.md },
  esqueletoCartao: {
    gap: space.md,
    padding: space.xl,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  esqueletoTopo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
