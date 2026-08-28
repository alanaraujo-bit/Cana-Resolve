import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { registrar } from '@/ajustes/analytics';
import { LinhaDeAcao } from '@/ajustes/componentes';
import { informacoesTecnicas, linkDoSuporte, suporte } from '@/ajustes/informacoes';
import { abrirExterno, TelaDeAjuste } from '@/ajustes/Tela';
import { motion, space, useTheme } from '@/theme';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Bloco, ChevronRightIcon, Grupo, Nota, Text } from '@/ui';

/**
 * Ajuda e suporte.
 *
 * Pequena de propósito. Uma central de ajuda com quarenta artigos escritos
 * antes de existirem quarenta dúvidas é ficção — as perguntas abaixo são as que
 * a operação realmente ouve hoje, e crescem quando novas aparecerem (§39, §40).
 *
 * O contato é o canal que o Canaã Resolve já usa: WhatsApp. Sem chat interno
 * nesta fase — construir um significaria alguém do outro lado para atender, e
 * esse alguém já está no WhatsApp (§41, §42).
 *
 * A mensagem vai **preenchida e não enviada**. Quem aperta enviar é a pessoa.
 */

const perguntas: { pergunta: string; resposta: string }[] = [
  {
    pergunta: 'Como recebo oportunidades?',
    resposta:
      'Quando um morador pede um serviço da sua categoria na sua área de atendimento, o pedido aparece na aba Oportunidades. Quanto mais completo o seu perfil, mais fácil o encontro.',
  },
  {
    pergunta: 'Quando o morador vê meu telefone?',
    resposta:
      'Só depois que você demonstra interesse na oportunidade. Antes disso, seu número não sai do aplicativo — e o dele também não chega até você.',
  },
  {
    // §124 da Fase 07. Cada frase aqui descreve uma regra que o código
    // realmente aplica — a elegibilidade em `reputacao/elegibilidade.ts`, a
    // resposta única e a moderação em `reputacao/tipos.ts`. Se uma delas mudar,
    // este texto muda junto ou vira mentira.
    pergunta: 'Como funcionam as avaliações?',
    resposta:
      'Só quem foi atendido por você pelo Canaã Resolve pode avaliar, e só depois que o serviço for dado como realizado. Cada atendimento vira no máximo uma avaliação. Você pode responder uma vez a cada uma, e pode contestar o que estiver errado — contestar não apaga a avaliação: ela fica em análise até uma pessoa decidir. Nota baixa legítima não é motivo de remoção.',
  },
  {
    pergunta: 'Vou ficar um tempo sem atender. E agora?',
    resposta:
      'Em Configurações › Oportunidades, você pausa o recebimento de novos pedidos. Seu perfil continua no ar e é só reativar quando voltar.',
  },
  {
    pergunta: 'Esqueci minha senha.',
    resposta:
      'A recuperação pelo aplicativo ainda está em preparação. Fale com a equipe pelo WhatsApp que a gente resolve com você.',
  },
  {
    pergunta: 'Quero mudar meu e-mail de acesso.',
    resposta:
      'Essa troca ainda é feita pela equipe, porque o endereço novo precisa ser confirmado antes de valer. Chame no WhatsApp.',
  },
];

export default function Ajuda() {
  const { colors, reduceMotion } = useTheme();
  const [aberta, setAberta] = useState<number | null>(null);
  const [falha, setFalha] = useState<string | null>(null);

  const abrirSuporte = async (assunto: 'ajuda' | 'problema') => {
    registrar({ nome: 'link_aberto', destino: 'suporte' });
    const abriu = await abrirExterno(linkDoSuporte(assunto));
    if (!abriu) {
      setFalha(`Não foi possível abrir o WhatsApp. O número é ${suporte.whatsappLegivel}.`);
    }
  };

  return (
    <TelaDeAjuste titulo="Ajuda e suporte">
      <Grupo titulo="Dúvidas frequentes">
        <Bloco>
          {perguntas.map((item, i) => {
            const expandida = aberta === i;
            return (
              <Pressable
                key={item.pergunta}
                onPress={() => setAberta(expandida ? null : i)}
                accessibilityRole="button"
                accessibilityLabel={item.pergunta}
                accessibilityState={{ expanded: expandida }}
                style={({ pressed }) => [
                  estilos.pergunta,
                  i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
                  pressed && { backgroundColor: colors.pressOverlay },
                ]}
              >
                <View style={estilos.perguntaLinha}>
                  <Text variant="bodyStrong" maxScale={1.25} style={estilos.perguntaTexto}>
                    {item.pergunta}
                  </Text>
                  <View style={expandida ? estilos.setaAberta : undefined}>
                    <ChevronRightIcon color={colors.faint} />
                  </View>
                </View>
                {expandida ? (
                  <Animated.View
                    entering={reduceMotion ? undefined : FadeIn.duration(motion.duration.fast)}
                  >
                    <Text variant="callout" tone="muted" maxScale={1.3}>
                      {item.resposta}
                    </Text>
                  </Animated.View>
                ) : null}
              </Pressable>
            );
          })}
        </Bloco>
      </Grupo>

      <Grupo titulo="Falar com a gente">
        <Bloco>
          <LinhaDeAcao
            primeira
            titulo="Falar com o Canaã Resolve"
            explicacao={`WhatsApp ${suporte.whatsappLegivel}`}
            tom="marca"
            onPress={() => void abrirSuporte('ajuda')}
          />
          <LinhaDeAcao
            titulo="Relatar um problema"
            explicacao="Abre o WhatsApp com a versão do aplicativo já escrita"
            onPress={() => void abrirSuporte('problema')}
          />
        </Bloco>
        <Nota>
          {`A mensagem abre escrita e não é enviada sozinha — você confere antes. Vai junto só: ${informacoesTecnicas()}.`}
        </Nota>
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
  pergunta: {
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingVertical: space.lg,
  },
  perguntaLinha: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  perguntaTexto: { flex: 1 },
  setaAberta: { transform: [{ rotate: '90deg' }] },
});
