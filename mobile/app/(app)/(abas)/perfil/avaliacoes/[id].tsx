import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ESPACO_BARRA } from '@/navigation/BarraPrincipal';
import { registrar } from '@/reputacao/analytics';
import { Estrelas } from '@/reputacao/componentes';
import { FolhaDeDenuncia, FolhaDeResposta } from '@/reputacao/acoes';
import { useReputacao } from '@/reputacao/ReputacaoProvider';
import {
  dataCompleta,
  explicacaoModeracao,
  notaAcessivel,
  podeDenunciar,
  podeResponder,
  rotuloMotivoDeDenuncia,
} from '@/reputacao/tipos';
import { gutter, radius, space, useTheme } from '@/theme';
import { Button, CabecalhoDeTela, Nota, Pill, Skeleton, Text } from '@/ui';

/**
 * Uma avaliação, inteira.
 *
 * **É o destino de um deep link** (`canaaresolve://avaliacao/:id`), e é por
 * isso que ela mora dentro da pilha do Perfil e não numa rota de topo: o
 * provedor de reputação vive no `_layout` dessa pilha, e uma tela aberta fora
 * dele estouraria — justamente no caso mais provável, um push tocado com o
 * aplicativo frio.
 *
 * O que ela mostra que a lista não mostra: o comentário **inteiro**, sem
 * truncar (§97), a resposta inteira (§98), e as duas ações que o profissional
 * tem sobre uma avaliação — responder e contestar.
 *
 * O que ela **não** oferece, e não é por falta de espaço: apagar a avaliação,
 * mudar a nota, editar o que o cliente escreveu (§17, §128). Uma avaliação
 * negativa legítima faz parte da reputação, e um profissional que pudesse
 * removê-la teria controle direto sobre a própria — que é o contrário de
 * reputação.
 */
export default function DetalheDaAvaliacao() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { situacao, porId, marcarVista, somenteLocal } = useReputacao();

  const [respondendo, setRespondendo] = useState(false);
  const [denunciando, setDenunciando] = useState(false);

  const avaliacao = useMemo(() => (id ? porId(id) : null), [id, porId]);

  // Marcar como vista é do detalhe, e só do detalhe: a lista mostrar o cartão
  // não é a pessoa ter lido a avaliação. É a mesma correção que a Fase 03 fez
  // quando "Você abriu" entrava duas vezes no histórico da oportunidade.
  useEffect(() => {
    if (avaliacao && !avaliacao.vista) marcarVista(avaliacao.id);
  }, [avaliacao, marcarVista]);

  const respiro = {
    paddingTop: insets.top + space.sm,
    paddingBottom: insets.bottom + ESPACO_BARRA,
  };

  if (situacao === 'carregando') {
    return (
      <View style={estilos.tela}>
        <View style={{ paddingTop: insets.top + space.sm }}>
          <CabecalhoDeTela titulo="Avaliação" aoVoltar={() => router.back()} />
        </View>
        <View style={estilos.conteudo}>
          <Skeleton width={120} height={18} />
          <Skeleton width="100%" height={90} style={{ borderRadius: radius.lg }} />
        </View>
      </View>
    );
  }

  if (!avaliacao) {
    // Um id que não existe e um id que não é seu chegam aqui do mesmo jeito, e
    // é assim que deve ser: conhecer o id de uma avaliação não é autorização
    // para lê-la, e a tela não confirma nem desmente que ela existe.
    return (
      <View style={estilos.tela}>
        <View style={{ paddingTop: insets.top + space.sm }}>
          <CabecalhoDeTela titulo="Avaliação" aoVoltar={() => router.back()} />
        </View>
        <View style={[estilos.centro, { paddingBottom: insets.bottom + ESPACO_BARRA }]}>
          <Text variant="title" center maxScale={1.25}>
            Esta avaliação não está mais disponível.
          </Text>
          <Text variant="callout" tone="muted" center maxScale={1.25}>
            Ela pode ter sido removida, ou o endereço pode estar errado.
          </Text>
          <Button
            label="Ver todas as avaliações"
            variant="outline"
            onPress={() => router.replace('/perfil/avaliacoes')}
          />
        </View>
      </View>
    );
  }

  const a = avaliacao;
  const notaDeModeracao = explicacaoModeracao[a.estado];

  return (
    <View style={estilos.tela}>
      <View style={{ paddingTop: respiro.paddingTop }}>
        <CabecalhoDeTela titulo="Avaliação" aoVoltar={() => router.back()} />
      </View>

      <ScrollView
        contentContainerStyle={[estilos.conteudo, { paddingBottom: respiro.paddingBottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* A nota abre a tela, com a data e o serviço logo abaixo — o contexto
            mínimo que o §41 pede, sem o relato privado da oportunidade. */}
        <View style={estilos.cabecalho}>
          <View accessible accessibilityLabel={notaAcessivel(a.nota)}>
            <Estrelas nota={a.nota} tamanho={22} />
          </View>
          <Text variant="caption" tone="muted" maxScale={1.25}>
            {a.categoria} · {dataCompleta(a.em)}
            {a.editadaEm ? ' · editada pelo cliente' : ''}
          </Text>
        </View>

        {notaDeModeracao ? (
          <View style={estilos.moderacao}>
            <Pill tone="destaque">
              {a.estado === 'removida' ? 'Removida' : a.estado === 'oculta' ? 'Oculta' : 'Em análise'}
            </Pill>
            <Text variant="callout" tone="muted" maxScale={1.3}>
              {notaDeModeracao}
            </Text>
          </View>
        ) : null}

        {/* O texto inteiro. Nunca truncado aqui (§97). */}
        {a.comentario ? (
          <View
            style={[estilos.corpo, { backgroundColor: colors.surface, borderColor: colors.line }]}
          >
            <Text variant="body" maxScale={1.4}>
              {a.comentario}
            </Text>
            <Text variant="caption" tone="faint" maxScale={1.2}>
              {a.autor}
            </Text>
          </View>
        ) : (
          <View
            style={[estilos.corpo, { backgroundColor: colors.surface, borderColor: colors.line }]}
          >
            <Text variant="callout" tone="muted" maxScale={1.3}>
              O cliente avaliou sem deixar comentário. A nota já é a avaliação dele.
            </Text>
          </View>
        )}

        {/* A resposta, com a autoria explícita: quem lê precisa saber, sem
            pensar, quem escreveu cada bloco (§136). */}
        {a.resposta ? (
          <View style={[estilos.respostaCaixa, { borderLeftColor: colors.brandLine }]}>
            <Text variant="caption" tone="brand" maxScale={1.2}>
              Sua resposta
            </Text>
            <Text variant="body" maxScale={1.4}>
              {a.resposta.texto}
            </Text>
            <Text variant="caption" tone="faint" maxScale={1.2}>
              {dataCompleta(a.resposta.editadaEm ?? a.resposta.em)}
            </Text>
            <View style={estilos.acoesResposta}>
              <Button label="Editar resposta" variant="quiet" onPress={() => setRespondendo(true)} />
            </View>
          </View>
        ) : null}

        {a.denuncia ? (
          <Nota>
            {/* O motivo entra entre aspas, e não emendado na frase: os rótulos
                são orações ("Não corresponde a um serviço meu"), e costurá-los
                depois de "por" produzia "por não corresponde a um serviço meu".
                Citar preserva o texto exato que a pessoa escolheu e não exige
                que todo rótulo futuro caiba numa regência. */}
            Você contestou esta avaliação em {dataCompleta(a.denuncia.em)} —{' '}
            {`“${rotuloMotivoDeDenuncia[a.denuncia.motivo]}”`}. Uma pessoa do Canaã Resolve está
            analisando. Avisamos quando houver decisão.
          </Nota>
        ) : null}

        <View style={estilos.acoes}>
          {podeResponder(a) ? (
            <Button
              label="Responder"
              onPress={() => {
                registrar({ nome: 'resposta_iniciada', avaliacaoId: a.id });
                setRespondendo(true);
              }}
              haptic="step"
            />
          ) : null}

          {/* Discreto de propósito (§126): contestar não é a ação normal de
              uma avaliação, e um botão vermelho em cada cartão convidaria a
              denunciar toda nota baixa. */}
          {podeDenunciar(a) ? (
            <Button
              label="Contestar esta avaliação"
              variant="quiet"
              onPress={() => setDenunciando(true)}
            />
          ) : null}
        </View>

        {somenteLocal ? (
          <Nota tom="destaque">
            Esta avaliação é um exemplo de desenvolvimento. O que você escrever aqui fica neste
            aparelho e não chega a ninguém.
          </Nota>
        ) : null}
      </ScrollView>

      <FolhaDeResposta
        aberta={respondendo}
        avaliacao={a}
        onFechar={() => setRespondendo(false)}
      />
      <FolhaDeDenuncia
        aberta={denunciando}
        avaliacao={a}
        onFechar={() => setDenunciando(false)}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1 },
  conteudo: { paddingHorizontal: gutter, paddingTop: space.lg, gap: space.lg },
  centro: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: space.lg,
    paddingHorizontal: gutter,
  },

  cabecalho: { gap: space.xs },

  moderacao: { gap: space.sm },

  corpo: {
    gap: space.sm,
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },

  respostaCaixa: { gap: space.xs, paddingLeft: space.lg, borderLeftWidth: 2 },
  acoesResposta: { marginTop: space.xs, alignItems: 'flex-start' },

  acoes: { gap: space.sm },
});
