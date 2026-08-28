import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { registrar } from '@/perfil/analytics';
import { categorias, categoriaPorId } from '@/perfil/catalogo';
import { ChipSelecionavel, Chips, Grupo, Nota, Retrato } from '@/perfil/componentes';
import { CarregandoEdicao, TelaDeEdicao, useEdicao } from '@/perfil/edicao';
import { ErroDeImagem, escolherImagem, mensagemDaFalha } from '@/perfil/imagem';
import {
  MAXIMO_DA_DESCRICAO,
  rotuloNome,
  rotuloOficio,
  type TipoDePerfil,
} from '@/perfil/tipos';
import { avisoDeDescricao, restamNaDescricao } from '@/perfil/validacao';
import { space, useTheme } from '@/theme';
import { Text, TextField } from '@/ui';

/**
 * Informações principais: quem é, o que faz, e como se apresenta.
 *
 * A tela muda de acordo com o tipo. Não é enfeite: uma empresa tem logo e um
 * responsável que ninguém precisa ver; uma pessoa tem rosto e profissão.
 * Mostrar "nome fantasia" para um eletricista autônomo é o que faz o
 * aplicativo parecer formulário de prefeitura.
 */
export default function Identidade() {
  const edicao = useEdicao('identidade');
  const { colors } = useTheme();
  const [erroDaImagem, setErroDaImagem] = useState<string | null>(null);

  if (!edicao) return <CarregandoEdicao titulo="Informações principais" />;

  const { rascunho, mexer } = edicao;
  const ehEmpresa = rascunho.tipo === 'empresa';
  const aviso = avisoDeDescricao(rascunho.descricao);
  const restam = restamNaDescricao(rascunho.descricao);

  const trocarTipo = (tipo: TipoDePerfil) => {
    registrar({ nome: 'tipo_alterado', tipo });
    // Sair de empresa apaga o responsável: ele não existe em perfil de pessoa,
    // e guardar dado que a tela não mostra mais é como ele vaza depois.
    mexer({ tipo, responsavel: tipo === 'empresa' ? rascunho.responsavel : null });
  };

  const escolherFoto = async () => {
    setErroDaImagem(null);
    try {
      const imagem = await escolherImagem('retrato');
      if (imagem) {
        registrar({ nome: 'imagem_definida', onde: 'retrato' });
        mexer({ imagem });
      }
    } catch (e) {
      setErroDaImagem(
        e instanceof ErroDeImagem ? mensagemDaFalha(e.motivo) : mensagemDaFalha('leitura'),
      );
    }
  };

  const nomeVazio = rascunho.nome.trim().length < 2;

  return (
    <TelaDeEdicao
      titulo="Informações principais"
      edicao={edicao}
      impedimento={nomeVazio ? 'Informe seu nome para salvar.' : null}
    >
      {/* Tipo — duas escolhas, com a consequência escrita embaixo. */}
      <Grupo titulo="Como você atende">
        <View style={estilos.tipos}>
          {(['profissional', 'empresa'] as TipoDePerfil[]).map((t) => (
            <Pressable
              key={t}
              onPress={() => trocarTipo(t)}
              accessibilityRole="radio"
              accessibilityState={{ selected: rascunho.tipo === t }}
              accessibilityLabel={t === 'empresa' ? 'Somos uma empresa' : 'Sou profissional'}
              style={[
                estilos.tipo,
                {
                  backgroundColor: rascunho.tipo === t ? colors.brandSoft : colors.surface,
                  borderColor: rascunho.tipo === t ? colors.brandLine : colors.line,
                },
              ]}
            >
              <Text
                variant="bodyStrong"
                tone={rascunho.tipo === t ? 'brand' : 'ink'}
                maxScale={1.2}
              >
                {t === 'empresa' ? 'Empresa' : 'Profissional'}
              </Text>
              <Text variant="caption" tone="muted" maxScale={1.2}>
                {t === 'empresa' ? 'Atendo no nome do negócio.' : 'Atendo com o meu nome.'}
              </Text>
            </Pressable>
          ))}
        </View>
      </Grupo>

      {/* Foto ou logo. Sem imagem continua bonito — o fallback não é castigo. */}
      <Grupo titulo={ehEmpresa ? 'Logo' : 'Sua foto'}>
        <View style={estilos.foto}>
          <Retrato
            nome={rascunho.nome}
            imagem={rascunho.imagem}
            tipo={rascunho.tipo}
            tamanho={84}
          />
          <View style={estilos.fotoAcoes}>
            <Pressable
              onPress={() => void escolherFoto()}
              accessibilityRole="button"
              accessibilityLabel={rascunho.imagem ? 'Trocar imagem' : 'Escolher imagem'}
              style={estilos.fotoBotao}
            >
              <Text variant="button" tone="brand" maxScale={1.2}>
                {rascunho.imagem ? 'Trocar' : 'Escolher imagem'}
              </Text>
            </Pressable>
            {rascunho.imagem ? (
              <Pressable
                onPress={() => mexer({ imagem: null })}
                accessibilityRole="button"
                accessibilityLabel="Remover imagem"
                style={estilos.fotoBotao}
              >
                <Text variant="button" tone="muted" maxScale={1.2}>
                  Remover
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
        {erroDaImagem ? <Nota tom="destaque">{erroDaImagem}</Nota> : null}
      </Grupo>

      <Grupo titulo="Nome">
        <TextField
          label={rotuloNome[rascunho.tipo]}
          value={rascunho.nome}
          onChangeText={(nome) => mexer({ nome })}
          autoCapitalize="words"
          placeholder={ehEmpresa ? 'Clima Norte Refrigeração' : 'João Batista'}
          maxLength={70}
        />

        {ehEmpresa ? (
          <>
            <TextField
              label="Responsável pela empresa"
              value={rascunho.responsavel ?? ''}
              onChangeText={(responsavel) => mexer({ responsavel })}
              autoCapitalize="words"
              placeholder="Quem responde pelo negócio"
              maxLength={70}
            />
            <Nota>
              O nome do responsável fica só para o Canaã Resolve. O morador vê o nome da empresa.
            </Nota>
          </>
        ) : null}
      </Grupo>

      {/* Categoria — é por ela que a oportunidade chega. */}
      <Grupo titulo="Sua categoria">
        <Text variant="caption" tone="muted" maxScale={1.25}>
          É por ela que as oportunidades chegam até você. Escolha uma.
        </Text>
        <Chips>
          {categorias.map((c) => (
            <ChipSelecionavel
              key={c.id}
              rotulo={c.rotulo}
              marcado={rascunho.categoriaId === c.id}
              onPress={() => {
                registrar({ nome: 'categoria_escolhida', categoria: c.id });
                // Sugere o ofício só quando ele ainda está em branco: nunca
                // por cima do que a pessoa escreveu.
                mexer({
                  categoriaId: c.id,
                  oficio: rascunho.oficio.trim() ? rascunho.oficio : c.oficioSugerido,
                });
              }}
            />
          ))}
        </Chips>
      </Grupo>

      <Grupo titulo="Seu ofício">
        <TextField
          label={rotuloOficio[rascunho.tipo]}
          value={rascunho.oficio}
          onChangeText={(oficio) => mexer({ oficio })}
          autoCapitalize="sentences"
          placeholder={categoriaPorId(rascunho.categoriaId)?.oficioSugerido ?? 'Eletricista'}
          maxLength={60}
        />
        <Text variant="caption" tone="faint" maxScale={1.2}>
          Aparece embaixo do seu nome, em uma linha.
        </Text>
      </Grupo>

      {/* Descrição — o único lugar de texto livre, e por isso o mais cuidado. */}
      <Grupo titulo="Sobre o seu trabalho">
        <TextField
          label="Descrição"
          value={rascunho.descricao}
          onChangeText={(descricao) => mexer({ descricao })}
          multiline
          numberOfLines={5}
          maxLength={MAXIMO_DA_DESCRICAO}
          autoCapitalize="sentences"
          placeholder="Trabalho com instalação, limpeza e manutenção de ar-condicionado residencial e comercial em Canaã dos Carajás."
          containerStyle={estilos.descricao}
        />
        <View style={estilos.contador}>
          <Text variant="caption" tone="muted" maxScale={1.2} style={estilos.contadorTexto}>
            Diga o que você faz e há quanto tempo. É o que o morador lê antes de chamar.
          </Text>
          {restam <= 80 ? (
            <Text variant="caption" tone={restam < 0 ? 'danger' : 'faint'} maxScale={1.1}>
              {restam}
            </Text>
          ) : null}
        </View>
        {aviso ? <Nota tom="destaque">{aviso}</Nota> : null}
      </Grupo>

      {/* Fundador — só quando é verdade, e sem interruptor: o selo não é do
          parceiro para ligar, é do Canaã Resolve para conceder. */}
      {rascunho.parceiroFundador ? (
        <Grupo titulo="Parceiro fundador">
          <Nota>
            Você entrou entre os primeiros parceiros de Canaã dos Carajás, e o selo aparece no seu
            perfil.
          </Nota>
        </Grupo>
      ) : null}
    </TelaDeEdicao>
  );
}

const estilos = StyleSheet.create({
  tipos: { flexDirection: 'row', gap: space.md },
  tipo: {
    flex: 1,
    gap: 2,
    padding: space.lg,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },

  foto: { flexDirection: 'row', alignItems: 'center', gap: space.xl },
  fotoAcoes: { flex: 1, gap: space.xs },
  fotoBotao: { minHeight: 44, justifyContent: 'center' },

  descricao: { marginTop: space.xs },
  contador: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  contadorTexto: { flex: 1 },
});
