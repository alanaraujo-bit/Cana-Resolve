import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { registrar } from '@/ajustes/analytics';
import { LinhaDeAlternador } from '@/ajustes/componentes';
import { TelaDeAjuste } from '@/ajustes/Tela';
import { usePreferencias } from '@/preferencias/PreferenciasProvider';
import { resumoDaPausa } from '@/preferencias/tipos';
import { space } from '@/theme';
import { Alternador, Bloco, Grupo, Nota, Text, haptics } from '@/ui';

/**
 * Preferências de oportunidades.
 *
 * Uma decisão só, e ela precisou passar pela pergunta que governa esta fase: *o
 * profissional realmente precisa controlar isso?* Pausar passou — férias,
 * agenda cheia, doença são reais e acontecem. Filtro por bairro, por valor
 * mínimo e por horário não passaram: já existem no Perfil (serviços, área
 * atendida) ou estreitariam o encontro antes de haver volume para saber se
 * ajudam (§25, §26).
 *
 * A pausa tem efeito visível de imediato: a Home passa a dizer que o
 * recebimento está pausado, em vez de "nenhuma oportunidade nova agora". É o
 * que impede alguém de esquecer que pausou e achar que o aplicativo secou
 * (§27).
 *
 * **O que ela ainda não faz.** Enquanto o servidor de oportunidades não estiver
 * ligado, a pausa vale neste aparelho — é dito na tela, com todas as letras,
 * como o Perfil já faz com o que edita sem servidor.
 */
export default function PreferenciasDeOportunidades() {
  const { preferencias, somenteNesteAparelho, pausarOportunidades } = usePreferencias();
  const [falha, setFalha] = useState<string | null>(null);

  const alternar = useCallback(
    async (pausar: boolean) => {
      setFalha(null);
      haptics.step();
      const deu = await pausarOportunidades(pausar);
      if (!deu) {
        setFalha('Não foi possível salvar esta preferência agora. Tente de novo.');
        return;
      }
      registrar({ nome: 'oportunidades_pausadas', pausadas: pausar });
    },
    [pausarOportunidades],
  );

  return (
    <TelaDeAjuste titulo="Oportunidades">
      <Grupo titulo="Recebimento">
        <Bloco>
          <LinhaDeAlternador primeira>
            <Alternador
              titulo="Pausar novas oportunidades"
              explicacao="Você para de receber novos pedidos até reativar. O que já está em andamento continua."
              valor={preferencias.oportunidadesPausadas}
              onChange={(v) => void alternar(v)}
            />
          </LinhaDeAlternador>
        </Bloco>

        {/* Quando está recebendo, o interruptor já diz tudo — repetir "você
            está recebendo" logo abaixo seria eco. Pausado, a linha ganha
            conteúdo novo: há quanto tempo. */}
        {preferencias.oportunidadesPausadas ? (
          <Text variant="caption" tone="accent" maxScale={1.25}>
            {resumoDaPausa(preferencias)}
          </Text>
        ) : null}
      </Grupo>

      {preferencias.oportunidadesPausadas ? (
        <Nota tom="destaque">
          Enquanto estiver pausado, seu perfil continua no ar e seu histórico continua inteiro.
          Pausar não é sair nem excluir a conta — é só parar de receber por enquanto.
        </Nota>
      ) : null}

      {somenteNesteAparelho ? (
        <Nota>
          Esta preferência está guardada neste aparelho. Ela passa a valer também no servidor quando
          a central de oportunidades estiver ligada.
        </Nota>
      ) : null}

      {falha ? (
        <View accessibilityLiveRegion="assertive">
          <Nota tom="destaque">{falha}</Nota>
        </View>
      ) : null}

      {/* Remissão, e não aviso: uma terceira caixa amarela na mesma tela faria
          todas parecerem decoração. */}
      <Text variant="caption" tone="faint" maxScale={1.25} style={estilos.remissao}>
        O que você atende — serviços, categoria e bairros — fica no Perfil, e é de lá que vem o
        encontro entre o pedido do morador e você.
      </Text>
    </TelaDeAjuste>
  );
}

const estilos = StyleSheet.create({
  remissao: { paddingHorizontal: space.xs },
});
