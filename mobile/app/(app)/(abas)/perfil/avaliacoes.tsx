import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ESPACO_BARRA } from '@/navigation/BarraPrincipal';
import { registrar } from '@/reputacao/analytics';
import {
  CartaoDeAvaliacao,
  Distribuicao,
  ResumoDeNota,
  SemAvaliacoes,
  UmaEstrela,
} from '@/reputacao/componentes';
import { ComoFuncionam } from '@/reputacao/explicacoes';
import { useReputacao } from '@/reputacao/ReputacaoProvider';
import {
  fraseDeVolume,
  NOTAS,
  VOLUME_PARA_FILTRO,
  type Avaliacao,
  type Nota,
} from '@/reputacao/tipos';
import { gutter, hitTarget, radius, space, useTheme } from '@/theme';
import { Bloco, Button, CabecalhoDeTela, Nota as NotaVisual, Skeleton, Text } from '@/ui';

/**
 * A lista completa de avaliações.
 *
 * Ela existe porque o resumo do Perfil mostra poucas de propósito (§38), e
 * porque a pergunta "o que os clientes disseram?" merece um lugar para ser
 * respondida inteira — e não um cartão que rola para o lado.
 *
 * A ordem é a mais recente primeiro, e é só isso (§43). Não há relevância
 * calculada, não há "mais úteis", não há ordenação secreta: qualquer critério
 * além do tempo é uma escolha editorial sobre a reputação de alguém, e o
 * Canaã Resolve não vai fazer essa escolha em silêncio.
 *
 * O filtro por nota **só aparece quando há volume que o justifique**. Numa
 * lista de três, ele não poupa rolagem nenhuma e ainda sugere que existe muito
 * mais do que existe.
 */
export default function Avaliacoes() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const {
    situacao,
    avaliacoes,
    resumo,
    erro,
    atualizando,
    temMais,
    carregandoMais,
    somenteLocal,
    atualizar,
    carregarMais,
  } = useReputacao();

  const [filtro, setFiltro] = useState<Nota | null>(null);
  const [explicando, setExplicando] = useState(false);

  useEffect(() => {
    registrar({ nome: 'avaliacoes_abertas', total: resumo.total });
    // Só na abertura: reabrir o teclado de eventos a cada mudança de contagem
    // encheria o analytics de ruído.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lista = useMemo(
    () => (filtro ? avaliacoes.filter((a) => a.nota === filtro) : avaliacoes),
    [avaliacoes, filtro],
  );

  const abrir = useCallback(
    (a: Avaliacao) => {
      // A forma de objeto, e não a interpolada: para uma rota dinâmica é ela
      // que o gerador de rotas tipadas aceita, e é ela que escapa o id em vez
      // de o costurar cru na URL.
      router.push({ pathname: '/perfil/avaliacoes/[id]', params: { id: a.id } });
    },
    [router],
  );

  const respiro = { paddingBottom: insets.bottom + ESPACO_BARRA };

  const cabecalho = (
    <View style={estilos.topo}>
      {/* O resumo. Fonte única: o mesmo objeto que a capa do Perfil lê. */}
      <View style={[estilos.resumo, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        {resumo.total === 0 ? <SemAvaliacoes /> : <ResumoDeNota resumo={resumo} tamanho="grande" />}

        <Text variant="caption" tone="muted" maxScale={1.3}>
          {fraseDeVolume(resumo)}
        </Text>

        <Distribuicao resumo={resumo} />

        {resumo.foraDaConta > 0 ? (
          <Text variant="caption" tone="faint" maxScale={1.25}>
            {resumo.foraDaConta === 1
              ? '1 avaliação está em análise e não entra nesta média.'
              : `${resumo.foraDaConta} avaliações estão em análise e não entram nesta média.`}
          </Text>
        ) : null}

        <Pressable
          onPress={() => {
            registrar({ nome: 'reputacao_explicada' });
            setExplicando(true);
          }}
          accessibilityRole="button"
          accessibilityLabel="Como funcionam as avaliações"
          hitSlop={10}
          style={estilos.comoFunciona}
        >
          <Text variant="caption" tone="brand" maxScale={1.25}>
            Como funcionam as avaliações
          </Text>
        </Pressable>
      </View>

      {somenteLocal ? (
        <NotaVisual tom="destaque">
          Estas avaliações são exemplos de desenvolvimento e não saem deste aparelho. Quando o
          servidor de dados estiver ligado, elas passam a ser as suas.
        </NotaVisual>
      ) : null}

      {resumo.total >= VOLUME_PARA_FILTRO ? (
        <Filtro valor={filtro} onChange={setFiltro} />
      ) : null}
    </View>
  );

  return (
    <View style={estilos.tela}>
      <View style={{ paddingTop: insets.top + space.sm }}>
        <CabecalhoDeTela titulo="Avaliações" aoVoltar={() => router.back()} />
      </View>

      {situacao === 'carregando' ? (
        <Carregando />
      ) : situacao === 'erro' ? (
        <View style={[estilos.centro, respiro]}>
          <Text variant="title" center maxScale={1.25}>
            {erro?.message ?? 'Não foi possível carregar as avaliações agora.'}
          </Text>
          <Text variant="callout" tone="muted" center maxScale={1.25}>
            Confira sua conexão e tente de novo.
          </Text>
          {__DEV__ && erro?.detalhe ? (
            <Text variant="caption" tone="faint" center maxScale={1.1}>
              {erro.detalhe}
            </Text>
          ) : null}
          <Button label="Tentar de novo" variant="outline" onPress={() => void atualizar()} />
        </View>
      ) : (
        <FlatList
          data={lista}
          keyExtractor={(a) => a.id}
          ListHeaderComponent={cabecalho}
          contentContainerStyle={[estilos.conteudo, respiro]}
          showsVerticalScrollIndicator={false}
          // Janela limitada: a lista cresce, e renderizar tudo de uma vez é o
          // que faz uma tela de trinta itens engasgar num aparelho simples.
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={7}
          removeClippedSubviews
          onEndReachedThreshold={0.6}
          onEndReached={() => {
            if (!filtro) void carregarMais();
          }}
          refreshControl={
            <RefreshControl
              refreshing={atualizando}
              onRefresh={() => void atualizar()}
              tintColor={colors.brand}
              colors={[colors.brand]}
              progressBackgroundColor={colors.surface}
            />
          }
          renderItem={({ item, index }) => (
            <Bloco style={estilos.itemBloco}>
              <CartaoDeAvaliacao
                avaliacao={item}
                onPress={() => abrir(item)}
                primeira
                ultima={index === lista.length - 1}
              />
            </Bloco>
          )}
          ListEmptyComponent={
            filtro ? (
              <View style={estilos.vazioFiltro}>
                <Text variant="bodyStrong" center maxScale={1.25}>
                  Nenhuma avaliação com essa nota.
                </Text>
                <Button label="Ver todas" variant="quiet" onPress={() => setFiltro(null)} />
              </View>
            ) : (
              <View style={estilos.vazioFiltro}>
                <SemAvaliacoes />
              </View>
            )
          }
          ListFooterComponent={
            carregandoMais ? (
              <View style={estilos.rodape}>
                <ActivityIndicator color={colors.brand} />
              </View>
            ) : temMais && !filtro ? (
              <View style={estilos.rodape}>
                <Button label="Carregar mais" variant="quiet" onPress={() => void carregarMais()} />
              </View>
            ) : null
          }
        />
      )}

      <ComoFuncionam aberta={explicando} onFechar={() => setExplicando(false)} />
    </View>
  );
}

/**
 * O filtro por nota (§44).
 *
 * Cinco botões e um "Todas", e nada além disso: sem busca, sem ordenação, sem
 * intervalo de datas. Cada controle a mais é uma pergunta que o profissional
 * não tinha antes de ver o controle.
 */
function Filtro({ valor, onChange }: { valor: Nota | null; onChange: (n: Nota | null) => void }) {
  const { colors } = useTheme();

  const botao = (n: Nota | null, rotulo: string, acessivel: string) => {
    const marcado = valor === n;
    return (
      <Pressable
        key={rotulo}
        onPress={() => onChange(marcado ? null : n)}
        accessibilityRole="radio"
        accessibilityState={{ checked: marcado, selected: marcado }}
        aria-checked={marcado}
        accessibilityLabel={acessivel}
        style={[
          estilos.chipFiltro,
          {
            backgroundColor: marcado ? colors.brandSoft : colors.surface2,
            borderColor: marcado ? colors.brandLine : colors.line,
          },
        ]}
      >
        {/* Um número e **uma** estrela — "5 ★", e não "5" seguido de cinco
            estrelas com uma preenchida, que era o que `<Estrelas nota={1} />`
            desenhava aqui. Aquilo lia como "1 de 5" ao lado de um 5, dizia
            duas coisas contraditórias no mesmo chip, e ainda ocupava metade da
            linha. A estrela aqui é ícone de unidade, não medida. */}
        <Text variant="caption" tone={marcado ? 'brand' : 'muted'} maxScale={1.15}>
          {rotulo}
        </Text>
        {n !== null ? (
          <View
            aria-hidden
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <UmaEstrela tamanho={12} cor={marcado ? colors.brand : colors.muted} />
          </View>
        ) : null}
      </Pressable>
    );
  };

  return (
    <View accessibilityRole="radiogroup" style={estilos.filtro}>
      {botao(null, 'Todas', 'Todas as notas')}
      {[...NOTAS].reverse().map((n) => botao(n, String(n), `Só as de ${n} estrelas`))}
    </View>
  );
}

/** O esqueleto segue a forma real da tela — não é um retângulo genérico. */
function Carregando() {
  return (
    <View style={[estilos.conteudo, estilos.topo]}>
      <Skeleton width="100%" height={120} style={{ borderRadius: radius.lg }} />
      <Skeleton width="100%" height={130} style={{ borderRadius: radius.lg }} />
      <Skeleton width="100%" height={130} style={{ borderRadius: radius.lg }} />
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1 },
  conteudo: { paddingHorizontal: gutter, paddingTop: space.lg, gap: space.md },
  centro: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: space.lg,
    paddingHorizontal: gutter,
  },

  topo: { gap: space.md, marginBottom: space.xs },
  resumo: {
    gap: space.sm,
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  comoFunciona: { minHeight: hitTarget - 4, justifyContent: 'center', alignSelf: 'flex-start' },

  filtro: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chipFiltro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    // 44 e nao 36: e a regua da fundacao, e um chip de filtro nao e excecao.
    minHeight: hitTarget - 4,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },

  itemBloco: { marginBottom: space.md },

  vazioFiltro: { gap: space.lg, paddingVertical: space['3xl'], alignItems: 'center' },
  rodape: { paddingVertical: space.lg, alignItems: 'center' },
});
