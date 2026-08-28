/**
 * As peças da área comercial.
 *
 * O briefing gasta um bloco inteiro (§131–§138) dizendo o que esta área **não**
 * pode parecer: fintech, banco, cassino, checkout genérico de SaaS, tabela de
 * preços de site espremida no celular. A tradução prática disso em decisões de
 * desenho:
 *
 * - **Nenhum cartão de preço em vidro.** O Liquid Glass da fundação existe para
 *   navegação e para folhas; usá-lo num preço seria o "parece premium" que o
 *   §133 recusa. O preço mora numa superfície comum, como todo o resto.
 * - **Nenhum gradiente, nenhum selo "MAIS POPULAR", nenhuma animação no plano
 *   mais caro** (§99). Não há plano mais caro; e no dia em que houver, esta
 *   ausência é o padrão herdado.
 * - **O valor não é o herói.** O que abre a tela é o **estado** — "sua vaga
 *   está garantida", "faltam 72 dias" —, porque é isso que a pessoa veio saber.
 *   O preço é informação, não anúncio.
 * - **Sem confete e sem foguete** (§134, §136). A confirmação é uma frase e um
 *   toque háptico.
 *
 * As peças moram aqui, e não na fundação, pela mesma regra dos outros módulos:
 * o que se repete fora de casa sobe; o que não, fica.
 */

import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { hitTarget, radius, space, useTheme } from '@/theme';
import { Bloco, CheckIcon, ChevronRightIcon, Text } from '@/ui';
import {
  condicaoFalada,
  periodicidadeLegivel,
  precoLegivel,
  dataCurta,
  dataLegivel,
  diasLegivel,
  PAGAMENTO_LEGIVEL,
  precoFalado,
  renovaAutomaticamente,
  type Cobranca,
  type Oferta,
} from './tipos';

/* -------------------------------------------------------------------------- */
/*  O cartaz de estado                                                        */
/* -------------------------------------------------------------------------- */

export type TomDoEstado = 'neutro' | 'confirmado' | 'atencao';

/**
 * O bloco que abre a área comercial: o estado, em uma frase, com o contexto
 * logo abaixo.
 *
 * Ele é o oposto de um cartão de preço. A hierarquia é: **o que eu tenho** →
 * **o que isso significa agora** → **os detalhes**. Quem abre esta tela está
 * perguntando "estou dentro?", e não "quanto custa?".
 */
export function CartazDeEstado({
  titulo,
  frase,
  destaque,
  destaqueFalado,
  tom = 'neutro',
  children,
}: {
  titulo: string;
  frase: string;
  /** Uma linha grande — "72 dias restantes". Opcional de propósito. */
  destaque?: string;
  /** O que o leitor de tela ouve no lugar do destaque, quando ele difere. */
  destaqueFalado?: string;
  tom?: TomDoEstado;
  children?: ReactNode;
}) {
  const { colors } = useTheme();

  const fundo =
    tom === 'confirmado' ? colors.brandSoft : tom === 'atencao' ? colors.accentSoft : colors.surface;
  const borda =
    tom === 'confirmado' ? colors.brandLine : tom === 'atencao' ? colors.accentLine : colors.line;

  return (
    <View style={[estilos.cartaz, { backgroundColor: fundo, borderColor: borda }]}>
      <View style={estilos.cartazTopo}>
        {tom === 'confirmado' ? <CheckIcon color={colors.brandInk} size={20} /> : null}
        <Text variant="overline" tone={tom === 'atencao' ? 'accent' : tom === 'confirmado' ? 'brand' : 'faint'}>
          {titulo.toUpperCase()}
        </Text>
      </View>

      {destaque ? (
        <Text
          variant="displayMD"
          maxScale={1.2}
          accessibilityLabel={destaqueFalado ?? destaque}
          style={estilos.destaque}
        >
          {destaque}
        </Text>
      ) : null}

      <Text variant="body" tone={tom === 'neutro' ? 'muted' : 'ink'} maxScale={1.3}>
        {frase}
      </Text>

      {children ? <View style={estilos.cartazExtra}>{children}</View> : null}
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*  A condição comercial                                                      */
/* -------------------------------------------------------------------------- */

/**
 * A oferta, escrita sem ambiguidade (§57, §58, §59).
 *
 * Três coisas aparecem sempre e juntas, porque separadas mentem: **o preço**,
 * **o período** e **quando ele começa**. "R$79" sozinho é a omissão que faz
 * alguém descobrir a segunda cobrança pelo extrato — mesmo quando não há
 * segunda cobrança, dizer que não há é parte da oferta.
 *
 * O rótulo de acessibilidade é escrito à mão: "R$79" é lido de maneiras
 * diferentes por cada leitor de tela, e "79/90" vira "setenta e nove barra
 * noventa" (§139).
 */
export function CondicaoComercial({
  oferta,
  quandoComeca,
}: {
  oferta: Oferta;
  /** A frase que explica o início. Nunca uma data inventada (§7). */
  quandoComeca: string;
}) {
  const { colors } = useTheme();
  const renova = renovaAutomaticamente(oferta);

  return (
    <Bloco style={estilos.condicao}>
      <Text variant="title" maxScale={1.25}>
        {oferta.nome}
      </Text>

      {/*
        Preço e periodicidade vêm de funções **separadas**, e nunca de um
        `split` sobre a frase pronta.

        A tentação era montar `condicaoLegivel` e fatiar por espaço. Não
        funciona: `Intl` separa "R$" do valor com espaço **não separável**
        (U+00A0), que não é o espaço que um `split(' ')` procura. O resultado
        era a linha grande dizendo "R$ 79,00 pelos" e a pequena "primeiros 90
        dias" — quebra invisível em revisão de código e óbvia na tela.
      */}
      <View
        accessible
        accessibilityRole="text"
        accessibilityLabel={condicaoFalada(oferta)}
        style={estilos.preco}
      >
        <Text variant="displayLG" maxScale={1.15} aria-hidden>
          {precoLegivel(oferta.precoCentavos, oferta.moeda)}
        </Text>
        <Text variant="callout" tone="muted" maxScale={1.2} aria-hidden>
          {periodicidadeLegivel(oferta)}
        </Text>
      </View>

      <Text variant="body" tone="muted" maxScale={1.3}>
        {oferta.descricao}
      </Text>

      <View style={[estilos.divisor, { backgroundColor: colors.line }]} />

      <View style={estilos.beneficios}>
        {oferta.beneficios.map((b) => (
          <View key={b} style={estilos.beneficio}>
            <CheckIcon color={colors.brandInk} size={16} />
            <Text variant="callout" maxScale={1.25} style={estilos.beneficioTexto}>
              {b}
            </Text>
          </View>
        ))}
      </View>

      <View style={[estilos.divisor, { backgroundColor: colors.line }]} />

      {/* O que a oferta é e o que ela não é, lado a lado, sem letra miúda. A
          ausência de fidelidade e a ausência de renovação automática são parte
          do que foi vendido (§8, §9) — escondê-las numa nota de rodapé seria a
          letra pequena que contradiz a oferta. */}
      <LinhaDaCondicao rotulo="Começa" valor={quandoComeca} />
      <LinhaDaCondicao
        rotulo="Renovação"
        valor={renova ? 'Renova automaticamente' : 'Não renova automaticamente'}
      />
      <LinhaDaCondicao rotulo="Fidelidade" valor="Não há" />
    </Bloco>
  );
}

function LinhaDaCondicao({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <View style={estilos.linhaCondicao} accessible accessibilityLabel={`${rotulo}: ${valor}`}>
      <Text variant="caption" tone="faint" maxScale={1.2} style={estilos.linhaRotulo}>
        {rotulo}
      </Text>
      <Text variant="callout" maxScale={1.2} style={estilos.linhaValor}>
        {valor}
      </Text>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*  O período                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Início, fim e quanto falta — as três datas que o §26 e o §31 pedem.
 *
 * Sem barra de progresso: o tempo restante de uma participação não é uma tarefa
 * sendo cumprida, e uma barra que enche cria a ansiedade que o §31 proíbe. Os
 * números bastam, e são mais precisos.
 */
export function PeriodoDoBeta({
  inicio,
  fim,
  diasRestantes,
}: {
  inicio: string | null;
  fim: string | null;
  diasRestantes: number | null;
}) {
  const inicioEscrito = dataLegivel(inicio);
  const fimEscrito = dataLegivel(fim);

  return (
    <Bloco style={estilos.periodo}>
      <LinhaDaCondicao rotulo="Início" valor={inicioEscrito ?? 'Ainda não começou'} />
      <LinhaDaCondicao rotulo="Término previsto" valor={fimEscrito ?? '—'} />
      {diasRestantes !== null ? (
        <LinhaDaCondicao rotulo="Restam" valor={diasLegivel(diasRestantes)} />
      ) : null}
    </Bloco>
  );
}

/* -------------------------------------------------------------------------- */
/*  Histórico de cobrança                                                     */
/* -------------------------------------------------------------------------- */

/** Uma linha do histórico (§63). Data, descrição, valor, estado. Nada mais. */
export function LinhaDeCobranca({ cobranca, primeira }: { cobranca: Cobranca; primeira?: boolean }) {
  const { colors } = useTheme();
  const estado = PAGAMENTO_LEGIVEL[cobranca.estado];
  const problema = cobranca.estado === 'falhou' || cobranca.estado === 'contestado';

  return (
    <View
      accessible
      accessibilityLabel={[
        dataCurta(cobranca.em),
        cobranca.descricao,
        precoFalado(cobranca.valorCentavos, cobranca.moeda),
        estado,
      ].join(', ')}
      style={[
        estilos.cobranca,
        {
          borderTopColor: colors.line,
          borderTopWidth: primeira ? 0 : StyleSheet.hairlineWidth,
        },
      ]}
    >
      <View style={estilos.cobrancaTexto}>
        <Text variant="bodyStrong" maxScale={1.25} numberOfLines={2}>
          {cobranca.descricao}
        </Text>
        <Text variant="caption" tone="muted" maxScale={1.2}>
          {dataCurta(cobranca.em)} · {cobranca.origem}
        </Text>
      </View>

      <View style={estilos.cobrancaValor}>
        <Text variant="bodyStrong" maxScale={1.2}>
          {new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: cobranca.moeda,
          }).format(cobranca.valorCentavos / 100)}
        </Text>
        <Text
          variant="caption"
          tone={problema ? 'danger' : cobranca.estado === 'aprovado' ? 'muted' : 'accent'}
          maxScale={1.2}
        >
          {estado}
        </Text>
      </View>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*  O aviso contextual da Home                                                */
/* -------------------------------------------------------------------------- */

/**
 * O que decide se a Home mostra alguma coisa sobre a situação comercial.
 *
 * Esta função é o §101 e o §102 escritos como regra, e não como bom senso de
 * quem for mexer na Home depois. Ela devolve `null` em quase todos os estados —
 * inclusive nos bons —, e é essa a intenção: **o profissional abriu o
 * aplicativo para trabalhar oportunidades**, e um cartão sobre plano no meio
 * disso é interrupção, não informação.
 *
 * Só três situações passam, e as três têm ação ou consequência real:
 *
 * 1. o Beta está nos últimos sete dias;
 * 2. há uma cobrança com problema numa assinatura;
 * 3. o cadastro foi aprovado e a participação ainda não foi concluída.
 *
 * Beta ativo com setenta dias pela frente não aparece. Vaga reservada não
 * aparece. Nada que o profissional já sabe e não pode mudar aparece.
 */
export function avisoComercialDaHome(situacao: {
  adesao: { estado: string; terminando: boolean; beta: { diasRestantes: number | null } } | null;
  assinatura: { estado: string } | null;
  ofertaDisponivel: unknown;
}): { titulo: string; texto: string } | null {
  if (situacao.assinatura?.estado === 'pagamento_atrasado') {
    return {
      titulo: 'Pagamento pendente',
      texto: 'Não conseguimos concluir a última cobrança. Toque para ver o que fazer.',
    };
  }

  if (situacao.adesao?.terminando) {
    const dias = situacao.adesao.beta.diasRestantes;
    return {
      titulo: 'Seu período Beta está terminando',
      texto:
        dias !== null
          ? `Termina em ${diasLegivel(dias)}. Avisaremos sobre a continuidade antes disso.`
          : 'Avisaremos sobre a continuidade antes do término.',
    };
  }

  if (situacao.adesao?.estado === 'aprovado' && situacao.ofertaDisponivel) {
    return {
      titulo: 'Sua vaga está reservada',
      texto: 'Falta concluir a participação para começar a receber oportunidades.',
    };
  }

  return null;
}

/**
 * O aviso em si — uma linha discreta, tocável, sem imagem e sem botão grande.
 *
 * Ele tem o peso de um lembrete, e não o de uma oferta. A diferença entre os
 * dois é o que separa o §101 ("pode existir aviso contextual") do §102 ("não
 * transforme a Home em anúncio").
 */
export function AvisoComercial({
  titulo,
  texto,
  onPress,
}: {
  titulo: string;
  texto: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${titulo}. ${texto}`}
      style={[estilos.aviso, { backgroundColor: colors.surface2, borderColor: colors.line }]}
    >
      <View style={estilos.avisoTexto}>
        <Text variant="bodyStrong" maxScale={1.25}>
          {titulo}
        </Text>
        <Text variant="caption" tone="muted" maxScale={1.2}>
          {texto}
        </Text>
      </View>
      <ChevronRightIcon color={colors.faint} />
    </Pressable>
  );
}

/* -------------------------------------------------------------------------- */

const estilos = StyleSheet.create({
  aviso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: hitTarget,
  },
  avisoTexto: { flex: 1, gap: 2 },

  cartaz: {
    padding: space.xl,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: space.sm,
  },
  cartazTopo: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  destaque: { marginTop: space.xxs },
  cartazExtra: { marginTop: space.sm },

  condicao: { padding: space.xl, gap: space.md },
  preco: { gap: 2 },
  divisor: { height: StyleSheet.hairlineWidth, marginVertical: space.xxs },
  beneficios: { gap: space.sm },
  beneficio: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  beneficioTexto: { flex: 1 },

  linhaCondicao: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md,
    minHeight: space['2xl'],
  },
  linhaRotulo: { width: 116 },
  linhaValor: { flex: 1 },

  periodo: { padding: space.xl, gap: space.xxs },

  cobranca: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    minHeight: hitTarget,
  },
  cobrancaTexto: { flex: 1, gap: 2 },
  cobrancaValor: { alignItems: 'flex-end', gap: 2 },
});
