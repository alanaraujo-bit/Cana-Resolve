import { StyleSheet, View } from 'react-native';

import { Alternador, ChipSelecionavel, Chips, Grupo, Nota } from '@/perfil/componentes';
import { CarregandoEdicao, TelaDeEdicao, useEdicao } from '@/perfil/edicao';
import {
  diasDaSemana,
  horarioLegivel,
  rotuloDia,
  rotuloDiaExtenso,
  type DiaSemana,
} from '@/perfil/tipos';
import { space } from '@/theme';
import { Text, TextField } from '@/ui';

/** "1830" → "18:30". Deixa digitar só número, que é como se digita hora. */
function mascaraHora(entrada: string): string {
  const d = entrada.replace(/\D/g, '').slice(0, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}:${d.slice(2)}`;
}

function horaValida(valor: string): boolean {
  const m = /^(\d{2}):(\d{2})$/.exec(valor);
  if (!m) return false;
  const h = Number(m[1]);
  const min = Number(m[2]);
  return h >= 0 && h <= 23 && min >= 0 && min <= 59;
}

/**
 * Quando o parceiro trabalha.
 *
 * Isto é horário comercial, e não disponibilidade: dizer "atendo das 8 às 18"
 * não é dizer "estou livre agora". Pausar o recebimento é outro assunto e não
 * mora aqui — juntar os dois é o que faz alguém achar que está fora do ar por
 * ter fechado no domingo.
 *
 * Uma janela para todos os dias marcados resolve quase todo mundo. Quem tem
 * sábado diferente já é exceção, e a exceção não pode custar sete linhas de
 * formulário a quem não tem nenhuma.
 */
export default function Horario() {
  const edicao = useEdicao('horario');
  if (!edicao) return <CarregandoEdicao titulo="Horário de atendimento" />;

  const { rascunho, mexer } = edicao;
  const d = rascunho.disponibilidade;

  const mexerDisponibilidade = (parte: Partial<typeof d>) =>
    mexer({ disponibilidade: { ...d, ...parte } });

  const alternarDia = (dia: DiaSemana) =>
    mexerDisponibilidade({
      dias: d.dias.includes(dia) ? d.dias.filter((x) => x !== dia) : [...d.dias, dia],
    });

  const abreOk = horaValida(d.janela.abre);
  const fechaOk = horaValida(d.janela.fecha);

  const excecoes = d.porDia ? (Object.keys(d.porDia) as DiaSemana[]) : [];

  const impedimento = d.atende24h
    ? null
    : d.dias.length === 0
      ? 'Escolha ao menos um dia.'
      : !abreOk || !fechaOk
        ? 'Confira o horário.'
        : null;

  return (
    <TelaDeEdicao titulo="Horário de atendimento" edicao={edicao} impedimento={impedimento}>
      <Grupo titulo="Atendimento">
        <Alternador
          titulo="Atendo 24 horas"
          explicacao="Para quem atende emergência a qualquer hora, todos os dias."
          valor={d.atende24h}
          onChange={(v) => mexerDisponibilidade({ atende24h: v })}
        />
      </Grupo>

      {/* Ligou 24 h: o resto some, porque não há mais nada a dizer. */}
      {!d.atende24h ? (
        <>
          <Grupo titulo="Dias">
            <Chips>
              {diasDaSemana.map((dia) => (
                <ChipSelecionavel
                  key={dia}
                  rotulo={rotuloDia[dia]}
                  marcado={d.dias.includes(dia)}
                  onPress={() => alternarDia(dia)}
                />
              ))}
            </Chips>
          </Grupo>

          <Grupo titulo="Horário">
            <View style={estilos.horas}>
              <TextField
                label="Abre"
                value={d.janela.abre}
                onChangeText={(t) =>
                  mexerDisponibilidade({ janela: { ...d.janela, abre: mascaraHora(t) } })
                }
                error={d.janela.abre && !abreOk ? 'Hora inválida' : null}
                keyboardType="number-pad"
                placeholder="08:00"
                maxLength={5}
                containerStyle={estilos.hora}
              />
              <TextField
                label="Fecha"
                value={d.janela.fecha}
                onChangeText={(t) =>
                  mexerDisponibilidade({ janela: { ...d.janela, fecha: mascaraHora(t) } })
                }
                error={d.janela.fecha && !fechaOk ? 'Hora inválida' : null}
                keyboardType="number-pad"
                placeholder="18:00"
                maxLength={5}
                containerStyle={estilos.hora}
              />
            </View>
            <Text variant="caption" tone="muted" maxScale={1.25}>
              Vale para todos os dias marcados.
            </Text>
          </Grupo>

          {/* Exceções vindas dos dados. A tela mostra e deixa apagar; ela não
              vira um montador de escala. */}
          {excecoes.length > 0 ? (
            <Grupo titulo="Dias com horário diferente">
              {excecoes.map((dia) => (
                <Text key={dia} variant="callout" maxScale={1.25}>
                  {rotuloDiaExtenso[dia]}: {d.porDia?.[dia]?.abre} às {d.porDia?.[dia]?.fecha}
                </Text>
              ))}
              <Nota>
                Para mudar um desses horários, use o mesmo para todos os dias e nos avise — a
                edição por dia entra quando for realmente necessária.
              </Nota>
            </Grupo>
          ) : null}
        </>
      ) : null}

      <Nota>
        Isto é o horário do seu trabalho, não a sua disponibilidade de agora. {horarioLegivel(d)}.
      </Nota>
    </TelaDeEdicao>
  );
}

const estilos = StyleSheet.create({
  horas: { flexDirection: 'row', gap: space.md },
  hora: { flex: 1 },
});
