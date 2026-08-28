import { useRouter } from 'expo-router';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ESPACO_BARRA } from '@/navigation/BarraPrincipal';
import { rotuloDaCategoria } from '@/perfil/catalogo';
import { CabecalhoDeTela, Nota, Retrato } from '@/perfil/componentes';
import { usePerfil } from '@/perfil/PerfilProvider';
import { atendimentoLegivel, horarioLegivel } from '@/perfil/tipos';
import { gutter, radius, space, useTheme } from '@/theme';
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
 */
export default function Previa() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { perfil } = usePerfil();

  if (!perfil) return null;

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

          {perfil.parceiroFundador || perfil.verificacao.estado === 'verificado' ? (
            <View style={estilos.selos}>
              {perfil.verificacao.estado === 'verificado' ? (
                <Pill tone="marca">Parceiro verificado</Pill>
              ) : null}
              {perfil.parceiroFundador ? <Pill tone="destaque">Parceiro fundador</Pill> : null}
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
