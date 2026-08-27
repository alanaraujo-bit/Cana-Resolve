/**
 * Formatação para leitura humana.
 *
 * Vive fora de `lib/domain` porque nada aqui toca no banco — e porque tanto o
 * navegador quanto os testes precisam destas funções sem arrastar junto uma
 * conexão de Postgres.
 */

/** "2 h 15 min", "1 d 4 h". Segundos crus não dizem nada a ninguém. */
export function duracaoLegivel(segundos: number | null) {
  if (segundos == null) return null;
  if (segundos < 60) return "menos de um minuto";

  const minutos = Math.round(segundos / 60);
  if (minutos < 60) return `${minutos} min`;

  const horas = Math.floor(minutos / 60);
  if (horas < 24) {
    const resto = minutos % 60;
    return resto ? `${horas} h ${resto} min` : `${horas} h`;
  }

  const dias = Math.floor(horas / 24);
  const resto = horas % 24;
  return resto ? `${dias} d ${resto} h` : `${dias} d`;
}
