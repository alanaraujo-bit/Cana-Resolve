/**
 * Os eventos das Configurações — o contrato, não a infraestrutura.
 *
 * Como nos outros módulos, nada aqui envia coisa alguma: declara o que um dia
 * será medido e, em desenvolvimento, imprime o que teria sido enviado.
 *
 * **A regra desta tela é mais dura que a das outras.** Configurações guardam a
 * conta, a segurança e a privacidade da pessoa: nenhum evento pode carregar
 * e-mail, senha, token, ou qualquer conteúdo do que foi mexido. Só a forma do
 * que aconteceu — "trocou o tema", nunca "trocou o tema para X às 3h no
 * aparelho Y" (§90 da Fase 05).
 */

export type Evento =
  /** Abriu as Configurações. */
  | { nome: 'ajustes_abertos' }
  /** Entrou em uma das áreas. */
  | { nome: 'ajuste_area_aberta'; area: string }
  /** Trocou o tema. O valor é uma das três palavras, e nada mais. */
  | { nome: 'tema_alterado'; tema: 'system' | 'light' | 'dark' }
  /** Ligou ou desligou a pausa de oportunidades. */
  | { nome: 'oportunidades_pausadas'; pausadas: boolean }
  /** Concluiu a troca de senha. Nunca a senha, nunca o e-mail. */
  | { nome: 'senha_alterada' }
  /** Saiu da conta. */
  | { nome: 'saida_concluida' }
  /** Abriu um documento ou canal externo. Só o nome do destino. */
  | { nome: 'link_aberto'; destino: 'termos' | 'privacidade' | 'suporte' | 'site' }
  /** Abriu a tela de exclusão de conta — o interesse, não a exclusão. */
  | { nome: 'exclusao_consultada' };

function despachar(evento: Evento) {
  if (__DEV__) {
    console.log('[analytics]', evento.nome, evento);
  }
  // Produção: sem destino configurado, o evento é descartado em silêncio.
}

export function registrar(evento: Evento) {
  despachar(evento);
}
