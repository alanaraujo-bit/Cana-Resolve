import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { TelaDeAjuste } from '@/ajustes/Tela';
import { registrarComercial } from '@/comercial/analytics';
import { useComercial } from '@/comercial/ComercialProvider';
import { LinhaDeCobranca } from '@/comercial/componentes';
import { space } from '@/theme';
import { Bloco, Nota, Text } from '@/ui';

/**
 * O histórico de cobrança.
 *
 * Três decisões, e as três são sobre o que **não** está aqui:
 *
 * 1. **Não é software contábil** (§63). Data, descrição, valor, estado. Sem
 *    filtro por período, sem exportação, sem gráfico de gastos — nada disso
 *    ajuda alguém que teve, no máximo, uma cobrança.
 *
 * 2. **Não há recibo inventado** (§64, §65). Quando o provedor oferecer um
 *    comprovante, ele aparece; enquanto não oferecer, a linha simplesmente não
 *    o menciona. Gerar um PDF com cara de documento fiscal seria produzir um
 *    documento falso — e a emissão de nota fiscal é uma dependência
 *    empresarial registrada em `BLOCKERS.md`, não um recurso a improvisar.
 *
 * 3. **Não depende de haver plano ativo** (§104). Esta tela abre em qualquer
 *    estado comercial, inclusive depois de o Beta terminar. É dinheiro que a
 *    pessoa pagou; ele pertence a ela.
 */
export default function Cobrancas() {
  const { cobrancas, cobrancasCarregando, cobrancasErro, carregarCobrancas } = useComercial();

  useEffect(() => {
    void carregarCobrancas();
  }, [carregarCobrancas]);

  useEffect(() => {
    if (!cobrancasCarregando && !cobrancasErro) {
      registrarComercial('billing_history_opened', { total: cobrancas.length });
    }
  }, [cobrancasCarregando, cobrancasErro, cobrancas.length]);

  return (
    <TelaDeAjuste titulo="Histórico de cobrança">
      {cobrancasCarregando ? (
        <View style={estilos.centro}>
          <ActivityIndicator />
        </View>
      ) : cobrancasErro ? (
        <Nota>{cobrancasErro.message}</Nota>
      ) : cobrancas.length === 0 ? (
        /* Vazio é um estado legítimo e frequente: a maioria dos parceiros
           entrou por conversa, e a primeira cobrança ainda vai acontecer. */
        <Nota>Nenhuma cobrança registrada até agora.</Nota>
      ) : (
        <Bloco>
          {cobrancas.map((c, i) => (
            <LinhaDeCobranca key={c.id} cobranca={c} primeira={i === 0} />
          ))}
        </Bloco>
      )}

      <View style={estilos.rodape}>
        <Text variant="caption" tone="faint" maxScale={1.2}>
          O Canaã Resolve não cobra comissão sobre os serviços que você realiza.
          O que aparece aqui é apenas a sua participação na rede.
        </Text>
      </View>
    </TelaDeAjuste>
  );
}

const estilos = StyleSheet.create({
  centro: { alignItems: 'center', paddingVertical: space['4xl'] },
  rodape: { paddingHorizontal: space.xs },
});
