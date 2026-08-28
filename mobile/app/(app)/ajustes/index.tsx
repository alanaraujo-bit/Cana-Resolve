import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { registrar } from '@/ajustes/analytics';
import { LinhaDeAcao, LinhaDeAjuste, LinhaDeValor } from '@/ajustes/componentes';
import { links, NOME_DO_APLICATIVO, versao } from '@/ajustes/informacoes';
import { abrirExterno, TelaDeAjuste } from '@/ajustes/Tela';
import { useNotificacoes } from '@/notificacoes/NotificacoesProvider';
import { frasePermissao } from '@/notificacoes/tipos';
import { usePreferencias } from '@/preferencias/PreferenciasProvider';
import { IDIOMAS } from '@/preferencias/tipos';
import { useSession } from '@/session/SessionProvider';
import { space, useTheme } from '@/theme';
import { Bloco, Button, Grupo, Nota, Sheet, Text, haptics } from '@/ui';

/**
 * A capa das Configurações.
 *
 * A pergunta que ela responde é "onde eu mexo em X" — e a resposta precisa
 * chegar sem leitura, pela forma. Por isso são cinco grupos curtos, na ordem em
 * que se procura: **a conta**, **como o aplicativo se comporta**, **o que os
 * outros veem**, **onde pedir ajuda**, **o que é este aplicativo**. Sair fica
 * no fim, sozinho, longe do que se toca todo dia.
 *
 * O que ficou de fora, e por quê: plano, assinatura e desempenho — são outra
 * fase. Notificações **entraram** na Fase 06, e a linha delas mostra o estado
 * do sistema em vez de um interruptor: o interruptor que importa aqui é o do
 * aparelho, e ele não mora nesta tela.
 */
export default function Ajustes() {
  const { colors, preference } = useTheme();
  const router = useRouter();
  const { account, signOut } = useSession();
  const { preferencias } = usePreferencias();
  const { permissao } = useNotificacoes();

  const [confirmandoSaida, setConfirmandoSaida] = useState(false);
  const [saindo, setSaindo] = useState(false);
  const [falhaDeLink, setFalhaDeLink] = useState<string | null>(null);

  useEffect(() => {
    registrar({ nome: 'ajustes_abertos' });
  }, []);

  const ir = useCallback(
    (area: string, rota: Parameters<typeof router.push>[0]) => {
      registrar({ nome: 'ajuste_area_aberta', area });
      router.push(rota);
    },
    [router],
  );

  const abrirDocumento = useCallback(
    async (destino: 'termos' | 'privacidade', url: string) => {
      registrar({ nome: 'link_aberto', destino });
      const abriu = await abrirExterno(url);
      if (!abriu) {
        setFalhaDeLink('Não foi possível abrir o documento neste aparelho.');
      }
    },
    [],
  );

  const sair = useCallback(async () => {
    setSaindo(true);
    haptics.commit();
    await signOut();
    registrar({ nome: 'saida_concluida' });
    // Nenhum `router.replace` aqui: quem move o aplicativo é o porteiro, na
    // raiz, e ele já está ouvindo a sessão. Um redirecionamento a mais nesta
    // tela seria a segunda fonte de verdade que a Fase 05 proíbe.
  }, [signOut]);

  const temaLegivel =
    preference === 'system' ? 'Sistema' : preference === 'dark' ? 'Escuro' : 'Claro';

  return (
    <TelaDeAjuste titulo="Configurações">
      {/* Quem está usando, e como se entra. Sem retrato: o rosto é do Perfil.
          A linha do nome **é** a porta dos dados da conta — uma segunda linha
          escrita "Dados da conta" logo abaixo levaria ao mesmo lugar, e duas
          portas para a mesma sala é o começo de uma tela confusa. */}
      <Bloco>
        <LinhaDeAjuste
          primeira
          titulo={account?.nome || 'Sua conta'}
          explicacao={account?.email ?? 'Dados da conta'}
          onPress={() => ir('conta', '/ajustes/conta')}
        />
        <LinhaDeAjuste
          titulo="Login e segurança"
          explicacao="Como você entra, senha e sessão"
          onPress={() => ir('seguranca', '/ajustes/seguranca')}
        />
      </Bloco>

      <Grupo titulo="Preferências">
        <Bloco>
          <LinhaDeAjuste
            primeira
            titulo="Aparência"
            valor={temaLegivel}
            onPress={() => ir('aparencia', '/ajustes/aparencia')}
          />
          <LinhaDeAjuste
            titulo="Oportunidades"
            valor={preferencias.oportunidadesPausadas ? 'Pausado' : 'Recebendo'}
            onPress={() => ir('oportunidades', '/ajustes/oportunidades')}
          />
          {/* Idioma existe, mas não é escolha: só há um, de verdade. Uma linha
              que informa é honesta; um menu com uma opção seria teatro (§24). */}
          <LinhaDeValor titulo="Idioma" valor={IDIOMAS['pt-BR']} />
          {/* Notificações passaram a existir na Fase 06 — e a linha mostra o
              estado **do sistema**, não a preferência interna: é o que a
              pessoa quer saber sem entrar (§88). */}
          <LinhaDeAjuste
            titulo="Notificações"
            valor={frasePermissao[permissao]}
            onPress={() => ir('notificacoes', '/ajustes/notificacoes')}
          />
        </Bloco>
      </Grupo>

      <Grupo titulo="Privacidade">
        <Bloco>
          <LinhaDeAjuste
            primeira
            titulo="Privacidade"
            explicacao="O que aparece para os moradores"
            onPress={() => ir('privacidade', '/ajustes/privacidade')}
          />
          <LinhaDeAjuste
            titulo="Permissões do aparelho"
            explicacao="O que o aplicativo pede, e por quê"
            onPress={() => ir('permissoes', '/ajustes/permissoes')}
          />
        </Bloco>
      </Grupo>

      <Grupo titulo="Suporte">
        <Bloco>
          <LinhaDeAjuste
            primeira
            titulo="Ajuda e suporte"
            explicacao="Dúvidas frequentes e falar com a equipe"
            onPress={() => ir('ajuda', '/ajustes/ajuda')}
          />
        </Bloco>
      </Grupo>

      <Grupo titulo="Sobre">
        <Bloco>
          <LinhaDeAjuste
            primeira
            titulo={`Sobre o ${NOME_DO_APLICATIVO}`}
            valor={versao()}
            onPress={() => ir('sobre', '/ajustes/sobre')}
          />
          <LinhaDeAjuste
            titulo="Termos de Uso"
            externo
            onPress={() => void abrirDocumento('termos', links.termos)}
          />
          <LinhaDeAjuste
            titulo="Política de Privacidade"
            externo
            onPress={() => void abrirDocumento('privacidade', links.privacidade)}
          />
        </Bloco>
      </Grupo>

      {falhaDeLink ? (
        <View accessibilityLiveRegion="polite">
          <Nota tom="destaque">{falhaDeLink}</Nota>
        </View>
      ) : null}

      {/* Sair. Fácil de achar e longe do que se toca todo dia — e sem vermelho:
          encerrar a sessão não destrói nada (§49, §58). */}
      <Bloco>
        <LinhaDeAcao
          primeira
          titulo="Sair da conta"
          carregando={saindo}
          onPress={() => setConfirmandoSaida(true)}
        />
      </Bloco>

      <Text variant="caption" tone="faint" center maxScale={1.2} style={estilos.rodape}>
        {`${NOME_DO_APLICATIVO} ${versao()}`}
      </Text>

      <Sheet
        aberta={confirmandoSaida}
        titulo="Sair desta conta?"
        descricao="Você vai precisar entrar de novo com seu e-mail e senha. Seu perfil e suas oportunidades continuam onde estão."
        onFechar={() => setConfirmandoSaida(false)}
      >
        {/* Nenhum dos dois é o caminho feliz, então nenhum vem em verde cheio:
            um botão primário aqui daria a "sair" o brilho de uma conquista.
            Contorno e discreto — os dois igualmente fáceis de acertar, que é o
            oposto de esconder a saída (§92). */}
        <View style={estilos.acoesDaFolha}>
          <Button
            label="Sair da conta"
            variant="outline"
            onPress={() => {
              setConfirmandoSaida(false);
              void sair();
            }}
            haptic="commit"
          />
          <Button label="Continuar conectado" variant="quiet" onPress={() => setConfirmandoSaida(false)} />
        </View>
      </Sheet>

      {__DEV__ ? (
        <View style={[estilos.dev, { borderColor: colors.line }]}>
          <Text variant="overline" tone="faint" center>
            DESENVOLVIMENTO
          </Text>
          <Text variant="caption" tone="faint" center maxScale={1.1}>
            Esta área não existe no aplicativo publicado.
          </Text>
          <Button
            label="Ferramentas de desenvolvimento"
            variant="quiet"
            onPress={() => router.push('/ajustes/desenvolvimento')}
          />
        </View>
      ) : null}
    </TelaDeAjuste>
  );
}

const estilos = StyleSheet.create({
  rodape: { marginTop: -space.sm },
  acoesDaFolha: { gap: space.md },
  dev: {
    gap: space.sm,
    padding: space.lg,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
  },
});
