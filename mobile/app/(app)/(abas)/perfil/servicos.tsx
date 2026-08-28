import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { registrar } from '@/perfil/analytics';
import { categoriaPorId } from '@/perfil/catalogo';
import { ChipSelecionavel, Chips, Grupo, Nota } from '@/perfil/componentes';
import { CarregandoEdicao, TelaDeEdicao, useEdicao } from '@/perfil/edicao';
import { MAXIMO_DE_SERVICOS, type Servico } from '@/perfil/tipos';
import { jaExiste, mesmaCoisa, normalizarServico } from '@/perfil/validacao';
import { space, useTheme } from '@/theme';
import { Text, TextField } from '@/ui';

/**
 * O que o parceiro faz.
 *
 * A categoria diz o balcão; isto diz o serviço. É a informação que mais
 * melhora o encaminhamento — e a que mais rápido vira formulário chato se for
 * mal resolvida. Por isso: os serviços da categoria vêm prontos para tocar, e
 * escrever é a saída para quem faz algo que não está na lista.
 *
 * A lista não é uma cerca. Quem faz um serviço legítimo que ninguém cadastrou
 * ainda escreve, e o que escreveu vale igual.
 */
export default function Servicos() {
  const edicao = useEdicao('servicos');
  const { colors } = useTheme();
  const [texto, setTexto] = useState('');
  const [aviso, setAviso] = useState<string | null>(null);

  if (!edicao) return <CarregandoEdicao titulo="O que você faz" />;

  const { rascunho, mexer } = edicao;
  const categoria = categoriaPorId(rascunho.categoriaId);
  const escolhidos = rascunho.servicos;
  const cheio = escolhidos.length >= MAXIMO_DE_SERVICOS;

  const definir = (servicos: Servico[]) => {
    mexer({ servicos });
    registrar({
      nome: 'servicos_definidos',
      total: servicos.length,
      personalizados: servicos.filter((s) => s.personalizado).length,
    });
  };

  const alternar = (rotulo: string) => {
    const existente = escolhidos.find((s) => mesmaCoisa(s.rotulo, rotulo));
    if (existente) {
      definir(escolhidos.filter((s) => s.id !== existente.id));
      setAviso(null);
      return;
    }
    if (cheio) {
      setAviso(
        `Você já escolheu ${MAXIMO_DE_SERVICOS} serviços. Tire um para colocar outro — a lista curta ajuda o morador a entender o que você faz.`,
      );
      return;
    }
    definir([
      ...escolhidos,
      { id: `s${Date.now()}${escolhidos.length}`, rotulo, personalizado: false },
    ]);
    setAviso(null);
  };

  const adicionarEscrito = () => {
    const rotulo = normalizarServico(texto);
    if (rotulo.length < 3) {
      setAviso('Escreva o serviço com pelo menos três letras.');
      return;
    }
    if (jaExiste(escolhidos, rotulo)) {
      setAviso(`“${rotulo}” já está na sua lista.`);
      setTexto('');
      return;
    }
    if (cheio) {
      setAviso(`Você já escolheu ${MAXIMO_DE_SERVICOS} serviços.`);
      return;
    }
    definir([
      ...escolhidos,
      { id: `p${Date.now()}`, rotulo, personalizado: true },
    ]);
    setTexto('');
    setAviso(null);
  };

  const sugestoes = categoria?.servicos ?? [];
  const personalizados = escolhidos.filter((s) => s.personalizado);

  return (
    <TelaDeEdicao
      titulo="O que você faz"
      edicao={edicao}
      impedimento={escolhidos.length === 0 ? 'Escolha pelo menos um serviço.' : null}
    >
      {!categoria ? (
        <Nota tom="destaque">
          Escolha sua categoria em “Informações principais” para ver os serviços mais comuns dela.
          Você pode escrever os seus mesmo assim.
        </Nota>
      ) : null}

      {sugestoes.length > 0 ? (
        <Grupo titulo={`Serviços de ${categoria!.rotulo.toLowerCase()}`}>
          <Text variant="caption" tone="muted" maxScale={1.25}>
            Toque no que você faz. Isso evita chegar pedido que não é do seu tipo de serviço.
          </Text>
          <Chips>
            {sugestoes.map((s) => (
              <ChipSelecionavel
                key={s}
                rotulo={s}
                marcado={escolhidos.some((e) => mesmaCoisa(e.rotulo, s))}
                onPress={() => alternar(s)}
              />
            ))}
          </Chips>
        </Grupo>
      ) : null}

      {/* O que foi escrito à mão fica separado — dá para remover sem caçar. */}
      {personalizados.length > 0 ? (
        <Grupo titulo="Serviços que você escreveu">
          <Chips>
            {personalizados.map((s) => (
              <ChipSelecionavel
                key={s.id}
                rotulo={s.rotulo}
                marcado
                onPress={() => {}}
                onRemover={() => definir(escolhidos.filter((e) => e.id !== s.id))}
              />
            ))}
          </Chips>
        </Grupo>
      ) : null}

      <Grupo titulo="Faz algo que não está na lista?">
        <View style={estilos.escrever}>
          <TextField
            label="Outro serviço"
            value={texto}
            onChangeText={(t) => {
              setTexto(t);
              setAviso(null);
            }}
            autoCapitalize="sentences"
            placeholder="Instalação de bomba d’água"
            maxLength={40}
            returnKeyType="done"
            onSubmitEditing={adicionarEscrito}
            containerStyle={estilos.campo}
          />
          <Pressable
            onPress={adicionarEscrito}
            disabled={texto.trim().length === 0}
            accessibilityRole="button"
            accessibilityLabel="Adicionar serviço"
            accessibilityState={{ disabled: texto.trim().length === 0 }}
            style={estilos.adicionar}
          >
            <Text
              variant="button"
              maxScale={1.2}
              style={{ color: texto.trim().length > 0 ? colors.brandInk : colors.faint }}
            >
              Adicionar
            </Text>
          </Pressable>
        </View>
        <Text variant="caption" tone="faint" maxScale={1.2}>
          Um serviço por vez, curto e direto. Recados e horário de atendimento têm lugar próprio.
        </Text>
      </Grupo>

      {aviso ? <Nota tom="destaque">{aviso}</Nota> : null}

      <Text variant="caption" tone="muted" maxScale={1.2}>
        {escolhidos.length === 0
          ? 'Nenhum serviço escolhido ainda.'
          : escolhidos.length === 1
            ? '1 serviço escolhido.'
            : `${escolhidos.length} serviços escolhidos.`}
      </Text>
    </TelaDeEdicao>
  );
}

const estilos = StyleSheet.create({
  escrever: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  campo: { flex: 1 },
  adicionar: { minHeight: 56, justifyContent: 'center', paddingHorizontal: space.sm },
});
