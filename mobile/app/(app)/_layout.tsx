import { Stack } from 'expo-router';

import { CarteiraProvider } from '@/oportunidades/Carteira';
import { useTheme } from '@/theme';

/**
 * A área do profissional.
 *
 * Uma pilha com dois destinos: as abas do dia a dia, e a oportunidade aberta.
 * O detalhe fica **fora** das abas de propósito — ele é uma tela cheia, com a
 * própria ação principal na base, e precisa poder ser aberto por um link ou
 * por uma notificação sem passar pela lista.
 *
 * `canaaresolve://oportunidade/o1` já chega na tela certa; a Fase de Push só
 * vai precisar apontar para cá.
 *
 * A carteira vive aqui, acima de tudo: a Home, a Central, o selo da aba e o
 * detalhe leem a mesma lista, e uma decisão tomada no detalhe aparece na Home
 * sem ninguém sincronizar nada.
 */
export default function AreaProfissional() {
  const { reduceMotion } = useTheme();

  return (
    <CarteiraProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          // O fundo de marca é único e vive atrás da pilha inteira: sem isto, a
          // tela de detalhe pinta por cima dele.
          contentStyle: { backgroundColor: 'transparent' },
          animation: reduceMotion ? 'none' : 'slide_from_right',
          animationDuration: 300,
          // Voltar com o dedo é o gesto que se espera de uma tela empilhada.
          gestureEnabled: !reduceMotion,
        }}
      >
        <Stack.Screen name="(abas)" />
        <Stack.Screen name="oportunidade/[id]" />
      </Stack>
    </CarteiraProvider>
  );
}
