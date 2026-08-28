/**
 * Os eventos da reputação — o contrato, não a infraestrutura.
 *
 * Como nos outros módulos, este arquivo **não inventa** analytics: ele declara
 * o que um dia será medido e, em desenvolvimento, imprime o que teria sido
 * enviado. Quando houver destino real, ele entra em `despachar` — e nenhuma
 * tela muda.
 *
 * **A regra desta fase é o que os eventos NÃO carregam (§78, §79).**
 *
 * Nenhum evento daqui leva comentário, resposta, nome de cliente, telefone,
 * id de morador, categoria do serviço ou qualquer trecho de texto escrito por
 * alguém. Um evento de analytics viaja para fora, é retido por terceiros e
 * sobrevive à conta que o gerou — mandar o comentário de um cliente junto
 * seria publicar aquele texto num lugar que ninguém consegue apagar depois.
 *
 * O que sobra é a **forma** do que aconteceu: um número, um estado, um motivo
 * escolhido de uma lista fechada. E `avaliacaoId` — que sozinho não é dado
 * pessoal e é o que permite ligar "recebeu" a "abriu" sem carregar o conteúdo.
 * Nem ele chega ao evento de denúncia: motivo já basta para saber quais razões
 * aparecem, e cruzar denúncia com avaliação específica é assunto de moderação,
 * não de métrica de produto.
 *
 * O que estes eventos deveriam responder, quando existirem:
 *
 * - quantos profissionais chegam a abrir a avaliação que receberam;
 * - se responder está ao alcance de quem quer responder, ou se a maioria começa
 *   e desiste — a distância entre `resposta_iniciada` e `resposta_publicada`;
 * - quais motivos de denúncia aparecem de verdade, para saber se a lista de
 *   seis está certa;
 * - se alguém procura entender o que "verificado" quer dizer — porque se
 *   ninguém abrir a explicação, o selo pode estar sendo lido como garantia.
 */

import type { MotivoDeDenuncia } from './tipos';

export type Evento =
  /** Chegou uma avaliação nova (por push ou por leitura da lista). */
  | { nome: 'avaliacao_recebida'; avaliacaoId: string }
  /** Abriu o detalhe de uma avaliação. */
  | { nome: 'avaliacao_vista'; avaliacaoId: string }
  /** Abriu a lista completa. `total` é contagem, não conteúdo. */
  | { nome: 'avaliacoes_abertas'; total: number }
  /** Começou a escrever uma resposta. */
  | { nome: 'resposta_iniciada'; avaliacaoId: string }
  /** Publicou a resposta. `tamanho` é o número de caracteres — nunca o texto. */
  | { nome: 'resposta_publicada'; avaliacaoId: string; tamanho: number; edicao: boolean }
  /** Removeu a própria resposta. */
  | { nome: 'resposta_removida'; avaliacaoId: string }
  /** Enviou uma contestação. Sem id e sem o texto do complemento. */
  | { nome: 'avaliacao_denunciada'; motivo: MotivoDeDenuncia }
  /** Abriu a explicação de um selo — o §31 sendo medido. */
  | { nome: 'verificacao_explicada' }
  /** Abriu "Como funcionam as avaliações" (§125). */
  | { nome: 'reputacao_explicada' };

function despachar(evento: Evento) {
  if (__DEV__) {
    console.log('[analytics]', evento.nome, evento);
  }
  // Produção: sem destino configurado, o evento é descartado em silêncio. Sem
  // fila, sem retentativa e sem promessa de entrega.
}

export function registrar(evento: Evento) {
  despachar(evento);
}
