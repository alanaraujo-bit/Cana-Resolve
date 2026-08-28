import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ESPACO_BARRA } from '@/navigation/BarraPrincipal';
import { useCarteira } from '@/oportunidades/Carteira';
import { usePreferencias } from '@/preferencias/PreferenciasProvider';
import { LinhaOportunidade, OportunidadeEmDestaque } from '@/oportunidades/componentes';
import { cenarios, rotuloCenario, type Cenario } from '@/oportunidades/exemplos';
import { grupoDoEstado, type Oportunidade, type ResumoProfissional } from '@/oportunidades/tipos';
import { useSession } from '@/session/SessionProvider';
import { gutter, hitTarget, motion, radius, space, useTheme } from '@/theme';
import {
  AlertIcon,
  Avatar,
  BrandMark,
  Button,
  SectionHeader,
  Skeleton,
  Text,
} from '@/ui';

/**
 * A Home do profissional.
 *
 * A pergunta que ela responde, em cinco segundos: **tem alguma oportunidade
 * esperando por mim?** Por isso a ordem é sempre a mesma — quem eu sou
 * (contexto curto), o que espera resposta (a prioridade), e o que já passou
 * (memória).
 *
 * Ela lê a mesma carteira que a Central: uma decisão tomada no detalhe aparece
 * aqui na volta, sem ninguém sincronizar nada. E o toque leva à **mesma** tela
 * de detalhe — não existe uma versão da Home e outra da Central.
 *
 * O que ficou de fora, de propósito: gráfico, percentual, faturamento, ranking,
 * meta. Nenhum deles ajuda a decidir nada hoje, e a metade seria inventada.
 */

function saudacao(hora: number): string {
  if (hora < 12) return 'Bom dia';
  if (hora < 18) return 'Boa tarde';
  return 'Boa noite';
}

export default function Inicio() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { account } = useSession();
  const { preferencias } = usePreferencias();

  const {
    situacao,
    oportunidades,
    profissional,
    pendencia,
    contaNova,
    erro,
    atualizando,
    atualizar,

    agora,
    cenario,
    trocarCenario,
  } = useCarteira();

  const primeiroNome = (account?.nome ?? '').split(' ')[0] || 'por aqui';

  /**
   * Recebendo ou pausado.
   *
   * A pausa é escolhida nas Configurações e precisa aparecer **aqui** — é a
   * tela que se abre todo dia. Sem isto, alguém pausa em janeiro, esquece, e em
   * março acha que o Canaã Resolve parou de mandar trabalho (§27 da Fase 05).
   */
  const recebendo = (profissional?.recebendo ?? true) && !preferencias.oportunidadesPausadas;

  const { esperando, anteriores } = useMemo(
    () => ({
      esperando: oportunidades.filter((o) => grupoDoEstado[o.estado] === 'atencao'),
      // A Home mostra memória curta: as últimas, não o arquivo. O arquivo é a
      // Central, e é para lá que "Ver todas" leva.
      anteriores: oportunidades.filter((o) => grupoDoEstado[o.estado] !== 'atencao').slice(0, 4),
    }),
    [oportunidades],
  );

  // Tocar aqui é navegar, não é ler. Quem marca a oportunidade como vista é a
  // tela de detalhe, e só ela.
  const abrirOportunidade = useCallback(
    (o: Oportunidade) => {
      router.push({ pathname: '/oportunidade/[id]', params: { id: o.id } });
    },
    [router],
  );

  return (
    <ScrollView
      style={styles.tela}
      contentContainerStyle={[
        styles.conteudo,
        { paddingTop: insets.top + space.lg, paddingBottom: insets.bottom + ESPACO_BARRA },
      ]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={atualizando}
          onRefresh={() => void atualizar()}
          tintColor={colors.brand}
          colors={[colors.brand]}
          progressBackgroundColor={colors.surface}
        />
      }
    >
      <Cabecalho
        saudacao={`${saudacao(agora.getHours())}, ${primeiroNome}`}
        profissional={profissional}
        recebendo={recebendo}
        carregando={situacao === 'carregando'}
        nomeCompleto={account?.nome ?? ''}
      />

      {situacao === 'carregando' ? <Esqueleto /> : null}

      {situacao === 'erro' && erro ? (
        <Falha
          mensagem={erro.message}
          detalhe={erro.detalhe}
          onTentar={() => void atualizar()}
        />
      ) : null}

      {situacao === 'pronto' ? (
        <>
          {pendencia ? (
            <Animated.View entering={FadeInDown.duration(motion.duration.slow)}>
              <Pendencia
                titulo={pendencia.titulo}
                explicacao={pendencia.explicacao}
                acao={pendencia.acao}
              />
            </Animated.View>
          ) : null}

          {esperando.length > 0 ? (
            <View style={styles.secao}>
              <SectionHeader titulo="Precisa da sua atenção" contagem={esperando.length} />
              {/* Só a primeira vira destaque: uma ação primária por tela. As
                  outras ficam logo abaixo, em linha, sem competir. */}
              <Animated.View entering={FadeInDown.duration(motion.duration.slow)}>
                <OportunidadeEmDestaque
                  oportunidade={esperando[0]}
                  onAbrir={abrirOportunidade}
                  agora={agora}
                />
              </Animated.View>
              {esperando.length > 1 ? (
                <View style={styles.outras}>
                  {esperando.slice(1).map((o, i) => (
                    <LinhaOportunidade
                      key={o.id}
                      oportunidade={o}
                      onAbrir={abrirOportunidade}
                      agora={agora}
                      primeira={i === 0}
                    />
                  ))}
                </View>
              ) : null}
            </View>
          ) : (
            <SemNovidade
              contaNova={contaNova}
              categorias={profissional?.categorias ?? []}
              recebendo={recebendo}
            />
          )}

          {anteriores.length > 0 ? (
            <View style={styles.secao}>
              <SectionHeader titulo="Suas últimas oportunidades" />
              <View>
                {anteriores.map((o, i) => (
                  <LinhaOportunidade
                    key={o.id}
                    oportunidade={o}
                    onAbrir={abrirOportunidade}
                    agora={agora}
                    primeira={i === 0}
                  />
                ))}
              </View>
              <Pressable
                // `navigate`, e não `push`: o destino é uma aba, e empilhar uma
                // aba sobre a outra desarruma o voltar.
                onPress={() => router.navigate('/oportunidades')}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Ver todas as oportunidades"
                style={({ pressed }) => [styles.verTodas, { opacity: pressed ? 0.6 : 1 }]}
              >
                <Text variant="label" tone="brand">
                  Ver todas
                </Text>
              </Pressable>
            </View>
          ) : null}
        </>
      ) : null}

      {__DEV__ ? <SeletorDeCenario cenario={cenario} onTrocar={trocarCenario} /> : null}
    </ScrollView>
  );
}

function Cabecalho({
  saudacao: texto,
  profissional,
  recebendo,
  carregando,
  nomeCompleto,
}: {
  saudacao: string;
  profissional: ResumoProfissional | null;
  /** Já combinado com a pausa escolhida nas Configurações. */
  recebendo: boolean;
  carregando: boolean;
  nomeCompleto: string;
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.cabecalho}>
      <View style={styles.cabecalhoTexto}>
        <Text variant="displayMD" numberOfLines={1} maxScale={1.25}>
          {texto}
        </Text>
        {carregando ? (
          <Skeleton width="72%" height={16} style={styles.cabecalhoEsqueleto} />
        ) : profissional ? (
          <View style={styles.estado}>
            <View
              style={[
                styles.estadoPonto,
                { backgroundColor: recebendo ? colors.brand : colors.faint },
              ]}
            />
            <Text variant="callout" tone="muted" numberOfLines={2} maxScale={1.25}>
              {recebendo
                ? `Recebendo oportunidades de ${listar(profissional.categorias)}`
                : 'Recebimento pausado'}
            </Text>
          </View>
        ) : null}
      </View>
      <Avatar nome={nomeCompleto || 'Canaã Resolve'} />
    </View>
  );
}

function listar(itens: string[]): string {
  if (itens.length <= 1) return itens[0]?.toLowerCase() ?? 'seus serviços';
  return `${itens.slice(0, -1).join(', ').toLowerCase()} e ${itens[itens.length - 1].toLowerCase()}`;
}

function SemNovidade({
  contaNova,
  categorias,
  recebendo,
}: {
  contaNova: boolean;
  categorias: string[];
  recebendo: boolean;
}) {
  const { colors } = useTheme();

  const titulo = contaNova
    ? 'Sua conta está pronta.'
    : recebendo
      ? 'Nenhuma oportunidade nova agora.'
      : 'Seu recebimento está pausado.';

  const texto = contaNova
    ? `Você já aparece para quem procura ${listar(categorias)} em Canaã dos Carajás. A primeira oportunidade chega aqui.`
    : recebendo
      ? 'Você continua disponível para receber solicitações compatíveis com o seu trabalho.'
      : 'Enquanto estiver pausado, novas oportunidades não chegam até você.';

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

/**
 * A pendência não tem destino ainda — a área de atendimento vive no Perfil, que
 * é outra fase. Ela informa; quando o Perfil existir, ganha o toque.
 */
function Pendencia({
  titulo,
  explicacao,
  acao,
}: {
  titulo: string;
  explicacao: string;
  acao: string;
}) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.pendencia,
        { backgroundColor: colors.accentSoft, borderColor: colors.accentLine },
      ]}
    >
      <Text variant="bodyStrong" tone="accent" maxScale={1.25}>
        {titulo}
      </Text>
      <Text variant="callout" tone="muted" maxScale={1.25}>
        {explicacao}
      </Text>
      <Text variant="caption" tone="faint" maxScale={1.2}>
        {`${acao} — junto com o Perfil, na próxima etapa.`}
      </Text>
    </View>
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
    <View style={[styles.falha, { borderColor: colors.line }]} accessibilityLiveRegion="polite">
      <AlertIcon size={20} color={colors.muted} />
      <Text variant="bodyStrong" center maxScale={1.25}>
        {mensagem}
      </Text>
      <Text variant="callout" tone="muted" center maxScale={1.25}>
        Isso costuma ser a conexão. O resto do aplicativo continua funcionando.
      </Text>
      {__DEV__ && detalhe ? (
        <Text variant="caption" tone="faint" center>
          {`Desenvolvimento — ${detalhe}`}
        </Text>
      ) : null}
      <Button label="Tentar de novo" variant="outline" onPress={onTentar} style={styles.falhaAcao} />
    </View>
  );
}

/** O esqueleto tem a forma do que vai chegar: um destaque e três linhas. */
function Esqueleto() {
  const { colors } = useTheme();

  return (
    <View style={styles.secao} accessibilityLabel="Carregando suas oportunidades">
      <Skeleton width={120} height={11} style={styles.esqueletoTitulo} />
      <View style={[styles.esqueletoCartao, { borderColor: colors.line }]}>
        <Skeleton width={96} height={20} />
        <Skeleton width="92%" height={18} />
        <Skeleton width="55%" height={18} />
        <Skeleton width="100%" height={48} style={styles.esqueletoBotao} />
      </View>
      <View style={styles.esqueletoLinhas}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={styles.esqueletoLinha}>
            <Skeleton width={8} height={8} />
            <View style={styles.esqueletoLinhaTexto}>
              <Skeleton width="70%" height={15} />
              <Skeleton width="45%" height={12} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

/**
 * Só em desenvolvimento: troca o conjunto de exemplos para conferir os estados
 * sem esperar a API existir. Ele vive na carteira, e não nesta tela, para que a
 * Central e o detalhe mudem junto. Não existe em produção.
 */
function SeletorDeCenario({
  cenario,
  onTrocar,
}: {
  cenario: Cenario;
  onTrocar: (proximo: Cenario) => void;
}) {
  const { colors } = useTheme();
  const proximo = cenarios[(cenarios.indexOf(cenario) + 1) % cenarios.length];

  return (
    <Pressable
      onPress={() => onTrocar(proximo)}
      accessibilityRole="button"
      accessibilityLabel="Trocar o cenário de exemplo"
      style={({ pressed }) => [
        styles.dev,
        { borderColor: colors.line, opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <Text variant="caption" tone="faint" center>
        {`Desenvolvimento · dados de exemplo: ${rotuloCenario[cenario]} · toque para ver "${rotuloCenario[proximo]}"`}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1 },
  conteudo: { paddingHorizontal: gutter, gap: space['3xl'] },
  cabecalho: { flexDirection: 'row', alignItems: 'flex-start', gap: space.lg },
  cabecalhoTexto: { flex: 1, gap: space.sm },
  cabecalhoEsqueleto: { marginTop: 2 },
  estado: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  estadoPonto: { width: 7, height: 7, borderRadius: 4, marginTop: 7 },
  secao: { gap: 0 },
  outras: { marginTop: space.lg },
  // Alvo de toque cheio: um link de texto ainda precisa de 48 de altura.
  verTodas: {
    alignSelf: 'flex-start',
    justifyContent: 'center',
    minHeight: hitTarget,
    paddingRight: space.md,
  },
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
  pendencia: {
    gap: space.sm,
    padding: space.xl,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  falha: {
    alignItems: 'center',
    gap: space.md,
    padding: space.xl,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
  },
  falhaAcao: { alignSelf: 'stretch', marginTop: space.xs },
  esqueletoTitulo: { marginBottom: space.md },
  esqueletoCartao: {
    gap: space.md,
    padding: space.xl,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
  },
  esqueletoBotao: { marginTop: space.xs },
  esqueletoLinhas: { marginTop: space['2xl'], gap: space.xl },
  esqueletoLinha: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  esqueletoLinhaTexto: { flex: 1, gap: space.sm },
  dev: {
    padding: space.md,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
  },
});
