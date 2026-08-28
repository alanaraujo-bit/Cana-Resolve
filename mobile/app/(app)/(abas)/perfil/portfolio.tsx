import { useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, View } from 'react-native';

import { registrar } from '@/perfil/analytics';
import { Grupo, Nota, Vazio } from '@/perfil/componentes';
import { CarregandoEdicao, TelaDeEdicao, useEdicao } from '@/perfil/edicao';
import { ErroDeImagem, escolherImagem, mensagemDaFalha } from '@/perfil/imagem';
import { MAXIMO_DA_LEGENDA, MAXIMO_DE_FOTOS, type ItemDePortfolio } from '@/perfil/tipos';
import { radius, space, useTheme } from '@/theme';
import { Button, Text, TextField } from '@/ui';

/**
 * Fotos de trabalhos realizados.
 *
 * É o que mais convence quem está decidindo — e por isso é o que mais precisa
 * não virar feed. Não há curtida, comentário, data em destaque nem ordem por
 * "mais recente": é uma vitrine de trabalho, e o parceiro decide o que mostrar
 * primeiro.
 *
 * A foto é mantida no enquadramento de quem fotografou. Um quadro de energia é
 * uma foto vertical; recortá-la em quadrado esconde justamente o serviço.
 */
export default function Portfolio() {
  const edicao = useEdicao('apresentacao');
  const { colors } = useTheme();
  const [erro, setErro] = useState<string | null>(null);

  if (!edicao) return <CarregandoEdicao titulo="Fotos de trabalhos" />;

  const { rascunho, mexer } = edicao;
  const fotos = rascunho.portfolio;
  const cheio = fotos.length >= MAXIMO_DE_FOTOS;

  const adicionar = async () => {
    setErro(null);
    if (cheio) {
      setErro(`Você já tem ${MAXIMO_DE_FOTOS} fotos. Remova uma para colocar outra.`);
      return;
    }
    try {
      const imagem = await escolherImagem('portfolio');
      if (!imagem) return;
      registrar({ nome: 'imagem_definida', onde: 'portfolio' });
      mexer({
        portfolio: [
          ...fotos,
          { id: `f${Date.now()}`, imagem, legenda: null } satisfies ItemDePortfolio,
        ],
      });
    } catch (e) {
      setErro(
        e instanceof ErroDeImagem ? mensagemDaFalha(e.motivo) : mensagemDaFalha('leitura'),
      );
    }
  };

  const remover = (id: string) => {
    Alert.alert('Remover esta foto?', 'Ela sai do seu perfil.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: () => {
          registrar({ nome: 'foto_removida' });
          mexer({ portfolio: fotos.filter((f) => f.id !== id) });
        },
      },
    ]);
  };

  const mover = (id: string, direcao: -1 | 1) => {
    const i = fotos.findIndex((f) => f.id === id);
    const j = i + direcao;
    if (i < 0 || j < 0 || j >= fotos.length) return;
    const nova = [...fotos];
    [nova[i], nova[j]] = [nova[j]!, nova[i]!];
    mexer({ portfolio: nova });
  };

  const legendar = (id: string, legenda: string) =>
    mexer({
      portfolio: fotos.map((f) => (f.id === id ? { ...f, legenda: legenda || null } : f)),
    });

  return (
    <TelaDeEdicao titulo="Fotos de trabalhos" edicao={edicao}>
      {fotos.length === 0 ? (
        <Vazio
          titulo="Nenhuma foto ainda."
          texto="Uma foto de serviço bem feito costuma convencer mais do que qualquer texto."
        />
      ) : null}

      {fotos.map((f, indice) => (
        <View
          key={f.id}
          style={[estilos.item, { backgroundColor: colors.surface, borderColor: colors.line }]}
        >
          <Image
            source={{ uri: f.imagem.uri }}
            style={[
              estilos.foto,
              // Respeita a proporção da foto original, com teto para uma foto
              // muito alta não tomar a tela inteira.
              { aspectRatio: Math.max(0.6, f.imagem.largura / f.imagem.altura) },
            ]}
            resizeMode="cover"
            accessibilityLabel={f.legenda ?? `Foto ${indice + 1} do seu trabalho`}
          />

          <View style={estilos.corpo}>
            <TextField
              label="Legenda (opcional)"
              value={f.legenda ?? ''}
              onChangeText={(t) => legendar(f.id, t)}
              maxLength={MAXIMO_DA_LEGENDA}
              autoCapitalize="sentences"
              placeholder="Instalação em Novo Horizonte"
            />

            <View style={estilos.acoes}>
              <Pressable
                onPress={() => mover(f.id, -1)}
                disabled={indice === 0}
                accessibilityRole="button"
                accessibilityLabel="Mover para antes"
                accessibilityState={{ disabled: indice === 0 }}
                style={estilos.acao}
              >
                <Text
                  variant="label"
                  maxScale={1.2}
                  style={{ color: indice === 0 ? colors.faint : colors.brandInk }}
                >
                  ↑ Antes
                </Text>
              </Pressable>

              <Pressable
                onPress={() => mover(f.id, 1)}
                disabled={indice === fotos.length - 1}
                accessibilityRole="button"
                accessibilityLabel="Mover para depois"
                accessibilityState={{ disabled: indice === fotos.length - 1 }}
                style={estilos.acao}
              >
                <Text
                  variant="label"
                  maxScale={1.2}
                  style={{
                    color: indice === fotos.length - 1 ? colors.faint : colors.brandInk,
                  }}
                >
                  ↓ Depois
                </Text>
              </Pressable>

              <Pressable
                onPress={() => remover(f.id)}
                accessibilityRole="button"
                accessibilityLabel="Remover foto"
                style={[estilos.acao, estilos.acaoFim]}
              >
                <Text variant="label" tone="danger" maxScale={1.2}>
                  Remover
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      ))}

      {erro ? <Nota tom="destaque">{erro}</Nota> : null}

      <Grupo titulo={`${fotos.length} de ${MAXIMO_DE_FOTOS}`}>
        <Button
          label={fotos.length === 0 ? 'Adicionar primeira foto' : 'Adicionar foto'}
          variant="outline"
          onPress={() => void adicionar()}
          disabled={cheio}
        />
      </Grupo>

      <Nota>
        Evite fotos com rosto de cliente, documento, placa ou endereço à mostra. O trabalho é o que
        interessa.
      </Nota>
    </TelaDeEdicao>
  );
}

const estilos = StyleSheet.create({
  item: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  foto: { width: '100%' },
  corpo: { padding: space.lg, gap: space.md },
  acoes: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  acao: { minHeight: 44, justifyContent: 'center' },
  acaoFim: { marginLeft: 'auto' },
});
