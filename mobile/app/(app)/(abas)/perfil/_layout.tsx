import { Stack } from 'expo-router';

import { PerfilProvider } from '@/perfil/PerfilProvider';
import { ReputacaoProvider } from '@/reputacao/ReputacaoProvider';
import { useTheme } from '@/theme';

/**
 * A pilha do Perfil, dentro da aba.
 *
 * O Perfil não é uma tela só: é um lugar com uma capa e várias seções curtas.
 * Empilhar dentro da aba — em vez de abrir tela cheia por fora — é o que
 * mantém a barra principal no lugar e o caminho de volta óbvio: cada seção
 * volta para a capa, e a capa continua sendo a aba.
 *
 * Cada seção é uma rota de verdade (`/perfil/servicos`, `/perfil/previa`), e
 * não um modal anônimo: assim elas têm endereço, voltar previsível e o dia de
 * um link direto não pede reescrita.
 *
 * O perfil vive aqui, acima de todas as seções: a capa, cada edição e a prévia
 * leem o mesmo objeto, e o que uma salva a outra já enxerga.
 *
 * **A reputação (Fase 07) vive ao lado dele, e não dentro.** São duas fontes de
 * estado porque são dois carregamentos: o perfil é do parceiro e chega junto; as
 * avaliações são de terceiros, paginadas, e podem falhar sozinhas. Aninhá-las
 * num objeto só faria uma falha de rede nas avaliações derrubar a tela onde o
 * parceiro edita o próprio telefone — que é exatamente o que o §105 proíbe.
 *
 * É também por viver aqui que `/perfil/avaliacoes/[id]` é uma rota **desta**
 * pilha, e não uma rota de topo como `oportunidade/[id]`: um deep link que
 * abrisse aquela tela fora deste provedor estouraria, e o caso mais provável de
 * isso acontecer — um push tocado com o aplicativo frio — é justamente o que a
 * fase precisa entregar funcionando.
 */
export default function PilhaDoPerfil() {
  const { reduceMotion } = useTheme();

  return (
    <PerfilProvider>
      <ReputacaoProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            // O fundo de marca é único e vive atrás de tudo.
            contentStyle: { backgroundColor: 'transparent' },
            animation: reduceMotion ? 'none' : 'slide_from_right',
            animationDuration: 280,
            gestureEnabled: !reduceMotion,
          }}
        />
      </ReputacaoProvider>
    </PerfilProvider>
  );
}
