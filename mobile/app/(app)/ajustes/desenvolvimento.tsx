import { Redirect, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { LinhaDeAcao, LinhaDeValor } from '@/ajustes/componentes';
import { ROTA_DE_AJUSTES } from '@/ajustes/rota';
import { TelaDeAjuste } from '@/ajustes/Tela';
import { authConfig } from '@/auth/config';
import { responderConvite } from '@/notificacoes/convite';
import { esquecerInstalacao } from '@/notificacoes/instalacao';
import {
  useNotificacoes,
  type EstadoDoRegistro,
} from '@/notificacoes/NotificacoesProvider';
import { projectId, type Disponibilidade } from '@/notificacoes/sistema';
import { frasePermissao } from '@/notificacoes/tipos';
import { useSession } from '@/session/SessionProvider';
import { space } from '@/theme';
import { Bloco, Grupo, Nota, Text } from '@/ui';

/**
 * Ferramentas de desenvolvimento.
 *
 * Elas existiam espalhadas — rever o onboarding na tela de entrar, trocar o
 * cenário de exemplo no Perfil — e agora têm um lugar. Um lugar que **não
 * existe no aplicativo publicado**: o `Redirect` abaixo fecha a rota fora de
 * `__DEV__`, e o pacote de produção nem chega a montar a tela.
 *
 * Configurações de desenvolvedor não pertencem à experiência de quem usa o
 * produto (§59, §60). O que fica visível aqui é ambiente e estado de
 * configuração — nunca token, nunca segredo, nunca o conteúdo de uma variável
 * sensível: só se ela está preenchida ou não.
 */
export default function Desenvolvimento() {
  const router = useRouter();
  const { replayOnboarding, account, token } = useSession();
  const { onde, permissao, registro } = useNotificacoes();

  if (!__DEV__) return <Redirect href={ROTA_DE_AJUSTES} />;

  return (
    <TelaDeAjuste titulo="Desenvolvimento">
      <Nota tom="destaque">
        Esta área existe apenas durante o desenvolvimento e não faz parte do aplicativo publicado.
      </Nota>

      <Grupo titulo="Ambiente">
        <Bloco>
          <LinhaDeValor
            primeira
            titulo="API de autenticação"
            valor={authConfig.apiBaseUrl ? 'Configurada' : 'Não configurada'}
          />
          <LinhaDeValor
            titulo="API de dados"
            valor={authConfig.dataApiBaseUrl ? 'Configurada' : 'Não configurada'}
            explicacao="Vazia: oportunidades e perfil usam exemplos declarados."
          />
          <LinhaDeValor
            titulo="Sessão"
            valor={account?.origem === 'servidor' ? 'Autenticada no servidor' : 'Atalho local'}
            explicacao={token ? 'Com credencial guardada.' : 'Sem credencial.'}
          />
        </Bloco>
      </Grupo>

      {/* Notificações. Aqui aparece o **estado**, e nunca o endereço de
          entrega: o token de push não vai para a tela nem para o console, nem
          em desenvolvimento (§54, §96). Quem precisa dele é o servidor. */}
      <Grupo titulo="Notificações">
        <Bloco>
          <LinhaDeValor
            primeira
            titulo="Ambiente"
            valor={frasesDeAmbiente[onde]}
            explicacao="Push remoto só existe na build de desenvolvimento, em aparelho real."
          />
          <LinhaDeValor titulo="Permissão do sistema" valor={frasePermissao[permissao]} />
          <LinhaDeValor titulo="Registro do aparelho" valor={frasesDeRegistro[registro]} />
          <LinhaDeValor
            titulo="Identificação da build"
            valor={projectId() ? 'Configurada' : 'Ausente'}
            explicacao="Sem ela, o serviço da Expo não emite token. Ver BLOCKERS.md."
          />
        </Bloco>
      </Grupo>

      <Grupo titulo="Atalhos">
        <Bloco>
          <LinhaDeAcao
            primeira
            titulo="Rever a apresentação"
            explicacao="Volta o aplicativo ao primeiro acesso"
            onPress={() => {
              void replayOnboarding();
              router.dismissAll();
            }}
          />
          <LinhaDeAcao
            titulo="Convidar de novo para as notificações"
            explicacao="Esquece a resposta e faz o convite reaparecer na Home"
            onPress={() => void responderConvite.esquecer()}
          />
          <LinhaDeAcao
            titulo="Esquecer esta instalação"
            explicacao="O próximo registro entra como um aparelho novo no servidor"
            onPress={() => void esquecerInstalacao()}
          />
        </Bloco>
      </Grupo>

      <View style={estilos.nota}>
        <Text variant="caption" tone="faint" maxScale={1.2}>
          O cenário de exemplos do Perfil e da carteira continua sendo trocado dentro de cada área,
          onde o efeito é visível.
        </Text>
      </View>
    </TelaDeAjuste>
  );
}

const frasesDeAmbiente: Record<Disponibilidade, string> = {
  pronta: 'Build de desenvolvimento, em aparelho',
  'expo-go': 'Expo Go — sem push remoto',
  'sem-aparelho': 'Simulador — sem push',
  'sem-projeto': 'Sem identificação de build',
  web: 'Navegador — sem push',
};

const frasesDeRegistro: Record<EstadoDoRegistro, string> = {
  ocioso: 'Não tentado',
  registrando: 'Registrando…',
  registrado: 'Registrado no servidor',
  'sem-permissao': 'Aguardando permissão',
  indisponivel: 'Não se aplica aqui',
  falhou: 'Falhou',
};

const estilos = StyleSheet.create({
  nota: { paddingHorizontal: space.xs },
});
