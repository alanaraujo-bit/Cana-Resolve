/**
 * O que vem de fora vira rota do aplicativo — ou não vira nada.
 *
 * Este arquivo é a metade **pura** de `destino.ts`: nenhuma dependência, nenhum
 * armazenamento, nenhum roteador. Ele nasceu separado na Fase 07 por um motivo
 * prático e um bom: a tradução de endereço externo em rota interna é a peça mais
 * fácil de quebrar em silêncio de toda a infraestrutura de deep link — um push
 * gravado hoje pode ser tocado daqui a semanas —, e sem imports ela pode ser
 * conferida por asserção, do lado do repositório do site, junto do arquivo que
 * escreve o outro lado do contrato (`lib/push/mensagens.ts`).
 *
 * As duas regras de segurança continuam sendo as da Fase 06:
 *
 * 1. **Só destinos conhecidos.** Um caminho que não bate com a lista vira
 *    `null` — não vira navegação. Deep link não é um `router.push` do que
 *    chegou de fora (§71 da Fase 06).
 * 2. **Conhecer um id não é autorização** (§70). A rota existir só quer dizer
 *    que a tela pode abrir; quem decide se aquele dado é daquela pessoa é o
 *    servidor, quando a tela for buscá-lo.
 */

/**
 * Os destinos que o aplicativo aceita receber de fora.
 *
 * A lista é curta de propósito e cresce por decisão, não por acidente.
 */
const ROTAS: { padrao: RegExp; rota: (m: RegExpMatchArray) => string }[] = [
  {
    // `oportunidade/o1` — o motivo de a Fase 06 existir.
    padrao: /^oportunidade\/([A-Za-z0-9._-]{1,64})$/,
    rota: (m) => `/oportunidade/${m[1]}`,
  },
  {
    /**
     * `avaliacao/a1` — o destino de "você recebeu uma nova avaliação"
     * (Fase 07, §74).
     *
     * O endereço externo é curto, e a rota interna é `/perfil/avaliacoes/:id`,
     * que é onde a tela realmente mora — dentro da pilha do Perfil, onde vive o
     * provedor de que ela precisa. **A tradução é aqui e em nenhum outro
     * lugar**: o texto que viaja num push não deve carregar a estrutura interna
     * de rotas do aplicativo, para que no dia em que a tela mudar de lugar os
     * pushes já enviados continuem funcionando com uma linha alterada.
     */
    padrao: /^avaliacao\/([A-Za-z0-9._-]{1,64})$/,
    rota: (m) => `/perfil/avaliacoes/${m[1]}`,
  },
  {
    /**
     * A forma interna, aceita porque `restaurar()` **revalida a rota que leu do
     * disco** — e o que ele leu já é a forma traduzida.
     *
     * Sem esta linha, um destino de avaliação gravado numa execução seria
     * descartado na seguinte, sem erro e sem aviso: exatamente o percurso
     * "toquei no push, o aplicativo tinha morrido, autentiquei" que o módulo
     * existe para atender. `comoRota` é idempotente por causa dela.
     */
    padrao: /^perfil\/avaliacoes\/([A-Za-z0-9._-]{1,64})$/,
    rota: (m) => `/perfil/avaliacoes/${m[1]}`,
  },
  {
    padrao: /^(?:avaliacoes|perfil\/avaliacoes)$/,
    rota: () => '/perfil/avaliacoes',
  },
  {
    padrao: /^ajustes\/(seguranca|conta|notificacoes)$/,
    rota: (m) => `/ajustes/${m[1]}`,
  },
];

/**
 * Converte o que veio de fora em uma rota do aplicativo, ou `null`.
 *
 * Aceita as formas que as origens produzem: `avaliacao/a1`, `/avaliacao/a1` e
 * `canaaresolve://avaliacao/a1`.
 */
export function comoRota(bruto: string): string | null {
  let caminho = bruto.trim();
  if (!caminho) return null;

  /**
   * Descasca o esquema — e trata http(s) e o esquema próprio de formas
   * diferentes, porque eles **são** diferentes.
   *
   * Num `https://canaaresolve.aionixdev.com/oportunidade/o1` o primeiro
   * segmento é o host, e o caminho começa depois dele. Num
   * `canaaresolve://oportunidade/o1` não existe host: o que vem logo após o
   * `//` já é o caminho.
   *
   * Tratar os dois igual — descartar sempre até a primeira barra — comia o
   * primeiro segmento do esquema próprio, e `canaaresolve://oportunidade/o1`
   * virava `o1`, que não bate com padrão nenhum e devolvia `null`. Era um
   * defeito silencioso herdado da Fase 06: nunca apareceu porque o push manda
   * `oportunidade/o1` **sem** esquema, e é esse caminho que foi exercido. Só um
   * link de verdade, colado ou tocado fora do aplicativo, passava por aqui — e
   * não abria nada.
   */
  const comEsquema = /^([a-z][a-z0-9+.-]*):\/\//i.exec(caminho);
  if (comEsquema) {
    const semEsquema = caminho.slice(comEsquema[0].length);
    const protocolo = comEsquema[1]!.toLowerCase();

    if (protocolo === 'http' || protocolo === 'https') {
      const barra = semEsquema.indexOf('/');
      caminho = barra >= 0 ? semEsquema.slice(barra + 1) : '';
    } else {
      caminho = semEsquema;
    }
  }

  // Sem barra inicial, sem query e sem fragmento.
  caminho = caminho.replace(/^\/+/, '').split('?')[0]!.split('#')[0]!;
  if (!caminho) return null;

  for (const { padrao, rota } of ROTAS) {
    const m = padrao.exec(caminho);
    if (m) return rota(m);
  }
  return null;
}
