import { Stack } from 'expo-router';

import { useTheme } from '@/theme';

/**
 * A pilha das Configurações.
 *
 * Ela vive **fora** das abas, ao lado do detalhe da oportunidade, e não dentro
 * do Perfil. Duas razões, e nenhuma é estética:
 *
 * 1. **Conta não é Perfil.** O Perfil é a vitrine — nome comercial, serviços,
 *    área atendida, portfólio. A Conta é a entrada — e-mail de acesso, senha,
 *    sessão. Empilhar as Configurações dentro da aba do Perfil colocaria as
 *    duas no mesmo lugar e desfaria a separação que a Fase 04 estabeleceu.
 * 2. **Configurações não é lugar de ficar.** Tela cheia, sem a barra embaixo,
 *    é o que iOS e Android fazem: entra-se, resolve-se e volta-se. Uma quarta
 *    aba para isso seria dar a "Configurações" o mesmo peso diário que
 *    "Oportunidades" tem — e não tem.
 *
 * A entrada é uma linha no Perfil. É onde a pessoa já vai procurar, e não
 * custa uma aba.
 */
export default function PilhaDeAjustes() {
  const { reduceMotion } = useTheme();

  return (
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
  );
}
