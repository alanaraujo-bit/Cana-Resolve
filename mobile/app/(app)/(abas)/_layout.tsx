import { Tabs } from 'expo-router';

import { BarraPrincipal } from '@/navigation/BarraPrincipal';

/**
 * Os três destinos de uso diário. Nada de abas para "ajustes", "ajuda" ou
 * "sobre": isso mora dentro do Perfil. A troca entre abas não tem animação de
 * propósito — é o gesto mais repetido do aplicativo e precisa ser instantâneo.
 */
export default function Abas() {
  return (
    <Tabs
      tabBar={(props) => <BarraPrincipal {...props} />}
      screenOptions={{
        headerShown: false,
        animation: 'none',
        sceneStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Tabs.Screen name="inicio" options={{ title: 'Início' }} />
      <Tabs.Screen name="oportunidades" options={{ title: 'Oportunidades' }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil' }} />
    </Tabs>
  );
}
