import { Redirect, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { LinhaDeAcao, LinhaDeValor } from '@/ajustes/componentes';
import { ROTA_DE_AJUSTES } from '@/ajustes/rota';
import { TelaDeAjuste } from '@/ajustes/Tela';
import { authConfig } from '@/auth/config';
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

const estilos = StyleSheet.create({
  nota: { paddingHorizontal: space.xs },
});
