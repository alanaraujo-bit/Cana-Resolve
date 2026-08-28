import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { LinhaDeAcao, LinhaDeAjuste, LinhaDeValor } from '@/ajustes/componentes';
import { TelaDeAjuste } from '@/ajustes/Tela';
import { useSession } from '@/session/SessionProvider';
import { space } from '@/theme';
import { Bloco, Grupo, Nota, Text } from '@/ui';

/**
 * Dados da conta.
 *
 * Ela responde uma pergunta só: **qual conta eu estou usando?** E-mail de
 * acesso, nome e tipo. Nada de nome comercial, serviços, bairros ou telefone
 * público — isso é Perfil, mora em outra aba e se edita lá. A frase no rodapé
 * existe justamente para quem chegou aqui procurando aquilo.
 *
 * **Por que o e-mail não se edita.** Trocar o e-mail de acesso é uma operação
 * de segurança: exige confirmar o endereço novo antes de valer, ou uma conta se
 * perde com um dedo errado. O servidor ainda não tem esse caminho — e uma tela
 * que abre um formulário para depois dizer "não deu" seria pior do que a
 * verdade escrita aqui. O contrato está no `AJUSTES.md`.
 */
export default function DadosDaConta() {
  const router = useRouter();
  const { account } = useSession();

  const tipoDeConta = account?.papel === 'profissional' ? 'Parceiro profissional' : 'Morador';

  return (
    <TelaDeAjuste titulo="Dados da conta">
      <Grupo titulo="Acesso">
        <Bloco>
          <LinhaDeValor
            primeira
            titulo="E-mail de acesso"
            valor={account?.email ?? 'Não informado'}
            explicacao={
              account?.email
                ? 'É por ele que você entra no aplicativo.'
                : 'Esta conta ainda não tem e-mail cadastrado. Fale com a equipe para incluir um.'
            }
          />
          <LinhaDeValor titulo="Nome" valor={account?.nome || 'Não informado'} />
          <LinhaDeValor titulo="Tipo de conta" valor={tipoDeConta} />
        </Bloco>
        <Nota>
          A troca do e-mail de acesso ainda não está disponível no aplicativo — ela precisa
          confirmar o endereço novo antes de valer. Se precisar mudar, fale com a equipe do Canaã
          Resolve pela Ajuda.
        </Nota>
      </Grupo>

      <Grupo titulo="Segurança">
        <Bloco>
          <LinhaDeAjuste
            primeira
            titulo="Login e segurança"
            explicacao="Como você entra, senha e sessão"
            onPress={() => router.push('/ajustes/seguranca')}
          />
        </Bloco>
      </Grupo>

      {/* A separação, dita uma vez, onde ela costuma confundir. */}
      <View style={estilos.remissao}>
        <Text variant="caption" tone="faint" maxScale={1.25}>
          Nome comercial, serviços, área atendida, fotos e contatos que os moradores veem ficam no
          Perfil.
        </Text>
      </View>

      <Grupo titulo="Encerrar">
        <Bloco>
          <LinhaDeAcao
            primeira
            titulo="Excluir minha conta"
            explicacao="Entenda o que acontece antes de pedir"
            tom="perigo"
            onPress={() => router.push('/ajustes/excluir')}
          />
        </Bloco>
      </Grupo>
    </TelaDeAjuste>
  );
}

const estilos = StyleSheet.create({
  remissao: { paddingHorizontal: space.xs, marginTop: -space.sm },
});
