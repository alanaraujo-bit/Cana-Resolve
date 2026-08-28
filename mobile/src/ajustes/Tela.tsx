/**
 * A moldura das telas de Configurações.
 *
 * Existe para que nenhuma delas precise lembrar de safe area, de rolagem, de
 * respiro na base ou de como se volta — nove telas repetindo isso à mão seria
 * nove chances de esquecer uma. O cabeçalho é o mesmo do Perfil, promovido para
 * a fundação na Fase 05.
 *
 * O respiro inferior soma `insets.bottom` porque estas telas ficam **fora** das
 * abas: não há barra embaixo, mas há indicador de Home.
 */

import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Linking, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ROTA_DE_AJUSTES } from './rota';
import { gutter, space } from '@/theme';
import { CabecalhoDeTela } from '@/ui';

export function TelaDeAjuste({
  titulo,
  children,
  direita,
}: {
  titulo: string;
  children: ReactNode;
  direita?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const voltar = () => {
    // `canGoBack` importa: aberta por link, a tela não tem para onde voltar, e
    // um `back()` seco deixaria a pessoa presa.
    if (router.canGoBack()) router.back();
    else router.replace(ROTA_DE_AJUSTES);
  };

  return (
    <View style={[estilos.tela, { paddingTop: insets.top + space.sm }]}>
      <CabecalhoDeTela titulo={titulo} aoVoltar={voltar} direita={direita} />
      <ScrollView
        style={estilos.rolagem}
        contentContainerStyle={[
          estilos.conteudo,
          { paddingBottom: insets.bottom + space['4xl'] },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
      >
        {children}
      </ScrollView>
    </View>
  );
}

/**
 * Abre um endereço fora do aplicativo.
 *
 * Devolve `false` quando não deu — e a tela precisa dizer isso. Um link que não
 * abre e não avisa é pior que um link ausente: a pessoa toca de novo, e de
 * novo, achando que errou a mira (§48).
 */
export async function abrirExterno(url: string): Promise<boolean> {
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Abre as Configurações do sistema, para consertar uma permissão negada de vez.
 *
 * Na web não existe esse lugar — e é justamente onde este código é conferido —,
 * então a resposta é `false` e a tela explica o que fazer em vez de estourar
 * (§35).
 */
export async function abrirAjustesDoSistema(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    await Linking.openSettings();
    return true;
  } catch {
    return false;
  }
}

const estilos = StyleSheet.create({
  tela: { flex: 1 },
  rolagem: { flex: 1 },
  conteudo: { paddingHorizontal: gutter, paddingTop: space.lg, gap: space.xl },
});
