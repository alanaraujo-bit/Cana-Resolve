import { Stack } from 'expo-router';

import { PerfilProvider } from '@/perfil/PerfilProvider';
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
 */
export default function PilhaDoPerfil() {
  const { reduceMotion } = useTheme();

  return (
    <PerfilProvider>
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
    </PerfilProvider>
  );
}
