import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { registrar } from '@/ajustes/analytics';
import { LinhaDeAjuste, LinhaDeValor } from '@/ajustes/componentes';
import { links } from '@/ajustes/informacoes';
import { abrirExterno, TelaDeAjuste } from '@/ajustes/Tela';
import { space } from '@/theme';
import { Bloco, Grupo, Nota, Text } from '@/ui';

/**
 * Privacidade.
 *
 * O que ela **é**: entender o que os moradores veem, o que só aparece depois de
 * você aceitar uma oportunidade, e o que nunca sai daqui.
 *
 * O que ela **não é**: a Política de Privacidade. Aquilo é documento jurídico,
 * mora no site e está linkado no fim — misturar os dois transformaria esta tela
 * em contrato e o contrato em resumo, e nenhum dos dois cumpriria o papel
 * (§29, §30).
 *
 * Também não é um segundo formulário: nada se edita aqui. Quem muda o que
 * aparece é o Perfil, e uma cópia dos mesmos campos em duas telas viraria duas
 * verdades diferentes sobre a mesma coisa (§31).
 */
export default function Privacidade() {
  const router = useRouter();

  return (
    <TelaDeAjuste titulo="Privacidade">
      <View style={estilos.abertura}>
        <Text variant="body" tone="muted" maxScale={1.3}>
          O Canaã Resolve mostra ao morador o suficiente para ele confiar em você — e nada além
          disso.
        </Text>
      </View>

      <Grupo titulo="O morador vê">
        <Bloco>
          <LinhaDeValor
            primeira
            titulo="Seu perfil público"
            valor="Nome, ofício, serviços, área atendida, horário e fotos"
            explicacao="É o que aparece quando alguém procura um profissional."
          />
        </Bloco>
      </Grupo>

      <Grupo titulo="Só depois que você aceita">
        <Bloco>
          <LinhaDeValor
            primeira
            titulo="Seu telefone"
            valor="Entregue ao morador quando você demonstra interesse"
            explicacao="Antes disso, ele não sai do aplicativo."
          />
        </Bloco>
        <Nota>
          O caminho vale nos dois sentidos: o telefone de quem pediu também só chega até você depois
          que você aceita a oportunidade.
        </Nota>
      </Grupo>

      <Grupo titulo="Nunca aparece">
        <Bloco>
          <LinhaDeValor
            primeira
            titulo="Seu e-mail de acesso"
            explicacao="Serve para entrar no aplicativo, e só."
          />
          <LinhaDeValor
            titulo="Sua senha"
            explicacao="Guardada de forma que nem nós conseguimos ler."
          />
          <LinhaDeValor
            titulo="O nome do responsável"
            explicacao="Quando a conta é de uma empresa, ele fica só no cadastro."
          />
        </Bloco>
      </Grupo>

      <Grupo titulo="Onde mudar">
        <Bloco>
          <LinhaDeAjuste
            primeira
            titulo="Ver e editar meu perfil público"
            explicacao="No Perfil, com a prévia de como o morador vê"
            onPress={() => router.navigate('/perfil')}
          />
          <LinhaDeAjuste
            titulo="Política de Privacidade"
            explicacao="O documento completo, no site"
            externo
            onPress={() => {
              registrar({ nome: 'link_aberto', destino: 'privacidade' });
              void abrirExterno(links.privacidade);
            }}
          />
        </Bloco>
      </Grupo>
    </TelaDeAjuste>
  );
}

const estilos = StyleSheet.create({
  abertura: { paddingHorizontal: space.xs },
});
