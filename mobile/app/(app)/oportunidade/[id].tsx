import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { registrar } from '@/oportunidades/analytics';
import { useCarteira } from '@/oportunidades/Carteira';
import { comoErroDeDados, type ErroDeDados } from '@/oportunidades/repositorio';
import {
  dataPorExtenso,
  motivosDeRecusa,
  resultadosDeEncerramento,
  rotuloEvento,
  rotuloMotivoRecusa,
  rotuloResultado,
  rotuloUrgencia,
  telefoneLegivel,
  tempoRelativo,
  urgenciaEmDestaque,
  type MotivoRecusa,
  type Oportunidade,
  type Resultado,
} from '@/oportunidades/tipos';
import { gutter, motion, radius, space, useTheme } from '@/theme';
import {
  AlertIcon,
  Button,
  ChevronLeftIcon,
  ClockIcon,
  GlassSurface,
  haptics,
  OpcaoDaFolha,
  PhoneIcon,
  PinIcon,
  Sheet,
  Skeleton,
  TagIcon,
  Text,
  WhatsAppIcon,
} from '@/ui';

/**
 * A oportunidade aberta. **Uma tela só**, para todo caminho — a Home, a
 * Central, um link, e amanhã uma notificação. Não existem dois detalhes.
 *
 * A hierarquia começa pelo problema humano, não pelo identificador, não pela
 * categoria e não pelo nome do sistema:
 *
 *     "O ar-condicionado liga, mas não está gelando"
 *
 * Depois vem o que ajuda a decidir — o balcão, o bairro, a pressa, quando
 * chegou — e só então o relato completo. A pessoa que pediu não aparece antes
 * da hora: nome e telefone só existem depois que o profissional diz que
 * consegue atender, e isso é garantido no repositório, não aqui.
 *
 * A ação principal fica fixa na base, em vidro, porque a decisão é o motivo de
 * a tela existir e o relato pode ser longo o bastante para levá-la para fora
 * da vista.
 */
export default function DetalheDaOportunidade() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const {
    buscar,
    carregarUma,
    abrir,
    situacao,
    agora,
    demonstrarInteresse,
    naoConsigoAtender,
    iniciarContato,
    encerrar,
  } = useCarteira();

  const oportunidade = id ? buscar(id) : undefined;

  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<ErroDeDados | null>(null);
  const [ocupada, setOcupada] = useState(false);
  const [falhaDaAcao, setFalhaDaAcao] = useState<string | null>(null);
  const [folhaDeRecusa, setFolhaDeRecusa] = useState(false);
  const [folhaDeEncerramento, setFolhaDeEncerramento] = useState(false);
  const [dataExata, setDataExata] = useState(false);

  const jaAbriu = useRef(false);

  /**
   * Se a carteira não tem esta oportunidade, ela veio de fora — um link, uma
   * notificação, um histórico antigo. Buscar uma só é o caminho normal, não a
   * exceção: o detalhe nunca depende de a lista ter sido visitada antes.
   */
  useEffect(() => {
    if (!id || oportunidade || situacao === 'carregando') return;
    let vivo = true;
    setCarregando(true);
    setErro(null);
    registrar({ nome: 'oportunidade_aberta_por_link', id });
    carregarUma(id)
      .catch((e: unknown) => {
        if (vivo) setErro(comoErroDeDados(e));
      })
      .finally(() => {
        if (vivo) setCarregando(false);
      });
    return () => {
      vivo = false;
    };
  }, [id, oportunidade, situacao, carregarUma]);

  /** Abrir marca como vista — uma vez, na primeira vez. */
  useEffect(() => {
    if (!oportunidade || jaAbriu.current) return;
    jaAbriu.current = true;
    abrir(oportunidade);
  }, [oportunidade, abrir]);

  const voltar = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/oportunidades');
  }, [router]);

  /**
   * Puxar para atualizar. A necessidade pode ter sido corrigida depois de
   * chegar; reler é o que trará isso quando houver servidor. Uma falha aqui não
   * apaga o que está na tela — o conteúdo de um minuto atrás é melhor do que
   * uma tela vazia.
   */
  const [relendo, setRelendo] = useState(false);
  const aoReler = useCallback(() => {
    if (!id || relendo) return;
    setRelendo(true);
    setFalhaDaAcao(null);
    carregarUma(id)
      .catch((e: unknown) => {
        setFalhaDaAcao(comoErroDeDados(e, 'Não foi possível atualizar agora.').message);
      })
      .finally(() => setRelendo(false));
  }, [id, relendo, carregarUma]);

  /** Toda ação passa por aqui: um único lugar para ocupar, falhar e vibrar. */
  const executar = useCallback(
    async (acao: () => Promise<Oportunidade>, aoConcluir?: () => void) => {
      if (ocupada) return;
      setOcupada(true);
      setFalhaDaAcao(null);
      try {
        await acao();
        haptics.success();
        aoConcluir?.();
      } catch (e) {
        haptics.error();
        // Sem rede, sem servidor, sem nada: a decisão simplesmente não foi
        // registrada, e é isso que a frase diz. Nada aqui finge ter dado certo.
        setFalhaDaAcao(comoErroDeDados(e, 'Não foi possível registrar isso agora.').message);
      } finally {
        setOcupada(false);
      }
    },
    [ocupada],
  );

  const aoDemonstrarInteresse = useCallback(() => {
    if (!oportunidade) return;
    void executar(() => demonstrarInteresse(oportunidade.id));
  }, [oportunidade, executar, demonstrarInteresse]);

  const aoRecusar = useCallback(
    (motivo: MotivoRecusa | null) => {
      if (!oportunidade) return;
      setFolhaDeRecusa(false);
      void executar(() => naoConsigoAtender(oportunidade.id, motivo));
    },
    [oportunidade, executar, naoConsigoAtender],
  );

  const aoEncerrar = useCallback(
    (resultado: Resultado) => {
      if (!oportunidade) return;
      setFolhaDeEncerramento(false);
      void executar(() => encerrar(oportunidade.id, resultado));
    },
    [oportunidade, executar, encerrar],
  );

  /**
   * Contato só acontece por toque explícito, e sempre em duas etapas: abrir o
   * aplicativo de fora, e só então registrar que houve contato. Nada é enviado
   * por conta própria — nem uma mensagem, nem uma ligação.
   */
  const aoContatar = useCallback(
    (canal: 'whatsapp' | 'telefone') => {
      const contato = oportunidade?.contato;
      if (!oportunidade || !contato) return;

      const url =
        canal === 'whatsapp'
          ? // `wa.me` abre o aplicativo quando ele existe e cai no navegador
            // quando não existe — o desvio já vem pronto, sem `canOpenURL`.
            `https://wa.me/${contato.telefone.replace(/\D/g, '')}?text=${encodeURIComponent(
              `Olá, ${contato.primeiroNome}. Recebi seu pedido pelo Canaã Resolve sobre "${oportunidade.necessidade}".`,
            )}`
          : `tel:${contato.telefone}`;

      haptics.step();
      Linking.openURL(url)
        .then(() => {
          void executar(() => iniciarContato(oportunidade.id, canal));
        })
        .catch(() => {
          setFalhaDaAcao(
            canal === 'whatsapp'
              ? 'Não foi possível abrir o WhatsApp neste aparelho.'
              : 'Não foi possível abrir o telefone neste aparelho.',
          );
        });
    },
    [oportunidade, executar, iniciarContato],
  );

  // ——— Estados que não são a tela cheia ———————————————————————————————

  if (!oportunidade && (carregando || situacao === 'carregando')) {
    return <EsqueletoDoDetalhe onVoltar={voltar} />;
  }

  if (!oportunidade) {
    return (
      <TelaDeAviso
        onVoltar={voltar}
        indisponivel={erro?.indisponivel ?? true}
        mensagem={erro?.message ?? 'Esta oportunidade não está mais disponível.'}
        detalhe={erro?.detalhe}
      />
    );
  }

  const o = oportunidade;
  const decidindo = o.estado === 'nova' || o.estado === 'vista';
  const encerrada = o.estado === 'encerrada';

  return (
    <View style={styles.tela}>
      <CabecalhoDoDetalhe onVoltar={voltar} />

      <ScrollView
        contentContainerStyle={[
          styles.conteudo,
          { paddingBottom: insets.bottom + (encerrada ? space['3xl'] : 168) },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          // Buscar de novo troca a oportunidade **no lugar**: a rolagem fica
          // onde estava e a tela não pisca. O "atualizando" é desta tela, e não
          // o da carteira — a lista tem o dela.
          <RefreshControl
            refreshing={relendo}
            onRefresh={aoReler}
            tintColor={colors.brand}
            colors={[colors.brand]}
            progressBackgroundColor={colors.surface}
          />
        }
      >
        {/* 1. O problema. Nada vem antes dele. */}
        <Animated.View
          entering={FadeInDown.duration(motion.duration.slow)}
          style={styles.abertura}
        >
          <Text variant="displayMD" maxScale={1.3}>
            {o.necessidade}
          </Text>
          <Pressable
            onPress={() => setDataExata((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={`Recebida ${tempoRelativo(o.recebidaEm, agora)}. Toque para ver a data exata.`}
            hitSlop={8}
            style={styles.tempo}
          >
            <ClockIcon size={14} color={colors.faint} />
            <Text variant="caption" tone="faint" maxScale={1.2}>
              {dataExata ? dataPorExtenso(o.recebidaEm) : tempoRelativo(o.recebidaEm, agora)}
            </Text>
          </Pressable>
        </Animated.View>

        {/* 2. O que ajuda a decidir se você consegue atender. */}
        <View style={[styles.contexto, { borderColor: colors.line }]}>
          <Informacao icone={<TagIcon size={17} color={colors.muted} />} rotulo="Balcão">
            {o.categoria}
          </Informacao>
          <Informacao icone={<PinIcon size={17} color={colors.muted} />} rotulo="Região">
            {o.regiao}
          </Informacao>
          <Informacao
            icone={<ClockIcon size={17} color={colors.muted} />}
            rotulo="Prazo"
            destaque={urgenciaEmDestaque(o.urgencia) && !encerrada}
          >
            {rotuloUrgencia[o.urgencia]}
          </Informacao>
        </View>

        {/* 3. O relato, por inteiro. */}
        {o.descricao ? (
          <Secao titulo="O que precisa ser resolvido">
            <Text variant="body" maxScale={1.4} style={styles.relato}>
              {o.descricao}
            </Text>
          </Secao>
        ) : null}

        {o.observacoes ? (
          <Secao titulo="A pessoa acrescentou">
            <Text variant="body" tone="muted" maxScale={1.4} style={styles.relato}>
              {o.observacoes}
            </Text>
          </Secao>
        ) : null}

        {/* 4. Quem pediu — só depois de você dizer que consegue atender. */}
        {o.contato ? (
          <Secao titulo="Para falar com a pessoa">
            <Text variant="bodyStrong" maxScale={1.3}>
              {o.contato.primeiroNome}
            </Text>
            <Text variant="callout" tone="muted" maxScale={1.3}>
              {telefoneLegivel(o.contato.telefone)}
            </Text>
          </Secao>
        ) : decidindo ? (
          <View style={[styles.privacidade, { borderColor: colors.line }]}>
            <Text variant="caption" tone="faint" maxScale={1.3}>
              O contato da pessoa aparece aqui quando você disser que consegue atender.
            </Text>
          </View>
        ) : null}

        {/* 5. Como terminou — quando terminou. */}
        {encerrada && o.resultado ? (
          <View
            style={[
              styles.resultado,
              { backgroundColor: colors.surface2, borderColor: colors.line },
            ]}
          >
            <Text variant="overline" tone="faint">
              COMO TERMINOU
            </Text>
            <Text variant="bodyStrong" maxScale={1.3}>
              {rotuloResultado[o.resultado]}
            </Text>
            {o.motivoRecusa ? (
              <Text variant="callout" tone="muted" maxScale={1.3}>
                {rotuloMotivoRecusa[o.motivoRecusa]}
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* 6. O histórico. Discreto, embaixo, só com o que aconteceu mesmo. */}
        <Historico eventos={o.historico} agora={agora} />

        {falhaDaAcao ? (
          <Animated.View
            entering={FadeIn.duration(motion.duration.base)}
            style={[styles.falha, { borderColor: colors.line, backgroundColor: colors.dangerSoft }]}
            accessibilityLiveRegion="polite"
          >
            <AlertIcon size={16} color={colors.danger} />
            <Text variant="caption" tone="muted" maxScale={1.3} style={styles.falhaTexto}>
              {`${falhaDaAcao} Verifique sua conexão e tente de novo.`}
            </Text>
          </Animated.View>
        ) : null}
      </ScrollView>

      {!encerrada ? (
        <Doca
          oportunidade={o}
          ocupada={ocupada}
          onInteresse={aoDemonstrarInteresse}
          onRecusar={() => setFolhaDeRecusa(true)}
          onContatar={aoContatar}
          onEncerrar={() => setFolhaDeEncerramento(true)}
        />
      ) : null}

      <Sheet
        aberta={folhaDeRecusa}
        titulo="Não consigo atender"
        descricao="Se quiser dizer o motivo, isso ajuda a mandar oportunidades mais parecidas com o seu trabalho. É opcional."
        onFechar={() => setFolhaDeRecusa(false)}
      >
        <View>
          {motivosDeRecusa.map((m, i) => (
            <OpcaoDaFolha
              key={m}
              rotulo={rotuloMotivoRecusa[m]}
              selecionada={false}
              onPress={() => aoRecusar(m)}
              primeira={i === 0}
            />
          ))}
        </View>
        <Button
          label="Prefiro não dizer"
          variant="quiet"
          onPress={() => aoRecusar(null)}
          haptic="commit"
        />
      </Sheet>

      <Sheet
        aberta={folhaDeEncerramento}
        titulo="Como terminou?"
        descricao="Um toque. Isso não vai para a pessoa — serve para o Canaã Resolve entender o que está funcionando."
        onFechar={() => setFolhaDeEncerramento(false)}
      >
        <View>
          {resultadosDeEncerramento.map((r, i) => (
            <OpcaoDaFolha
              key={r}
              rotulo={rotuloResultado[r]}
              selecionada={false}
              onPress={() => aoEncerrar(r)}
              primeira={i === 0}
            />
          ))}
        </View>
      </Sheet>
    </View>
  );
}

/**
 * A doca. A ação principal muda com o estado, e é sempre **uma**: a segunda
 * decisão existe, mas em peso menor — duas ações com o mesmo peso não são
 * hierarquia, são dúvida.
 */
function Doca({
  oportunidade: o,
  ocupada,
  onInteresse,
  onRecusar,
  onContatar,
  onEncerrar,
}: {
  oportunidade: Oportunidade;
  ocupada: boolean;
  onInteresse: () => void;
  onRecusar: () => void;
  onContatar: (canal: 'whatsapp' | 'telefone') => void;
  onEncerrar: () => void;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const decidindo = o.estado === 'nova' || o.estado === 'vista';
  const podeFalar = Boolean(o.contato);
  const podeLigar = Boolean(o.contato);

  return (
    <View
      style={[styles.doca, { paddingBottom: Math.max(insets.bottom, space.lg) }]}
    >
      {/* O texto dissolve antes de encostar no vidro. Sem isto, uma linha do
          relato passa por trás da doca e as duas ficam ilegíveis — vidro só
          serve se o que está embaixo dele continuar legível. */}
      <LinearGradient
        colors={[transparente(colors.bg), colors.bg]}
        style={styles.docaVeu}
      />
      <GlassSurface radius={radius['2xl']} style={styles.docaVidro}>
        {decidindo ? (
          <>
            <Button
              label="Consigo atender"
              onPress={onInteresse}
              loading={ocupada}
              haptic="commit"
              accessibilityHint="Registra que você quer avançar com esta oportunidade e libera o contato da pessoa"
            />
            <Button
              label="Não consigo atender"
              variant="quiet"
              onPress={onRecusar}
              disabled={ocupada}
              style={styles.docaSecundaria}
            />
          </>
        ) : o.estado === 'interessado' ? (
          <>
            <Button
              label={o.contato?.whatsapp ? 'Falar no WhatsApp' : 'Ligar para a pessoa'}
              icon={
                o.contato?.whatsapp ? (
                  <WhatsAppIcon size={19} color={colors.onBrandFill} />
                ) : (
                  <PhoneIcon size={19} color={colors.onBrandFill} />
                )
              }
              onPress={() => onContatar(o.contato?.whatsapp ? 'whatsapp' : 'telefone')}
              disabled={!podeFalar || ocupada}
              haptic="commit"
              accessibilityHint="Abre o aplicativo para você mesmo escrever. Nada é enviado sozinho."
            />
            <View style={styles.docaLinha}>
              {o.contato?.whatsapp && podeLigar ? (
                <Button
                  label="Ligar"
                  variant="quiet"
                  onPress={() => onContatar('telefone')}
                  disabled={ocupada}
                  style={styles.docaMetade}
                />
              ) : null}
              <Button
                label="Encerrar"
                variant="quiet"
                onPress={onEncerrar}
                disabled={ocupada}
                style={styles.docaMetade}
              />
            </View>
          </>
        ) : (
          <>
            <Button
              label="Registrar como terminou"
              onPress={onEncerrar}
              disabled={ocupada}
              haptic="commit"
            />
            {podeFalar ? (
              <Button
                label="Falar de novo"
                variant="quiet"
                onPress={() => onContatar(o.contato?.whatsapp ? 'whatsapp' : 'telefone')}
                disabled={ocupada}
                style={styles.docaSecundaria}
              />
            ) : null}
          </>
        )}
      </GlassSurface>
    </View>
  );
}

function CabecalhoDoDetalhe({ onVoltar }: { onVoltar: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.cabecalho, { paddingTop: insets.top + space.sm }]}>
      <Pressable
        onPress={onVoltar}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Voltar"
        style={({ pressed }) => [
          styles.voltar,
          { backgroundColor: colors.surface2, borderColor: colors.line, opacity: pressed ? 0.6 : 1 },
        ]}
      >
        <ChevronLeftIcon size={20} color={colors.ink} />
      </Pressable>
      <Text variant="overline" tone="faint" numberOfLines={1}>
        OPORTUNIDADE
      </Text>
    </View>
  );
}

function Informacao({
  icone,
  rotulo,
  children,
  destaque = false,
}: {
  icone: ReactNode;
  rotulo: string;
  children: string;
  destaque?: boolean;
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.informacao} accessibilityLabel={`${rotulo}: ${children}`}>
      <View style={styles.informacaoIcone}>{icone}</View>
      <View style={styles.informacaoTexto}>
        <Text variant="caption" tone="faint" maxScale={1.2}>
          {rotulo}
        </Text>
        <Text
          variant="bodyStrong"
          maxScale={1.3}
          style={destaque ? { color: colors.accentInk } : undefined}
        >
          {children}
        </Text>
      </View>
    </View>
  );
}

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <View style={styles.secao}>
      <Text variant="overline" tone="faint" accessibilityRole="header">
        {titulo.toUpperCase()}
      </Text>
      <View style={styles.secaoCorpo}>{children}</View>
    </View>
  );
}

/** Só o que aconteceu. Sem auditoria, sem carimbo técnico, sem atividade falsa. */
function Historico({
  eventos,
  agora,
}: {
  eventos: Oportunidade['historico'];
  agora: Date;
}) {
  const { colors } = useTheme();
  const linhas = useMemo(() => [...eventos].reverse(), [eventos]);

  if (linhas.length === 0) return null;

  return (
    <View style={styles.secao}>
      <Text variant="overline" tone="faint" accessibilityRole="header">
        O QUE JÁ ACONTECEU
      </Text>
      <View style={styles.historico}>
        {linhas.map((e, i) => (
          <View key={`${e.tipo}-${e.em.getTime()}-${i}`} style={styles.evento}>
            <View style={styles.trilho}>
              <View
                style={[
                  styles.eventoPonto,
                  { backgroundColor: i === 0 ? colors.brand : colors.lineStrong },
                ]}
              />
              {i < linhas.length - 1 ? (
                <View style={[styles.eventoTraco, { backgroundColor: colors.line }]} />
              ) : null}
            </View>
            <View style={styles.eventoTexto}>
              {/* O acontecimento primeiro, o como depois. Só o complemento
                  ("Pelo WhatsApp") não diz o que houve. */}
              <Text variant="callout" maxScale={1.3}>
                {rotuloEvento[e.tipo]}
              </Text>
              <Text variant="caption" tone="faint" maxScale={1.2}>
                {e.detalhe ? `${e.detalhe} · ${tempoRelativo(e.em, agora)}` : tempoRelativo(e.em, agora)}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function EsqueletoDoDetalhe({ onVoltar }: { onVoltar: () => void }) {
  const { colors } = useTheme();

  return (
    <View style={styles.tela}>
      <CabecalhoDoDetalhe onVoltar={onVoltar} />
      <View
        style={[styles.conteudo, styles.esqueleto]}
        accessibilityLabel="Carregando a oportunidade"
      >
        <Skeleton width="92%" height={28} />
        <Skeleton width="64%" height={28} />
        <Skeleton width={110} height={14} />
        <View style={[styles.contexto, styles.esqueletoBloco, { borderColor: colors.line }]}>
          <Skeleton width="55%" height={18} />
          <Skeleton width="40%" height={18} />
          <Skeleton width="48%" height={18} />
        </View>
        <Skeleton width="100%" height={16} />
        <Skeleton width="96%" height={16} />
        <Skeleton width="72%" height={16} />
      </View>
    </View>
  );
}

/**
 * Quando não há o que mostrar. Duas situações diferentes, ditas de forma
 * diferente — e nenhuma delas mostra 404, exceção ou JSON.
 */
function TelaDeAviso({
  onVoltar,
  indisponivel,
  mensagem,
  detalhe,
}: {
  onVoltar: () => void;
  indisponivel: boolean;
  mensagem: string;
  detalhe?: string;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.tela}>
      <CabecalhoDoDetalhe onVoltar={onVoltar} />
      <View
        style={[styles.aviso, { paddingBottom: insets.bottom + space['3xl'] }]}
        accessibilityLiveRegion="polite"
      >
        <View style={[styles.avisoIcone, { backgroundColor: colors.surface2 }]}>
          <AlertIcon size={22} color={colors.muted} />
        </View>
        <Text variant="title" center maxScale={1.3}>
          {mensagem}
        </Text>
        <Text variant="callout" tone="muted" center maxScale={1.3} style={styles.avisoTexto}>
          {indisponivel
            ? 'Ela pode ter sido resolvida ou retirada. Suas outras oportunidades continuam na Central.'
            : 'Isso costuma ser a conexão. Volte e tente abrir de novo em instantes.'}
        </Text>
        {__DEV__ && detalhe ? (
          <Text variant="caption" tone="faint" center>
            {`Desenvolvimento — ${detalhe}`}
          </Text>
        ) : null}
        <Button
          label="Ver minhas oportunidades"
          variant="outline"
          onPress={onVoltar}
          style={styles.avisoAcao}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1 },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: gutter,
    paddingBottom: space.md,
  },
  voltar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  conteudo: { paddingHorizontal: gutter, gap: space['2xl'] },
  abertura: { gap: space.xs },
  // Alvo cheio: o toque abre a data exata, e ninguém acerta 18 px de altura.
  tempo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    minHeight: 44,
    paddingRight: space.sm,
  },
  contexto: {
    gap: space.lg,
    padding: space.xl,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  informacao: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  informacaoIcone: { width: 20, alignItems: 'center', marginTop: 2 },
  informacaoTexto: { flex: 1, gap: 1 },
  secao: { gap: space.md },
  secaoCorpo: { gap: space.xs },
  relato: { maxWidth: 560 },
  privacidade: {
    padding: space.lg,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
  },
  resultado: {
    gap: space.xs,
    padding: space.xl,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  historico: { gap: 0 },
  evento: { flexDirection: 'row', gap: space.md },
  trilho: { width: 10, alignItems: 'center' },
  eventoPonto: { width: 8, height: 8, borderRadius: 4, marginTop: 7 },
  eventoTraco: { width: StyleSheet.hairlineWidth, flex: 1, marginVertical: 3 },
  eventoTexto: { flex: 1, gap: 1, paddingBottom: space.lg },
  falha: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
    padding: space.lg,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  falhaTexto: { flex: 1 },
  doca: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: gutter,
    paddingTop: space.sm,
    pointerEvents: 'box-none',
  },
  docaVeu: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 116, pointerEvents: 'none' },
  docaVidro: { padding: space.md, gap: space.xs },
  docaSecundaria: { marginTop: 2 },
  docaLinha: { flexDirection: 'row', gap: space.sm, marginTop: 2 },
  docaMetade: { flex: 1 },
  esqueleto: { gap: space.lg, paddingTop: space.md },
  esqueletoBloco: { marginTop: space.md },
  aviso: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    paddingHorizontal: gutter,
  },
  avisoIcone: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avisoTexto: { maxWidth: 320 },
  avisoAcao: { alignSelf: 'stretch', marginTop: space.lg },
});

/**
 * A mesma cor do fundo, sem opacidade — o começo do esmaecimento. Escrito à
 * mão porque a paleta guarda cores sólidas, e um gradiente precisa dos dois
 * extremos da mesma cor para não puxar cinza no meio do caminho.
 */
function transparente(cor: string): string {
  const hex = cor.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r},${g},${b},0)`;
}
