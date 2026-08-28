import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ROTA_DE_AJUSTES } from '@/ajustes/rota';
import { ESPACO_BARRA } from '@/navigation/BarraPrincipal';
import { registrar } from '@/perfil/analytics';
import { resumoDeCompletude } from '@/perfil/completude';
import { Bloco, LinhaDeSecao, Nota, Retrato } from '@/perfil/componentes';
import { usePerfil } from '@/perfil/PerfilProvider';
import { rotuloDaCategoria } from '@/perfil/catalogo';
import {
  atendimentoLegivel,
  horarioLegivel,
  telefoneLegivel,
} from '@/perfil/tipos';
import { registrar as registrarReputacao } from '@/reputacao/analytics';
import { CartaoDeAvaliacao, PontoNovo, ResumoDeNota, SemAvaliacoes } from '@/reputacao/componentes';
import { OQueFoiVerificado } from '@/reputacao/explicacoes';
import { useReputacao } from '@/reputacao/ReputacaoProvider';
import { fraseDeVolume } from '@/reputacao/tipos';
import { FUNDADOR_ROTULO, seloAcessivel, seloDeVerificacao } from '@/reputacao/verificacao';
import { useSession } from '@/session/SessionProvider';
import { gutter, hitTarget, radius, space, useTheme } from '@/theme';
import { Button, Pill, Skeleton, Text } from '@/ui';

/**
 * A capa do Perfil.
 *
 * Ela responde três coisas, nesta ordem: **como eu apareço**, **o que falta**
 * e **onde mexo**. Por isso o retrato e o nome vêm primeiro — o parceiro
 * precisa se reconhecer antes de editar qualquer coisa —, o que falta vem em
 * seguida, com a consequência escrita, e só então as seções.
 *
 * Não há painel, não há métrica e não há "70% completo". Um perfil pela metade
 * não é uma nota baixa: é uma frase dizendo o que muda quando estiver cheio.
 */
export default function CapaDoPerfil() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { account } = useSession();
  const { situacao, perfil, erro, atualizando, completude, somenteLocal, atualizar } = usePerfil();
  const [explicandoSelo, setExplicandoSelo] = useState(false);

  useEffect(() => {
    registrar({ nome: 'perfil_aberto' });
  }, []);

  const respiro = {
    paddingTop: insets.top + space.lg,
    paddingBottom: insets.bottom + ESPACO_BARRA,
  };

  if (situacao === 'carregando') {
    return <Carregando respiro={respiro} />;
  }

  if (situacao === 'erro' || !perfil || !completude) {
    return (
      <View style={[estilos.tela, estilos.centro, respiro]}>
        <Text variant="title" center maxScale={1.25}>
          {erro?.message ?? 'Não foi possível carregar seu perfil agora.'}
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
    );
  }

  const resumo = resumoDeCompletude(completude);
  const categoria = rotuloDaCategoria(perfil.categoriaId);
  const oficio = perfil.oficio.trim() || categoria;

  const servicosResumo =
    perfil.servicos.length === 0
      ? 'Nenhum serviço escolhido'
      : perfil.servicos.length <= 3
        ? perfil.servicos.map((s) => s.rotulo).join(' · ')
        : `${perfil.servicos[0]!.rotulo} e mais ${perfil.servicos.length - 1}`;

  const contatoResumo = perfil.contatos.whatsapp
    ? `WhatsApp ${telefoneLegivel(perfil.contatos.whatsapp)}`
    : 'Nenhum contato informado';

  const fotosResumo =
    perfil.portfolio.length === 0
      ? 'Nenhuma foto ainda'
      : perfil.portfolio.length === 1
        ? '1 foto'
        : `${perfil.portfolio.length} fotos`;

  const selo = seloDeVerificacao(perfil.verificacao.itens);

  /** A seção do item que falta, para a linha dizer o que falta ali. */
  const faltaEm = (secao: string) =>
    completude.pendentes.find((p) => p.secao === secao && p.essencial)?.titulo ?? null;

  return (
    <ScrollView
      style={estilos.tela}
      contentContainerStyle={[estilos.conteudo, respiro]}
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
      <Text variant="displayMD" maxScale={1.2}>
        Perfil
      </Text>

      {/* Quem eu sou — a mesma composição que o morador vê na prévia. */}
      <View style={estilos.identidade}>
        <Retrato nome={perfil.nome} imagem={perfil.imagem} tipo={perfil.tipo} tamanho={72} />
        <View style={estilos.identidadeTexto}>
          <Text variant="title" numberOfLines={2} maxScale={1.25}>
            {perfil.nome || 'Sem nome ainda'}
          </Text>
          <Text variant="callout" tone="muted" numberOfLines={2} maxScale={1.25}>
            {oficio}
          </Text>
        </View>
      </View>

      {/* Os selos, e a explicação a um toque (§31).
          São dois no máximo — Fundador e verificação —, e a verificação é
          **uma** etiqueta mesmo quando três coisas foram conferidas: três
          selos lado a lado viram a coleção de emblemas que o §33 proíbe, e
          fazem quem tem dois parecer inferior a quem tem três. */}
      {(perfil.parceiroFundador || selo !== null) && (
        <Pressable
          onPress={() => {
            registrarReputacao({ nome: 'verificacao_explicada' });
            setExplicandoSelo(true);
          }}
          accessibilityRole="button"
          accessibilityLabel={
            [perfil.parceiroFundador ? FUNDADOR_ROTULO : null, seloAcessivel(perfil.verificacao.itens)]
              .filter(Boolean)
              .join('. ') || 'Selos do perfil'
          }
          accessibilityHint="Explica o que cada selo significa"
          hitSlop={8}
          style={estilos.selos}
        >
          {perfil.parceiroFundador ? <Pill tone="destaque">{FUNDADOR_ROTULO}</Pill> : null}
          {selo ? <Pill tone="marca">{selo}</Pill> : null}
          <Text variant="caption" tone="faint" maxScale={1.2}>
            O que isso quer dizer?
          </Text>
        </Pressable>
      )}

      <Button
        label="Ver como meu perfil aparece"
        variant="outline"
        onPress={() => {
          registrar({ nome: 'previa_aberta' });
          router.push('/perfil/previa');
        }}
        accessibilityHint="Mostra seu perfil como o morador vê"
      />

      {/* O que falta — com a consequência, nunca com uma nota. */}
      {completude.pendentes.length > 0 ? (
        <View style={[estilos.completude, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Text variant="bodyStrong" maxScale={1.25}>
            {resumo.titulo}
          </Text>
          <Text variant="callout" tone="muted" maxScale={1.25}>
            {resumo.texto}
          </Text>
          <Traco fracao={completude.fracao} />
        </View>
      ) : null}

      <Bloco>
        <LinhaDeSecao
          primeira
          titulo="Informações principais"
          resumo={`${perfil.tipo === 'empresa' ? 'Empresa' : 'Profissional'} · ${categoria}`}
          falta={faltaEm('identidade')}
          onPress={() => router.push('/perfil/identidade')}
        />
        <LinhaDeSecao
          titulo="O que você faz"
          resumo={servicosResumo}
          falta={faltaEm('servicos')}
          onPress={() => router.push('/perfil/servicos')}
        />
        <LinhaDeSecao
          titulo="Onde você atende"
          resumo={atendimentoLegivel(perfil.atendimento)}
          falta={faltaEm('atendimento')}
          onPress={() => router.push('/perfil/atendimento')}
        />
        <LinhaDeSecao
          titulo="Contato"
          resumo={contatoResumo}
          falta={faltaEm('contato')}
          onPress={() => router.push('/perfil/contato')}
        />
        <LinhaDeSecao
          titulo="Horário de atendimento"
          resumo={horarioLegivel(perfil.disponibilidade)}
          onPress={() => router.push('/perfil/horario')}
        />
        <LinhaDeSecao
          ultima
          titulo="Fotos de trabalhos"
          resumo={fotosResumo}
          onPress={() => router.push('/perfil/portfolio')}
        />
      </Bloco>

      {/* A reputação (Fase 07).
          Ela entra como mais uma camada do perfil, e não como o assunto dele:
          a oportunidade continua sendo o núcleo do aplicativo (§35). Por isso
          este bloco vem **depois** das seções de edição, e não acima delas —
          um cartão gigante de estrela no topo diria que o produto é sobre a
          nota, e ele não é. */}
      <BlocoDeReputacao
        onVerTodas={() => router.push('/perfil/avaliacoes')}
        onAbrir={(id) => router.push({ pathname: '/perfil/avaliacoes/[id]', params: { id } })}
      />

      {/* Confiança — o estado, e a verdade sobre o que ainda não existe. */}
      {perfil.verificacao.estado !== 'verificado' ? (
        <Nota>
          {perfil.verificacao.estado === 'em-analise'
            ? 'Sua verificação está em análise. Avisamos assim que houver resposta.'
            : 'A verificação de parceiro ainda não está aberta. Quando estiver, você poderá enviar seus documentos por aqui.'}
        </Nota>
      ) : null}

      {somenteLocal ? (
        <Nota tom="destaque">
          Este perfil está salvo apenas neste aparelho. A publicação para os moradores depende do
          servidor, que ainda não está ligado.
        </Nota>
      ) : null}

      {/* A porta da Conta.
          Uma linha, e não um bloco de sessão com botão de sair: conta,
          segurança, preferências, privacidade e ajuda passaram a viver juntas
          em Configurações, fora desta aba. O Perfil é o que o morador vê; a
          Conta é como você entra — e as duas não se misturam. */}
      <Bloco>
        <LinhaDeSecao
          primeira
          ultima
          titulo="Configurações"
          resumo={account?.email ?? 'Conta, preferências, privacidade e ajuda'}
          onPress={() => router.push(ROTA_DE_AJUSTES)}
        />
      </Bloco>

      {__DEV__ ? <TrocaDeCenario /> : null}

      <OQueFoiVerificado
        aberta={explicandoSelo}
        onFechar={() => setExplicandoSelo(false)}
        itens={perfil.verificacao.itens}
        fundador={perfil.parceiroFundador}
      />
    </ScrollView>
  );
}

/**
 * A reputação, na capa do Perfil (§35, §36, §38).
 *
 * **Carrega e falha sozinho** (§104, §105). É a razão de ser um componente
 * separado com o próprio `useReputacao`: enquanto as avaliações chegam, o
 * Perfil inteiro já está utilizável; se elas não chegarem, aparece uma linha
 * discreta com "tentar de novo" e o resto da tela continua funcionando. O
 * contrário — um `situacao === 'carregando'` no topo do Perfil por causa das
 * avaliações — bloquearia a edição do telefone por causa de uma lista de
 * comentários.
 *
 * Mostra **duas** avaliações e um "Ver todas" (§38). Não vinte: o resumo é
 * resumo, e a lista completa tem tela própria.
 */
function BlocoDeReputacao({
  onVerTodas,
  onAbrir,
}: {
  onVerTodas: () => void;
  onAbrir: (id: string) => void;
}) {
  const { colors } = useTheme();
  const { situacao, avaliacoes, resumo, naoVistas, erro, atualizar } = useReputacao();

  const recentes = avaliacoes.slice(0, 2);

  return (
    <View style={estilos.reputacao}>
      <View style={estilos.reputacaoTitulo}>
        <Text variant="overline" tone="faint" accessibilityRole="header">
          AVALIAÇÕES
        </Text>
        {/* O ponto de "chegou algo novo" (§77). Discreto, sem número, e
            deliberadamente **fora** do selo da aba: aquele conta oportunidades
            esperando decisão, e continua contando só isso (§76). */}
        {naoVistas > 0 ? <PontoNovo /> : null}
      </View>

      {situacao === 'carregando' ? (
        <View style={[estilos.reputacaoCaixa, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Skeleton width="55%" height={20} />
          <Skeleton width="80%" height={14} />
        </View>
      ) : situacao === 'erro' ? (
        // §105 — a falha das avaliações não quebra o Perfil. Uma frase e um
        // retry discreto, e as seis seções acima continuam inteiras.
        <View style={[estilos.reputacaoCaixa, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Text variant="callout" tone="muted" maxScale={1.3}>
            {erro?.message ?? 'Não foi possível carregar as avaliações agora.'}
          </Text>
          <Button label="Tentar de novo" variant="quiet" onPress={() => void atualizar()} />
        </View>
      ) : (
        <>
          <View style={[estilos.reputacaoCaixa, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            {resumo.total === 0 ? <SemAvaliacoes /> : <ResumoDeNota resumo={resumo} />}
            <Text variant="caption" tone="muted" maxScale={1.3}>
              {fraseDeVolume(resumo)}
            </Text>
          </View>

          {recentes.length > 0 ? (
            <>
              <Bloco>
                {recentes.map((a, i) => (
                  <CartaoDeAvaliacao
                    key={a.id}
                    avaliacao={a}
                    onPress={() => onAbrir(a.id)}
                    primeira={i === 0}
                    ultima={i === recentes.length - 1}
                  />
                ))}
              </Bloco>
              <Button label="Ver todas" variant="outline" onPress={onVerTodas} />
            </>
          ) : null}
        </>
      )}
    </View>
  );
}

/** Traço de progresso. Discreto, sem número: ele indica, não avalia. */
function Traco({ fracao }: { fracao: number }) {
  const { colors } = useTheme();
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="O quanto do seu perfil está preenchido"
      style={[estilos.trilho, { backgroundColor: colors.surface3 }]}
    >
      <View
        style={[
          estilos.trilhoCheio,
          { width: `${Math.round(fracao * 100)}%`, backgroundColor: colors.brandFill },
        ]}
      />
    </View>
  );
}

/** O esqueleto segue a forma real da tela — não é um retângulo genérico. */
function Carregando({ respiro }: { respiro: { paddingTop: number; paddingBottom: number } }) {
  return (
    <View style={[estilos.tela, estilos.conteudo, respiro]}>
      <Skeleton width={120} height={30} />
      <View style={estilos.identidade}>
        <Skeleton width={72} height={72} style={{ borderRadius: 36 }} />
        <View style={estilos.identidadeTexto}>
          <Skeleton width="70%" height={20} />
          <Skeleton width="45%" height={14} />
        </View>
      </View>
      <Skeleton width="100%" height={54} style={{ borderRadius: radius.pill }} />
      <Skeleton width="100%" height={300} style={{ borderRadius: radius.lg }} />
    </View>
  );
}

/** Só em desenvolvimento: troca o conjunto de exemplos. */
function TrocaDeCenario() {
  const { cenario, trocarCenario } = usePerfil();
  const reputacao = useReputacao();
  const { colors } = useTheme();

  const proximos: Record<string, string> = {
    autonomo: 'empresa',
    empresa: 'extremos',
    extremos: 'novo',
    novo: 'erro',
    erro: 'autonomo',
  };

  /**
   * A reputação tem o próprio ciclo, e não o do perfil.
   *
   * São dois eixos independentes de propósito: o estado mais importante desta
   * fase — um perfil **completo** e **verificado** com **zero** avaliações — só
   * existe se der para combinar "empresa completa" com "sem avaliações". Um
   * seletor só, encadeando os dois, nunca produziria essa combinação, que é
   * justamente a que o §28 manda olhar com atenção.
   */
  const proximaReputacao: Record<string, string> = {
    'sem-avaliacoes': 'poucas',
    poucas: 'consistente',
    consistente: 'negativa',
    negativa: 'denunciada',
    denunciada: 'erro',
    erro: 'sem-avaliacoes',
  };

  return (
    <View style={[estilos.dev, { borderColor: colors.line }]}>
      <Text variant="caption" tone="faint" maxScale={1.1}>
        Desenvolvimento · perfil “{cenario}” · avaliações “{reputacao.cenario}”
      </Text>
      <Button
        label="Trocar exemplo"
        variant="quiet"
        onPress={() => void trocarCenario(proximos[cenario] as never)}
      />
      <Button
        label="Trocar exemplo de avaliações"
        variant="quiet"
        onPress={() => void reputacao.trocarCenario(proximaReputacao[reputacao.cenario] as never)}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1 },
  conteudo: { paddingHorizontal: gutter, gap: space.xl },
  centro: { justifyContent: 'center', alignItems: 'center', gap: space.lg },

  identidade: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  identidadeTexto: { flex: 1, gap: 2 },

  selos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: space.sm,
    marginTop: -space.sm,
    minHeight: hitTarget - 12,
  },

  reputacao: { gap: space.md },
  reputacaoTitulo: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  reputacaoCaixa: {
    gap: space.sm,
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },

  completude: {
    gap: space.sm,
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  trilho: { height: 4, borderRadius: 2, overflow: 'hidden', marginTop: space.xs },
  trilhoCheio: { height: 4, borderRadius: 2 },

  dev: {
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
  },
});
