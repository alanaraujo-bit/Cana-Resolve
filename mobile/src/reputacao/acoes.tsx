/**
 * As duas coisas que o profissional pode fazer com uma avaliação.
 *
 * **Duas**, e a lista curta é o assunto desta fase. Ele pode responder e pode
 * contestar. Ele não pode apagar, não pode mudar a nota e não pode editar o que
 * o cliente escreveu (§17, §128) — e isso não aparece aqui como um botão
 * desabilitado com um aviso: aparece como código que não existe. Um botão
 * cinzento de "excluir avaliação" ensinaria que a operação existe e está
 * bloqueada, quando a verdade é que ela não existe.
 *
 * As duas moram em folhas e não em telas, pela mesma razão da Fase 03: são
 * decisões curtas, e transformar "por que esta avaliação está errada?" numa
 * página é burocracia.
 *
 * A folha ganhou `comTeclado` e `rodape` nesta fase, e é aqui que se vê por
 * quê: são as primeiras folhas do produto com campo de texto, e sem isso o
 * botão de publicar ficava debaixo do teclado (§94).
 */

import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { space, useTheme } from '@/theme';
import { Button, haptics, OpcaoDaFolha, Sheet, Text, TextField } from '@/ui';
import { useReputacao } from './ReputacaoProvider';
import {
  MAXIMO_DA_DENUNCIA,
  MAXIMO_DA_RESPOSTA,
  MINIMO_DA_RESPOSTA,
  motivosDeDenuncia,
  rotuloMotivoDeDenuncia,
  type Avaliacao,
  type MotivoDeDenuncia,
} from './tipos';

/* -------------------------------------------------------------------------- */
/*  Responder                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * A resposta do profissional (§13, §127).
 *
 * A orientação no topo é curta e sem paternalismo (§70): ela lembra que a
 * resposta é pública, que é o único fato que a pessoa talvez não saiba. Não
 * ensina a ser educado, não ameaça com moderação e não diz "responda com
 * carinho".
 *
 * Quem já respondeu cai aqui em modo de edição, com o texto atual dentro — e
 * ganha "Apagar resposta". Apagar a resposta **não** apaga a avaliação (§16), e
 * a frase abaixo do botão diz isso, porque é exatamente a confusão que alguém
 * teria ao ver "apagar" numa tela de avaliação.
 */
export function FolhaDeResposta({
  aberta,
  avaliacao,
  onFechar,
}: {
  aberta: boolean;
  avaliacao: Avaliacao;
  onFechar: () => void;
}) {
  const { responder, editarResposta, removerResposta } = useReputacao();
  const editando = avaliacao.resposta !== null;

  const [texto, setTexto] = useState(avaliacao.resposta?.texto ?? '');
  const [enviando, setEnviando] = useState(false);
  const [apagando, setApagando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Reabrir a folha recomeça do que está publicado, e não do rascunho de uma
  // tentativa anterior que a pessoa deliberadamente fechou.
  useEffect(() => {
    if (aberta) {
      setTexto(avaliacao.resposta?.texto ?? '');
      setErro(null);
    }
  }, [aberta, avaliacao.resposta]);

  const limpo = texto.trim();
  const restam = MAXIMO_DA_RESPOSTA - texto.length;
  const podeEnviar = limpo.length >= MINIMO_DA_RESPOSTA && !enviando && !apagando;

  const enviar = async () => {
    if (!podeEnviar) return;
    setEnviando(true);
    setErro(null);
    try {
      if (editando) await editarResposta(avaliacao.id, texto);
      else await responder(avaliacao.id, texto);
      haptics.success();
      onFechar();
    } catch (e) {
      // §103 — nada aqui diz que foi publicado antes de o servidor confirmar.
      haptics.error();
      setErro(e instanceof Error ? e.message : 'Não foi possível publicar sua resposta agora.');
    } finally {
      setEnviando(false);
    }
  };

  const apagar = async () => {
    setApagando(true);
    setErro(null);
    try {
      await removerResposta(avaliacao.id);
      haptics.success();
      onFechar();
    } catch (e) {
      haptics.error();
      setErro(e instanceof Error ? e.message : 'Não foi possível apagar sua resposta agora.');
    } finally {
      setApagando(false);
    }
  };

  return (
    <Sheet
      aberta={aberta}
      titulo={editando ? 'Editar sua resposta' : 'Responder'}
      descricao="Sua resposta fica visível para quem ler esta avaliação."
      onFechar={onFechar}
      comTeclado
      rodape={
        <>
          <Button
            label={editando ? 'Salvar resposta' : 'Publicar resposta'}
            onPress={() => void enviar()}
            disabled={!podeEnviar}
            loading={enviando}
            haptic="commit"
          />
          {editando ? (
            <Button
              label="Apagar resposta"
              variant="quiet"
              onPress={() => void apagar()}
              loading={apagando}
            />
          ) : null}
        </>
      }
    >
      <TextField
        label="Sua resposta"
        value={texto}
        onChangeText={setTexto}
        error={erro}
        multiline
        numberOfLines={5}
        maxLength={MAXIMO_DA_RESPOSTA}
        autoCapitalize="sentences"
        autoFocus={aberta}
        placeholder="Obrigado pelo retorno. Qualquer coisa, é só chamar."
        containerStyle={estilos.campo}
      />

      <View style={estilos.rodapeCampo}>
        <Text variant="caption" tone="muted" maxScale={1.25} style={estilos.dica}>
          Uma resposta por avaliação. Você pode editá-la ou apagá-la depois.
        </Text>
        {restam <= 100 ? (
          <Text variant="caption" tone={restam < 0 ? 'danger' : 'faint'} maxScale={1.1}>
            {restam}
          </Text>
        ) : null}
      </View>

      {editando ? (
        <Text variant="caption" tone="faint" maxScale={1.3}>
          Apagar sua resposta não apaga a avaliação do cliente — ela continua no seu perfil.
        </Text>
      ) : null}
    </Sheet>
  );
}

/* -------------------------------------------------------------------------- */
/*  Contestar                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * A contestação (§18, §19, §126).
 *
 * Um motivo de uma lista de seis, um complemento opcional, enviar. Nada de
 * formulário longo: quem contesta está incomodado, e um formulário de dez
 * campos nesse momento é uma barreira, não um filtro.
 *
 * **A frase mais importante desta folha é a de baixo**, e ela é dita antes do
 * envio, não depois: contestar não remove. Deixar a pessoa descobrir isso
 * quando a avaliação continuar lá seria prometer o que o produto não faz — e
 * este é o único ponto do aplicativo onde alguém poderia esperar que uma ação
 * dele apagasse a opinião de outra pessoa.
 */
export function FolhaDeDenuncia({
  aberta,
  avaliacao,
  onFechar,
}: {
  aberta: boolean;
  avaliacao: Avaliacao;
  onFechar: () => void;
}) {
  const { colors } = useTheme();
  const { denunciar } = useReputacao();

  const [motivo, setMotivo] = useState<MotivoDeDenuncia | null>(null);
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (aberta) {
      setMotivo(null);
      setComentario('');
      setErro(null);
    }
  }, [aberta]);

  const enviar = async () => {
    if (!motivo || enviando) return;
    setEnviando(true);
    setErro(null);
    try {
      await denunciar(avaliacao.id, motivo, comentario);
      haptics.success();
      onFechar();
    } catch (e) {
      haptics.error();
      setErro(e instanceof Error ? e.message : 'Não foi possível enviar sua contestação agora.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Sheet
      aberta={aberta}
      titulo="Contestar avaliação"
      descricao="Conte o que está errado. Uma pessoa do Canaã Resolve vai analisar."
      onFechar={onFechar}
      comTeclado
      rodape={
        <>
          <Button
            label="Enviar contestação"
            onPress={() => void enviar()}
            disabled={!motivo || enviando}
            loading={enviando}
            haptic="commit"
          />
          <Text variant="caption" tone="muted" center maxScale={1.25}>
            Contestar não remove a avaliação. Ela fica em análise até alguém decidir.
          </Text>
        </>
      }
    >
      <View
        accessibilityRole="radiogroup"
        style={[estilos.motivos, { borderColor: colors.line }]}
      >
        {motivosDeDenuncia.map((m, i) => (
          <OpcaoDaFolha
            key={m}
            rotulo={rotuloMotivoDeDenuncia[m]}
            selecionada={motivo === m}
            onPress={() => setMotivo(m)}
            primeira={i === 0}
          />
        ))}
      </View>

      <TextField
        label="Quer explicar? (opcional)"
        value={comentario}
        onChangeText={setComentario}
        error={erro}
        multiline
        numberOfLines={3}
        maxLength={MAXIMO_DA_DENUNCIA}
        autoCapitalize="sentences"
        placeholder="Não tenho registro de atendimento com este cliente."
        containerStyle={estilos.campo}
      />

      <Text variant="caption" tone="faint" maxScale={1.3}>
        Discordar da nota não é motivo de remoção. Se o cliente foi injusto, a melhor resposta é
        responder — quem lê vê os dois lados.
      </Text>
    </Sheet>
  );
}

const estilos = StyleSheet.create({
  campo: { marginTop: space.xs },
  rodapeCampo: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  dica: { flex: 1 },
  motivos: { borderRadius: 0 },
});
