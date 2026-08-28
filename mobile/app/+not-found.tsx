import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSession } from '@/session/SessionProvider';
import { gutter, space } from '@/theme';
import { Button, Text } from '@/ui';

/**
 * Um endereço que o aplicativo não conhece.
 *
 * Ele existe por causa do §71, e foi encontrado olhando o produto: abrir
 * `canaaresolve://coisa/que/nao/existe` mostrava a tela crua do roteador —
 * "Unmatched Route · Page could not be found", com a URL inteira e um link
 * para o sitemap. É uma tela de ferramenta, escrita em inglês, dentro de um
 * produto em português usado por um eletricista de Canaã dos Carajás.
 *
 * A diferença entre esta tela e `notificacoes/destino.ts` é a fronteira que
 * cada um guarda: o `destino` recusa uma rota **antes** de navegar, e por isso
 * um push malformado nunca chega aqui. Esta tela é para o que entra por fora
 * do aplicativo — um link velho, um endereço digitado, um Universal Link do
 * futuro apontando para uma página que ainda não existe.
 *
 * Ela não explica o que deu errado, porque a pessoa não pode fazer nada com
 * essa informação. Ela oferece a saída.
 */
export default function NaoEncontrado() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { stage } = useSession();

  const voltar = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    // Aberta por link, não há para onde voltar. O porteiro decide o destino a
    // partir da sessão — esta tela não sabe, e não deve saber, se existe uma.
    router.replace(stage === 'autenticado' ? '/inicio' : '/');
  };

  return (
    <View
      style={[
        estilos.tela,
        { paddingTop: insets.top + space['4xl'], paddingBottom: insets.bottom + space.xl },
      ]}
    >
      <View style={estilos.conteudo}>
        <Text variant="displayMD" center maxScale={1.3}>
          Não conseguimos abrir este conteúdo
        </Text>
        <Text variant="body" tone="muted" center maxScale={1.35}>
          O link pode ter expirado ou apontar para algo que não está mais no aplicativo.
        </Text>
      </View>

      <Button label="Voltar" onPress={voltar} />
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, paddingHorizontal: gutter, justifyContent: 'center', gap: space['2xl'] },
  conteudo: { gap: space.sm },
});
