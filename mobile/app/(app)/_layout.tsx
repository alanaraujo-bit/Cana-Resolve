import { Stack, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { FaixaDeAviso } from '@/notificacoes/componentes';
import { NotificacoesProvider, useNotificacoes } from '@/notificacoes/NotificacoesProvider';
import { CarteiraProvider } from '@/oportunidades/Carteira';
import { PreferenciasProvider } from '@/preferencias/PreferenciasProvider';
import { useTheme } from '@/theme';

/**
 * A área do profissional.
 *
 * Uma pilha com dois destinos: as abas do dia a dia, e a oportunidade aberta.
 * O detalhe fica **fora** das abas de propósito — ele é uma tela cheia, com a
 * própria ação principal na base, e precisa poder ser aberto por um link ou
 * por uma notificação sem passar pela lista.
 *
 * `canaaresolve://oportunidade/o1` já chega na tela certa, e desde a Fase 06 é
 * também para onde um Push aponta — a **mesma** tela, nunca uma segunda versão
 * do detalhe (§14).
 *
 * A carteira vive aqui, acima de tudo: a Home, a Central, o selo da aba e o
 * detalhe leem a mesma lista, e uma decisão tomada no detalhe aparece na Home
 * sem ninguém sincronizar nada.
 *
 * As preferências da conta vivem no mesmo lugar, pelo mesmo motivo: pausar o
 * recebimento é uma decisão tomada nas Configurações que precisa aparecer na
 * Home. Uma pausa que só se vê na tela onde foi ligada é uma armadilha.
 *
 * As notificações vêm por último de propósito: elas precisam da sessão, da
 * carteira (para o selo e para reler quando algo chega) e das preferências
 * (para saber o que a pessoa quer receber) — então moram dentro das três.
 *
 * A terceira porta desta pilha é `ajustes`, que fica fora das abas de propósito
 * — ver `ajustes/_layout.tsx`.
 */
export default function AreaProfissional() {
  const { reduceMotion } = useTheme();

  return (
    <CarteiraProvider>
      <PreferenciasProvider>
        <NotificacoesProvider>
          <View style={estilos.area}>
            <Stack
              screenOptions={{
                headerShown: false,
                // O fundo de marca é único e vive atrás da pilha inteira: sem
                // isto, a tela de detalhe pinta por cima dele.
                contentStyle: { backgroundColor: 'transparent' },
                animation: reduceMotion ? 'none' : 'slide_from_right',
                animationDuration: 300,
                // Voltar com o dedo é o gesto que se espera de uma tela
                // empilhada.
                gestureEnabled: !reduceMotion,
              }}
            >
              <Stack.Screen name="(abas)" />
              <Stack.Screen name="oportunidade/[id]" />
              <Stack.Screen name="ajustes" />
            </Stack>

            {/* Acima da pilha, e não dentro de uma tela: um aviso que chega
                enquanto o Perfil está aberto precisa aparecer ali também. */}
            <AvisoFlutuante />
          </View>
        </NotificacoesProvider>
      </PreferenciasProvider>
    </CarteiraProvider>
  );
}

/**
 * A faixa do §25, ligada ao que o provider recebeu.
 *
 * Ela oferece o caminho; quem anda é a pessoa. Tocar em "Ver" navega **porque
 * houve um toque** — nunca porque um aviso chegou (§24).
 */
function AvisoFlutuante() {
  const { recebido, dispensarRecebido } = useNotificacoes();
  const router = useRouter();

  if (!recebido) return null;

  const { carga, rota } = recebido;
  const titulo =
    carga.tipo === 'oportunidade.nova' ? 'Nova oportunidade' : 'Uma oportunidade foi atualizada';

  return (
    <FaixaDeAviso
      titulo={titulo}
      // Nenhum detalhe do pedido aqui: a faixa segue a mesma régua da tela
      // bloqueada (§10). Quem quiser saber, abre.
      texto="Toque em Ver para abrir."
      acao={rota ? 'Ver' : undefined}
      onAcao={
        rota
          ? () => {
              dispensarRecebido();
              router.push(rota as never);
            }
          : undefined
      }
      onDispensar={dispensarRecebido}
    />
  );
}

const estilos = StyleSheet.create({
  area: { flex: 1 },
});
