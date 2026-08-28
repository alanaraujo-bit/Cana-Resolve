import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ESPACO_BARRA } from '@/navigation/BarraPrincipal';
import { registrar } from '@/perfil/analytics';
import { resumoDeCompletude } from '@/perfil/completude';
import { Bloco, LinhaDeSecao, Nota, Retrato } from '@/perfil/componentes';
import { usePerfil } from '@/perfil/PerfilProvider';
import { rotuloDaCategoria } from '@/perfil/catalogo';
import {
  atendimentoLegivel,
  horarioLegivel,
  rotuloVerificacao,
  telefoneLegivel,
} from '@/perfil/tipos';
import { useSession } from '@/session/SessionProvider';
import { gutter, radius, space, useTheme } from '@/theme';
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
  const { account, signOut } = useSession();
  const { situacao, perfil, erro, atualizando, completude, somenteLocal, atualizar } = usePerfil();

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

      {(perfil.parceiroFundador || perfil.verificacao.estado === 'verificado') && (
        <View style={estilos.selos}>
          {perfil.parceiroFundador ? <Pill tone="destaque">Parceiro fundador</Pill> : null}
          {perfil.verificacao.estado === 'verificado' ? (
            <Pill tone="marca">{rotuloVerificacao.verificado}</Pill>
          ) : null}
        </View>
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

      {/* A conta — o que é de login, e não de vitrine. */}
      <View style={estilos.conta}>
        <Text variant="overline" tone="faint" accessibilityRole="header">
          CONTA
        </Text>
        <Text variant="callout" tone="muted" maxScale={1.25}>
          {account?.nome ? `Você entrou como ${account.nome}.` : 'Sessão ativa.'}
        </Text>
        <Button label="Sair da conta" variant="outline" onPress={signOut} haptic="commit" />
      </View>

      {__DEV__ ? <TrocaDeCenario /> : null}
    </ScrollView>
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
  const { colors } = useTheme();

  const proximos: Record<string, string> = {
    autonomo: 'empresa',
    empresa: 'extremos',
    extremos: 'novo',
    novo: 'erro',
    erro: 'autonomo',
  };

  return (
    <View style={[estilos.dev, { borderColor: colors.line }]}>
      <Text variant="caption" tone="faint" maxScale={1.1}>
        Desenvolvimento · exemplo “{cenario}”
      </Text>
      <Button
        label="Trocar exemplo"
        variant="quiet"
        onPress={() => void trocarCenario(proximos[cenario] as never)}
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

  selos: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: -space.sm },

  completude: {
    gap: space.sm,
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  trilho: { height: 4, borderRadius: 2, overflow: 'hidden', marginTop: space.xs },
  trilhoCheio: { height: 4, borderRadius: 2 },

  conta: { gap: space.md, marginTop: space.sm },

  dev: {
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
  },
});
