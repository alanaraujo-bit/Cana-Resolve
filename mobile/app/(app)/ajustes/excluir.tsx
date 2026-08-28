import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { registrar } from '@/ajustes/analytics';
import { linkDoSuporte, suporte } from '@/ajustes/informacoes';
import { abrirExterno, TelaDeAjuste } from '@/ajustes/Tela';
import { radius, space, useTheme } from '@/theme';
import { Bloco, Button, Grupo, Nota, Text } from '@/ui';

/**
 * Excluir minha conta.
 *
 * Duas coisas precisam ficar absolutamente claras nesta tela, e elas puxam em
 * direções opostas.
 *
 * A primeira: **excluir não é sair**. Sair encerra a sessão e você volta quando
 * quiser. Excluir remove a conta. As duas nunca podem parecer a mesma coisa, e
 * é por isso que esta ação mora aqui dentro, em uma tela própria, e não numa
 * linha ao lado de "Sair" (§54).
 *
 * A segunda: **não pode ser difícil de achar**. Esconder a saída é um padrão
 * escuro, e a Fase 05 proíbe explicitamente (§92). O caminho é curto:
 * Configurações › Dados da conta › Excluir minha conta.
 *
 * **Por que o pedido passa pela equipe.** Não existe rota de exclusão no
 * servidor, e não vai existir uma falsa aqui: apagar a sessão local e dizer
 * "conta excluída" seria mentira — a conta continuaria no banco, o perfil no
 * ar, e a pessoa acharia que resolveu. Enquanto o caminho automático não
 * existir, o pedido vai pelo canal oficial, onde uma pessoa responde e executa.
 * O que falta para automatizar está no `BLOCKERS.md`: uma decisão de política
 * sobre o que acontece com o histórico de oportunidades já encerradas, que
 * envolve o morador do outro lado e não é só técnica.
 */
export default function ExcluirConta() {
  const { colors } = useTheme();
  const [falha, setFalha] = useState<string | null>(null);

  useEffect(() => {
    registrar({ nome: 'exclusao_consultada' });
  }, []);

  const pedir = async () => {
    const abriu = await abrirExterno(linkDoSuporte('exclusao'));
    if (!abriu) {
      setFalha(
        `Não foi possível abrir o WhatsApp. Fale com a equipe pelo ${suporte.whatsappLegivel} ou por ${suporte.email}.`,
      );
    }
  };

  return (
    <TelaDeAjuste titulo="Excluir minha conta">
      <View
        style={[estilos.aviso, { backgroundColor: colors.dangerSoft, borderColor: colors.danger }]}
      >
        <Text variant="bodyStrong" tone="danger" maxScale={1.25}>
          A exclusão é definitiva.
        </Text>
        <Text variant="callout" tone="muted" maxScale={1.3}>
          Não é o mesmo que sair da conta. Ao sair, você volta quando quiser com o mesmo e-mail e
          senha; ao excluir, sua conta de parceiro deixa de existir.
        </Text>
      </View>

      <Grupo titulo="O que acontece">
        <Bloco>
          <View style={estilos.item}>
            <Text variant="bodyStrong" maxScale={1.25}>
              Seu perfil sai do ar
            </Text>
            <Text variant="callout" tone="muted" maxScale={1.3}>
              Você deixa de aparecer para quem procura profissionais em Canaã dos Carajás.
            </Text>
          </View>
          <View style={[estilos.item, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line }]}>
            <Text variant="bodyStrong" maxScale={1.25}>
              Você para de receber oportunidades
            </Text>
            <Text variant="callout" tone="muted" maxScale={1.3}>
              Se a ideia é só dar uma pausa, não precisa excluir: em Oportunidades você pausa o
              recebimento e volta depois, com tudo no lugar.
            </Text>
          </View>
          <View style={[estilos.item, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line }]}>
            <Text variant="bodyStrong" maxScale={1.25}>
              Alguns registros permanecem
            </Text>
            <Text variant="callout" tone="muted" maxScale={1.3}>
              Atendimentos já encerrados envolvem também o morador que pediu, e ficam guardados pelo
              tempo que a lei exige. Eles deixam de estar ligados ao seu perfil público.
            </Text>
          </View>
        </Bloco>
      </Grupo>

      <Grupo titulo="Como pedir">
        <Nota>
          O pedido de exclusão é feito pela equipe do Canaã Resolve. Você fala pelo WhatsApp, a
          gente confirma que é você e executa — e avisa quando estiver concluído.
        </Nota>
        <Button
          label="Pedir exclusão da conta"
          variant="outline"
          onPress={() => void pedir()}
          accessibilityHint="Abre o WhatsApp com a mensagem escrita. Nada é enviado sozinho."
        />
      </Grupo>

      {falha ? (
        <View accessibilityLiveRegion="polite">
          <Nota tom="destaque">{falha}</Nota>
        </View>
      ) : null}
    </TelaDeAjuste>
  );
}

const estilos = StyleSheet.create({
  aviso: {
    gap: space.sm,
    padding: space.lg,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  item: { gap: 2, paddingHorizontal: space.lg, paddingVertical: space.lg },
});
