/**
 * As folhas que explicam os sinais de confiança.
 *
 * Elas existem por causa de um parágrafo só, o §31: **um selo que o usuário não
 * consegue interpretar não é um sinal de confiança — é decoração**. Se a tela
 * escreve "Informações verificadas", precisa haver um lugar, a um toque, onde
 * está escrito o que exatamente foi conferido e o que aquilo não cobre.
 *
 * O mesmo vale para a média: "4,8 · 23 avaliações" é honesto, mas só é
 * *confiável* se o leitor puder descobrir de onde saíram aquelas 23. O §125
 * chama isso de diferencial, e é: quase nenhuma plataforma diz de onde vêm as
 * estrelas dela.
 *
 * Todo texto daqui obedece a duas regras:
 *
 * 1. **Só afirma regra que existe de verdade (§124).** Nada de "avaliações são
 *    moderadas por inteligência artificial" ou "verificamos antecedentes". O
 *    que ainda não existe é dito como o que ainda não existe.
 * 2. **Nunca promete resultado (§32, §119).** Não há "profissional garantido",
 *    "serviço garantido" nem "100% confiável" em lugar nenhum deste arquivo, e
 *    a frase que diz o contrário é obrigatória na folha de verificação.
 */

import { StyleSheet, View } from 'react-native';

import type { ItemDeVerificacao } from '@/perfil/tipos';
import { space, useTheme } from '@/theme';
import { Sheet, Text } from '@/ui';
import { ItemExplicado } from './componentes';
import {
  descricaoPublica,
  FUNDADOR_LIMITE,
  FUNDADOR_ROTULO,
  FUNDADOR_SIGNIFICADO,
  itensPublicos,
  limitePublico,
  NAO_E_GARANTIA,
  rotuloPublico,
} from './verificacao';

/* -------------------------------------------------------------------------- */
/*  Como funcionam as avaliações                                              */
/* -------------------------------------------------------------------------- */

/**
 * A resposta a "de onde vêm estas estrelas?" (§124, §125).
 *
 * Quatro pontos, e cada um descreve uma regra que este código realmente
 * implementa — a elegibilidade está em `elegibilidade.ts`, a resposta única em
 * `tipos.ts`, a moderação em `contaParaAMedia`. Se um dia uma dessas regras
 * mudar, este texto muda junto ou vira mentira.
 */
export function ComoFuncionam({ aberta, onFechar }: { aberta: boolean; onFechar: () => void }) {
  return (
    <Sheet
      aberta={aberta}
      titulo="Como funcionam as avaliações"
      descricao="Elas não são abertas ao público. Cada uma vem de um atendimento que aconteceu."
      onFechar={onFechar}
    >
      <View style={estilos.itens}>
        <ItemExplicado
          titulo="Quem pode avaliar"
          texto="Só o morador que pediu o serviço pelo Canaã Resolve, e só depois de você informar que o serviço foi realizado. Ninguém encontra seu perfil e deixa uma nota do nada."
        />
        <ItemExplicado
          titulo="Uma avaliação por atendimento"
          texto="O mesmo atendimento não vira duas notas. Se o morador mudar de ideia, ele corrige a avaliação que já existe, dentro de um prazo curto."
        />
        <ItemExplicado
          titulo="A média"
          texto="É a média simples das avaliações publicadas, com uma casa decimal, e vem sempre acompanhada de quantas são. Avaliações em análise ou removidas ficam de fora da conta."
        />
        <ItemExplicado
          titulo="Você pode responder"
          texto="Uma resposta por avaliação, pública, que você pode editar ou apagar. Responder não muda a nota — e não deveria mudar: quem avalia é quem foi atendido."
        />
        <ItemExplicado
          titulo="Conteúdo inadequado sai"
          texto="Ofensa, spam, dado pessoal exposto e avaliação que não corresponde a um serviço seu podem ser contestados e analisados por uma pessoa. Nota baixa legítima não é motivo de remoção."
        />
      </View>

      <Text variant="caption" tone="faint" maxScale={1.3}>
        O Canaã Resolve conecta moradores a profissionais da cidade e reúne os sinais que consegue
        reunir. Ele não executa o serviço nem responde pelo resultado dele.
      </Text>
    </Sheet>
  );
}

/* -------------------------------------------------------------------------- */
/*  O que foi verificado                                                      */
/* -------------------------------------------------------------------------- */

/**
 * O significado do selo de verificação (§31, §32).
 *
 * Mostra **apenas o que foi realmente confirmado** — nunca a lista dos três
 * tipos com dois em cinza, que sugeriria falta em vez de descrever o que
 * existe. E fecha com a frase do §32, que não é opcional.
 */
export function OQueFoiVerificado({
  aberta,
  onFechar,
  itens,
  fundador,
}: {
  aberta: boolean;
  onFechar: () => void;
  itens: readonly ItemDeVerificacao[];
  fundador: boolean;
}) {
  const { colors } = useTheme();
  const publicos = itensPublicos(itens);

  return (
    <Sheet
      aberta={aberta}
      titulo="O que o Canaã Resolve confere"
      descricao="Só aparece no seu perfil aquilo que foi realmente conferido."
      onFechar={onFechar}
    >
      {publicos.length > 0 ? (
        <View style={estilos.itens}>
          {publicos.map((item) => (
            <View key={item.tipo} style={estilos.verificado}>
              <ItemExplicado
                titulo={rotuloPublico[item.tipo]}
                texto={descricaoPublica[item.tipo]}
              />
              <Text variant="caption" tone="faint" maxScale={1.25}>
                {limitePublico[item.tipo]}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <Text variant="callout" tone="muted" maxScale={1.35}>
          Você ainda não tem nenhuma informação verificada. A verificação de parceiros ainda não
          está aberta — quando estiver, o que for conferido aparece aqui, com a descrição do que
          foi conferido.
        </Text>
      )}

      {fundador ? (
        <View style={[estilos.fundador, { borderTopColor: colors.line }]}>
          <ItemExplicado titulo={FUNDADOR_ROTULO} texto={FUNDADOR_SIGNIFICADO} />
          <Text variant="caption" tone="faint" maxScale={1.3}>
            {FUNDADOR_LIMITE}
          </Text>
        </View>
      ) : null}

      {/* §32 — obrigatória, e por isso fora de qualquer condicional. */}
      <Text variant="caption" tone="muted" maxScale={1.35}>
        {NAO_E_GARANTIA}
      </Text>
    </Sheet>
  );
}

const estilos = StyleSheet.create({
  itens: { gap: space.lg },
  verificado: { gap: space.xs },
  fundador: { gap: space.xs, paddingTop: space.lg, borderTopWidth: StyleSheet.hairlineWidth },
});
