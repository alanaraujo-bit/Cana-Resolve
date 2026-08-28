import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ESPACO_BARRA } from '@/navigation/BarraPrincipal';
import { rotuloDaCategoria } from '@/perfil/catalogo';
import { CabecalhoDeTela, Nota, Retrato } from '@/perfil/componentes';
import { usePerfil } from '@/perfil/PerfilProvider';
import { atendimentoLegivel, horarioLegivel } from '@/perfil/tipos';
import { CartaoDeAvaliacao, ResumoDeNota, SemAvaliacoes } from '@/reputacao/componentes';
import { ComoFuncionam } from '@/reputacao/explicacoes';
import { useReputacao } from '@/reputacao/ReputacaoProvider';
import { fraseDeVolume, visivelPublicamente } from '@/reputacao/tipos';
import { FUNDADOR_ROTULO, seloDeVerificacao } from '@/reputacao/verificacao';
import { gutter, hitTarget, radius, space, useTheme } from '@/theme';
import { Pill, Text } from '@/ui';

/**
 * Como o perfil aparece para o morador.
 *
 * Esta tela lê **o mesmo objeto** que a edição escreve. Não há cópia, não há
 * dado de exemplo e não há "aproximadamente assim": o que se vê aqui é o que
 * existe. Uma prévia que mente é pior do que não ter prévia.
 *
 * Ela também é o desenho de referência do perfil público. Se um dia existir
 * página na web, ela nasce desta composição — não de outra inventada lá.
 *
 * O que **não** aparece aqui é tão importante quanto o que aparece: o nome do
 * responsável pela empresa, o e-mail da conta e o telefone. O número não é
 * segredo, mas ele é entregue no momento certo — quando o parceiro diz que
 * consegue atender uma oportunidade —, e não fica exposto num perfil.
 *
 * **A Fase 07 acrescentou a reputação, e com ela a regra mais dura desta tela
 * (§64):** o que aparece aqui é o que existe. Sem avaliações, esta prévia
 * mostra "ainda sem avaliações" — não uma média de exemplo, não estrelas
 * cinzentas, não um espaço reservado bonitinho. Uma prévia que preenche para
 * ficar bonita é a forma mais barata de a plataforma inteira perder
 * credibilidade, porque é o parceiro que descobre a mentira primeiro.
 *
 * E ela mostra **só o que é público** (§40): avaliações em análise ou removidas
 * não aparecem, porque não é isso que o morador veria.
 */
export default function Previa() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { perfil } = usePerfil();
  const { situacao, avaliacoes, resumo } = useReputacao();
  const [explicando, setExplicando] = useState(false);

  if (!perfil) return null;

  const selo = seloDeVerificacao(perfil.verificacao.itens);
  // Só o que o morador veria de verdade: `em-analise` é conversa entre o
  // Canaã Resolve e o parceiro, e não faz parte do perfil público.
  const publicas = avaliacoes.filter((a) => visivelPublicamente(a.estado)).slice(0, 3);

  const categoria = rotuloDaCategoria(perfil.categoriaId);
  const oficio = perfil.oficio.trim() || categoria;

  return (
    <View style={estilos.tela}>
      <View style={{ paddingTop: insets.top + space.sm }}>
        <CabecalhoDeTela titulo="Como você aparece" aoVoltar={() => router.back()} />
      </View>

      <ScrollView
        contentContainerStyle={[
          estilos.conteudo,
          { paddingBottom: insets.bottom + ESPACO_BARRA },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* A capa: rosto, nome, ofício. Nada de banner nem capa decorativa. */}
        <View style={estilos.capa}>
          <Retrato nome={perfil.nome} imagem={perfil.imagem} tipo={perfil.tipo} tamanho={96} />
          <Text variant="displayMD" center maxScale={1.2}>
            {perfil.nome || 'Sem nome ainda'}
          </Text>
          <Text variant="callout" tone="muted" center maxScale={1.25}>
            {oficio}
          </Text>

          {perfil.parceiroFundador || selo ? (
            <View style={estilos.selos}>
              {selo ? <Pill tone="marca">{selo}</Pill> : null}
              {perfil.parceiroFundador ? <Pill tone="destaque">{FUNDADOR_ROTULO}</Pill> : null}
            </View>
          ) : null}

          {/* A reputação, na altura em que o morador a procuraria: logo abaixo
              do nome, antes de ler o que a pessoa faz. Sem avaliação, o estado
              honesto — e o perfil continua tendo o que mostrar. */}
          {situacao !== 'carregando' ? (
            <View style={estilos.reputacaoCapa}>
              {resumo.total === 0 ? (
                <Text variant="caption" tone="muted" center maxScale={1.3}>
                  Ainda sem avaliações no Canaã Resolve.
                </Text>
              ) : (
                <ResumoDeNota resumo={resumo} />
              )}
            </View>
          ) : null}
        </View>

        {perfil.descricao.trim() ? (
          <Text variant="body" maxScale={1.3} style={estilos.descricao}>
            {perfil.descricao.trim()}
          </Text>
        ) : null}

        {perfil.servicos.length > 0 ? (
          <Secao titulo="O que faz">
            <View style={estilos.lista}>
              {perfil.servicos.map((s) => (
                <View key={s.id} style={estilos.linhaServico}>
                  <View style={[estilos.ponto, { backgroundColor: colors.brand }]} />
                  <Text variant="callout" maxScale={1.3} style={estilos.servicoTexto}>
                    {s.rotulo}
                  </Text>
                </View>
              ))}
            </View>
          </Secao>
        ) : null}

        <Secao titulo="Onde atende">
          <Text variant="callout" maxScale={1.3}>
            {atendimentoLegivel(perfil.atendimento)}
          </Text>
          <Text variant="caption" tone="faint" maxScale={1.2}>
            {perfil.atendimento.cidade}
          </Text>
        </Secao>

        <Secao titulo="Horário">
          <Text variant="callout" maxScale={1.3}>
            {horarioLegivel(perfil.disponibilidade)}
          </Text>
        </Secao>

        {perfil.portfolio.length > 0 ? (
          <Secao titulo="Trabalhos">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={estilos.galeria}
            >
              {perfil.portfolio.map((f) => (
                <View key={f.id} style={estilos.cartaoFoto}>
                  <Image
                    source={{ uri: f.imagem.uri }}
                    style={[estilos.fotoGaleria, { backgroundColor: colors.surface3 }]}
                    resizeMode="cover"
                    accessibilityLabel={f.legenda ?? 'Trabalho realizado'}
                  />
                  {f.legenda ? (
                    <Text variant="caption" tone="muted" numberOfLines={2} maxScale={1.2}>
                      {f.legenda}
                    </Text>
                  ) : null}
                </View>
              ))}
            </ScrollView>
          </Secao>
        ) : null}

        {/* As avaliações, como o morador as veria (§65).
            Poucas e legíveis. Cada uma sem nome, sem foto e sem link para
            perfil nenhum — não é rede social, e o cliente que avaliou não
            virou personagem público por ter avaliado (§40). */}
        <Secao titulo="O que os clientes disseram">
          {publicas.length === 0 ? (
            <SemAvaliacoes compacto />
          ) : (
            <>
              <View style={[estilos.avaliacoes, { borderColor: colors.line }]}>
                {publicas.map((a) => (
                  <CartaoDeAvaliacao key={a.id} avaliacao={a} publico />
                ))}
              </View>
              <Text variant="caption" tone="faint" maxScale={1.3}>
                {fraseDeVolume(resumo)}
              </Text>
              <Pressable
                onPress={() => setExplicando(true)}
                accessibilityRole="button"
                accessibilityLabel="Como funcionam as avaliações"
                hitSlop={10}
                style={estilos.comoFunciona}
              >
                <Text variant="caption" tone="brand" maxScale={1.25}>
                  Como funcionam as avaliações
                </Text>
              </Pressable>
            </>
          )}
        </Secao>

        {/* Contato: o morador vê que existe, e o canal. O número em si só
            aparece quando o parceiro assume a oportunidade. */}
        <Secao titulo="Contato">
          <Text variant="callout" maxScale={1.3}>
            {perfil.contatos.whatsapp
              ? 'Fala pelo WhatsApp quando você chamar.'
              : 'Nenhum contato informado ainda.'}
          </Text>
          {perfil.contatos.instagram ? (
            <Text variant="callout" tone="muted" maxScale={1.3}>
              @{perfil.contatos.instagram}
            </Text>
          ) : null}
          {perfil.contatos.site ? (
            <Text variant="callout" tone="muted" maxScale={1.3} numberOfLines={1}>
              {perfil.contatos.site.replace(/^https?:\/\//, '')}
            </Text>
          ) : null}
        </Secao>

        <Nota>
          Seu telefone não fica visível aqui. Ele chega ao morador quando você diz que consegue
          atender a oportunidade dele.
        </Nota>
      </ScrollView>

      <ComoFuncionam aberta={explicando} onFechar={() => setExplicando(false)} />
    </View>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[estilos.secao, { borderTopColor: colors.line }]}>
      <Text variant="overline" tone="faint" accessibilityRole="header">
        {titulo.toUpperCase()}
      </Text>
      <View style={estilos.secaoCorpo}>{children}</View>
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1 },
  conteudo: { paddingHorizontal: gutter, paddingTop: space.lg, gap: space.lg },

  capa: { alignItems: 'center', gap: space.sm },
  selos: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.xs },
  reputacaoCapa: { marginTop: space.sm, alignItems: 'center' },

  avaliacoes: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginHorizontal: -space.lg,
  },
  comoFunciona: { minHeight: hitTarget - 4, justifyContent: 'center', alignSelf: 'flex-start' },

  descricao: { marginTop: space.sm },

  secao: {
    gap: space.sm,
    paddingTop: space.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  secaoCorpo: { gap: space.xs },

  lista: { gap: space.xs },
  linhaServico: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  ponto: { width: 4, height: 4, borderRadius: 2 },
  servicoTexto: { flex: 1 },

  galeria: { gap: space.md, paddingRight: space.lg },
  cartaoFoto: { width: 180, gap: space.xs },
  fotoGaleria: { width: 180, height: 135, borderRadius: radius.sm },
});
