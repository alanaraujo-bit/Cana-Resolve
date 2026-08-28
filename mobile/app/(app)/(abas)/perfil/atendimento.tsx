import { registrar } from '@/perfil/analytics';
import { bairros as todosOsBairros } from '@/perfil/catalogo';
import { Alternador, ChipSelecionavel, Chips, Grupo, Nota } from '@/perfil/componentes';
import { CarregandoEdicao, TelaDeEdicao, useEdicao } from '@/perfil/edicao';
import { Text } from '@/ui';

/**
 * Onde o parceiro atende.
 *
 * Bairro basta. Não há mapa, não há raio em quilômetros e não há polígono: em
 * uma cidade do tamanho de Canaã, "atendo o Novo Horizonte" é uma informação
 * mais exata — e infinitamente mais fácil de dar — do que arrastar um círculo
 * sobre um mapa.
 *
 * O caminho curto é o de cima: quem atende a cidade toda liga uma chave e
 * acabou. A lista de bairros só aparece para quem realmente escolhe.
 */
export default function Atendimento() {
  const edicao = useEdicao('atendimento');
  if (!edicao) return <CarregandoEdicao titulo="Onde você atende" />;

  const { rascunho, mexer } = edicao;
  const { atendimento } = rascunho;

  const definir = (cidadeInteira: boolean, lista: string[]) => {
    mexer({ atendimento: { ...atendimento, cidadeInteira, bairros: lista } });
    registrar({
      nome: 'atendimento_definido',
      cidadeInteira,
      bairros: lista.length,
    });
  };

  const alternarBairro = (bairro: string) => {
    const marcado = atendimento.bairros.includes(bairro);
    definir(
      false,
      marcado
        ? atendimento.bairros.filter((b) => b !== bairro)
        : [...atendimento.bairros, bairro],
    );
  };

  const semBairro = !atendimento.cidadeInteira && atendimento.bairros.length === 0;

  return (
    <TelaDeEdicao
      titulo="Onde você atende"
      edicao={edicao}
      impedimento={semBairro ? 'Escolha ao menos um bairro, ou marque a cidade toda.' : null}
    >
      <Grupo titulo={atendimento.cidade}>
        <Alternador
          titulo={`Atendo toda ${atendimento.cidade}`}
          explicacao="Você recebe pedidos de qualquer bairro da cidade."
          valor={atendimento.cidadeInteira}
          onChange={(v) => definir(v, v ? [] : atendimento.bairros)}
        />
      </Grupo>

      {/* A lista só existe para quem escolheu escolher. */}
      {!atendimento.cidadeInteira ? (
        <Grupo titulo="Bairros que você atende">
          <Text variant="caption" tone="muted" maxScale={1.25}>
            Marque os bairros onde vale a pena você ir. Isso evita chamado longe demais.
          </Text>
          <Chips>
            {todosOsBairros.map((b) => (
              <ChipSelecionavel
                key={b}
                rotulo={b}
                marcado={atendimento.bairros.includes(b)}
                onPress={() => alternarBairro(b)}
              />
            ))}
          </Chips>
          {semBairro ? (
            <Nota tom="destaque">
              Sem nenhum bairro marcado, nenhuma oportunidade encontra você.
            </Nota>
          ) : null}
        </Grupo>
      ) : null}

      <Nota>
        Falta algum bairro na lista? Marque “toda {atendimento.cidade}” por enquanto e nos avise —
        a lista de bairros ainda está sendo conferida.
      </Nota>
    </TelaDeEdicao>
  );
}
