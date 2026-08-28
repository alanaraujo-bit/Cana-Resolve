import { StyleSheet, View } from 'react-native';

import { registrar } from '@/ajustes/analytics';
import { LinhaDeAjuste, LinhaDeValor } from '@/ajustes/componentes';
import {
  build,
  EMPRESA,
  links,
  NOME_DO_APLICATIVO,
  sistemaLegivel,
  versao,
} from '@/ajustes/informacoes';
import { abrirExterno, TelaDeAjuste } from '@/ajustes/Tela';
import { gutter, space, useTheme } from '@/theme';
import { Bloco, BrandMark, Grupo, Text } from '@/ui';

/**
 * Sobre o Canaã Resolve.
 *
 * Marca, uma frase do que o aplicativo é, versão, e os dois documentos que
 * qualquer loja vai exigir que estejam a um toque de distância.
 *
 * **A Aionix aparece discreta.** Ela é quem constrói e mantém, e isso merece
 * estar escrito — em uma linha, no fim, do tamanho de um crédito. A marca desta
 * tela é o Canaã Resolve; transformar o "Sobre" em vitrine de quem desenvolveu
 * seria contar a história errada para quem usa (§95).
 */
export default function Sobre() {
  const { colors } = useTheme();
  const numeroDeBuild = build();

  const abrir = (destino: 'termos' | 'privacidade' | 'site', url: string) => {
    registrar({ nome: 'link_aberto', destino });
    void abrirExterno(url);
  };

  return (
    <TelaDeAjuste titulo="Sobre">
      <View style={estilos.marca}>
        <BrandMark size={56} pin={colors.brand} check={colors.accent} strokeWidth={1.7} />
        <Text variant="displayMD" center maxScale={1.2}>
          {NOME_DO_APLICATIVO}
        </Text>
        <Text variant="callout" tone="muted" center maxScale={1.3}>
          O jeito de encontrar quem resolve em Canaã dos Carajás — e, deste lado, de receber os
          pedidos de quem precisa do seu trabalho.
        </Text>
      </View>

      <Grupo titulo="Versão">
        <Bloco>
          <LinhaDeValor primeira titulo="Versão" valor={versao()} />
          {numeroDeBuild ? <LinhaDeValor titulo="Build" valor={numeroDeBuild} /> : null}
          <LinhaDeValor titulo="Sistema" valor={sistemaLegivel()} />
        </Bloco>
        <Text variant="caption" tone="faint" maxScale={1.25} style={estilos.dica}>
          Estas informações já vão escritas na mensagem quando você fala com o suporte pela Ajuda.
        </Text>
      </Grupo>

      <Grupo titulo="Documentos">
        <Bloco>
          <LinhaDeAjuste
            primeira
            titulo="Termos de Uso"
            externo
            onPress={() => abrir('termos', links.termos)}
          />
          <LinhaDeAjuste
            titulo="Política de Privacidade"
            externo
            onPress={() => abrir('privacidade', links.privacidade)}
          />
          <LinhaDeAjuste
            titulo="Site do Canaã Resolve"
            externo
            onPress={() => abrir('site', links.site)}
          />
        </Bloco>
      </Grupo>

      <Text variant="caption" tone="faint" center maxScale={1.25} style={estilos.credito}>
        {`${NOME_DO_APLICATIVO} é um produto do ecossistema ${EMPRESA}.`}
      </Text>
    </TelaDeAjuste>
  );
}

const estilos = StyleSheet.create({
  marca: {
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: gutter,
    paddingVertical: space.lg,
  },
  dica: { paddingHorizontal: space.xs },
  credito: { marginTop: space.sm },
});
