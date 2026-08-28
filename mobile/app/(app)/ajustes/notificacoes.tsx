import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { LinhaDeAlternador, LinhaDeValor } from '@/ajustes/componentes';
import { abrirAjustesDoSistema, TelaDeAjuste } from '@/ajustes/Tela';
import { useNotificacoes } from '@/notificacoes/NotificacoesProvider';
import {
  categoriasDePreferencia,
  explicacaoCategoria,
  frasePermissao,
  rotuloCategoria,
} from '@/notificacoes/tipos';
import { usePreferencias } from '@/preferencias/PreferenciasProvider';
import { space } from '@/theme';
import { Alternador, Bloco, Button, Grupo, Nota, Text, haptics } from '@/ui';

/**
 * Notificações.
 *
 * A tela inteira existe para não confundir duas coisas que se parecem e não
 * são a mesma (§88):
 *
 * - **O estado do sistema.** O iOS ou o Android entrega, ou não entrega. Isso
 *   não se muda daqui — se muda nas Configurações do aparelho.
 * - **A preferência do Canaã Resolve.** Que tipos de aviso a pessoa quer
 *   receber, quando a entrega for possível.
 *
 * A consequência prática é a regra do §35: com o sistema bloqueando, os
 * interruptores continuam representando a escolha dela — e a tela **diz** que
 * nada vai chegar. Um interruptor ligado sobre uma entrega bloqueada é uma
 * mentira educada.
 *
 * Três interruptores, e não quinze (§36). Segurança não está entre eles de
 * propósito: um aviso de acesso à conta não responde ao mesmo opt-out de uma
 * comunicação comum (§37) — e a tela explica isso em vez de esconder.
 */
export default function Notificacoes() {
  const { permissao, onde, registro, ativar, conferir, respostaAoConvite } = useNotificacoes();
  const { preferencias, somenteNesteAparelho, definirAviso } = usePreferencias();

  const [ocupado, setOcupado] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);
  const [falhaAoAbrir, setFalhaAoAbrir] = useState(false);

  const entregando = permissao === 'concedida';

  const ativarAgora = useCallback(async () => {
    setOcupado(true);
    haptics.step();
    try {
      await ativar();
    } finally {
      setOcupado(false);
    }
  }, [ativar]);

  const alternar = useCallback(
    async (categoria: (typeof categoriasDePreferencia)[number], ligado: boolean) => {
      setFalha(null);
      haptics.step();
      const deu = await definirAviso(categoria, ligado);
      if (!deu) setFalha('Não foi possível salvar esta preferência agora. Tente de novo.');
    },
    [definirAviso],
  );

  return (
    <TelaDeAjuste titulo="Notificações">
      <Grupo titulo="No aparelho">
        <Bloco>
          <LinhaDeValor
            primeira
            titulo="Entrega de notificações"
            valor={frasePermissao[permissao]}
            explicacao="Quem decide isto é o sistema do seu aparelho, não o Canaã Resolve."
          />
        </Bloco>

        {/* Nunca perguntamos ainda: o caminho é o convite, com o contexto
            antes do prompt do sistema (§31). Aqui ele é uma ação, e não uma
            insistência — a pessoa veio até esta tela procurar. */}
        {permissao === 'a-perguntar' && onde === 'pronta' ? (
          <View style={estilos.acoes}>
            <Text variant="body" tone="muted" maxScale={1.3}>
              {respostaAoConvite === 'adiou'
                ? 'Você escolheu não ativar por enquanto. Pode ativar quando quiser.'
                : 'Ative para saber quando um pedido compatível com o seu trabalho chegar, mesmo com o aplicativo fechado.'}
            </Text>
            <Button label="Ativar notificações" onPress={() => void ativarAgora()} loading={ocupado} />
          </View>
        ) : null}

        {/* Negada, mas ainda dá para perguntar. Uma vez, por toque explícito —
            sem laço e sem insistir a cada abertura (§34). */}
        {permissao === 'negada' ? (
          <View style={estilos.acoes}>
            <Nota tom="destaque">
              Sem esta permissão, o aplicativo continua inteiro: as oportunidades chegam do mesmo
              jeito na Central e na Home. O que você perde é saber que uma chegou antes de abrir o
              aplicativo.
            </Nota>
            <Button label="Ativar notificações" onPress={() => void ativarAgora()} loading={ocupado} />
          </View>
        ) : null}

        {/* Bloqueada de vez: o sistema não pergunta mais. Insistir aqui só
            faria o botão parecer quebrado — o caminho é o aparelho (§34). */}
        {permissao === 'bloqueada' ? (
          <View style={estilos.acoes}>
            <Nota tom="destaque">
              As notificações do Canaã Resolve estão desativadas nas configurações do seu aparelho.
              Enquanto estiverem, nada é entregue — nem os avisos de conta. As oportunidades
              continuam aparecendo normalmente quando você abre o aplicativo.
            </Nota>
            <Button
              label="Abrir configurações do aparelho"
              variant="outline"
              onPress={async () => {
                const abriu = await abrirAjustesDoSistema();
                setFalhaAoAbrir(!abriu);
              }}
            />
            <Button label="Conferir de novo" variant="quiet" onPress={() => void conferir()} />
          </View>
        ) : null}

        {falhaAoAbrir ? (
          <View accessibilityLiveRegion="polite">
            <Nota>
              Não foi possível abrir as configurações daqui. Abra os ajustes do aparelho, procure o
              Canaã Resolve e ative as notificações.
            </Nota>
          </View>
        ) : null}

        {/* O ambiente. Nada disto é culpa de configuração faltando: é onde o
            aplicativo está rodando, e dizê-lo é melhor do que um estado
            silenciosamente parado (§62). */}
        {onde === 'expo-go' ? (
          <Nota>
            Esta é a versão de testes pelo Expo Go, que não recebe notificações enviadas pelo
            servidor. Para testá-las é preciso a build de desenvolvimento do Canaã Resolve.
          </Nota>
        ) : null}
        {onde === 'web' ? (
          <Nota>Notificações não funcionam na prévia pelo navegador.</Nota>
        ) : null}
        {onde === 'sem-aparelho' ? (
          <Nota>Notificações só funcionam em um aparelho de verdade, não no simulador.</Nota>
        ) : null}
        {onde === 'sem-projeto' ? (
          <Nota tom="destaque">
            Falta a configuração de notificações desta build. Veja `BLOCKERS.md`.
          </Nota>
        ) : null}
        {onde === 'pronta' && entregando && registro === 'falhou' ? (
          <Nota tom="destaque">
            Não conseguimos registrar este aparelho no servidor. Vamos tentar de novo na próxima vez
            que você abrir o aplicativo.
          </Nota>
        ) : null}
      </Grupo>

      <Grupo titulo="O que você quer receber">
        <Bloco>
          {categoriasDePreferencia.map((categoria, i) => (
            <LinhaDeAlternador key={categoria} primeira={i === 0}>
              <Alternador
                titulo={rotuloCategoria[categoria]}
                explicacao={explicacaoCategoria[categoria]}
                valor={preferencias.avisos[categoria]}
                onChange={(v) => void alternar(categoria, v)}
              />
            </LinhaDeAlternador>
          ))}
        </Bloco>

        {/* A frase do §89: a escolha continua valendo, e continua não chegando
            nada. As duas coisas ao mesmo tempo, sem uma anular a outra. */}
        {!entregando && permissao !== 'lendo' && onde === 'pronta' ? (
          <Nota tom="destaque">
            Estas escolhas ficam guardadas, mas nada será entregue enquanto o seu aparelho estiver
            com as notificações do Canaã Resolve desativadas.
          </Nota>
        ) : null}

        {falha ? (
          <View accessibilityLiveRegion="assertive">
            <Nota tom="destaque">{falha}</Nota>
          </View>
        ) : null}
      </Grupo>

      <Grupo titulo="Conta e segurança">
        <Bloco>
          <LinhaDeValor
            primeira
            titulo="Avisos de segurança"
            valor="Sempre"
            explicacao="Mudanças importantes de acesso à sua conta não têm interruptor: se acontecerem, você precisa saber."
          />
        </Bloco>
      </Grupo>

      {somenteNesteAparelho ? (
        <Nota>
          Estas preferências estão guardadas neste aparelho. Elas passam a valer também no servidor
          quando a central de oportunidades estiver ligada.
        </Nota>
      ) : null}

      <Text variant="caption" tone="faint" maxScale={1.25} style={estilos.remissao}>
        O Canaã Resolve não usa notificação para propaganda, lembrete de voltar ao aplicativo nem
        campanha. Se avisamos, é porque tem algo esperando por você.
      </Text>
    </TelaDeAjuste>
  );
}

const estilos = StyleSheet.create({
  acoes: { gap: space.sm },
  remissao: { paddingHorizontal: space.xs },
});
