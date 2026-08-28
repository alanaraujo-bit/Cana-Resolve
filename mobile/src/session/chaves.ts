/**
 * Tudo que o aplicativo grava neste aparelho, em uma lista só.
 *
 * Existe por causa de uma pergunta que a Fase 05 precisou responder com
 * precisão: **o que morre quando alguém sai da conta?**
 *
 * Sair não é resetar o aplicativo. Quem sai e entra de novo não deve rever a
 * apresentação nem encontrar o tema trocado — isso não é dele, é do aparelho.
 * Mas o rascunho de perfil de quem saiu não pode aparecer para quem entra
 * depois: seriam os dados de um parceiro dentro da tela de outro.
 *
 * A separação só é confiável se estiver escrita em um lugar. Cada módulo
 * continua dono do que grava; o que ele não decide sozinho é de que lado da
 * linha a chave dele fica.
 */

export const chaves = {
  /** Já viu a apresentação. **Sobrevive** ao logout: é do aparelho. */
  onboarding: 'cr.onboarding.completed.v1',
  /** Sistema / claro / escuro. **Sobrevive**: é preferência de quem segura o
   *  aparelho, não da conta. Ver `theme/preferencia.ts`. */
  tema: 'cr.tema.v1',
  /**
   * O identificador desta instalação, para o registro de push. **Sobrevive**:
   * ele descreve o aparelho, não quem está logado — e é justamente por
   * sobreviver que a troca de conta consegue reapontar o mesmo aparelho no
   * servidor, em vez de deixar dois registros vivos entregando para dois
   * donos. Ver `notificacoes/instalacao.ts`.
   */
  instalacao: 'cr.instalacao.v1',
  /**
   * Já convidamos a ativar as notificações, e a pessoa respondeu.
   * **Sobrevive**: "agora não" é resposta de quem segura o aparelho, e
   * reperguntar a cada login seria o insistir que o §33 proíbe.
   */
  convitePush: 'cr.push.convite.v1',

  /** Rascunho local do perfil, enquanto não há API de dados. **Morre.** */
  perfilRascunho: 'cr.perfil.rascunho.v1',
  /** Preferências que pertencem à conta e um dia sincronizam. **Morre.** */
  preferenciasDaConta: 'cr.preferencias.conta.v1',
  /**
   * Avaliações e respostas enquanto não há API de dados. **Morre**, e esta é a
   * chave que mais precisa morrer de todas: dentro dela há **comentários de
   * clientes** sobre atendimentos de um parceiro específico. O rascunho do
   * perfil que vazou na Fase 05 eram os dados do próprio parceiro; aqui seriam
   * os dados de terceiros, na tela de quem nunca os atendeu.
   * Ver `reputacao/repositorio.ts`.
   */
  avaliacoesRascunho: 'cr.reputacao.rascunho.v1',

  /**
   * Para onde uma notificação ou um link queria levar, guardado enquanto a
   * pessoa autentica. **Morre.** É o §19 em forma de chave: o destino de um
   * push da conta anterior não pode sobreviver à troca de conta e abrir dados
   * de quem saiu. Ver `notificacoes/destino.ts`.
   */
  destinoPendente: 'cr.destino.pendente.v1',

  /** Credencial de sessão. Vive no `SecureStore`, nunca no armazenamento comum. */
  sessao: 'cr.session.v1',
} as const;

/**
 * O que é da conta e sai com ela. O que não está aqui fica — de propósito, e
 * não por esquecimento.
 */
export const chavesDaConta: readonly string[] = [
  chaves.perfilRascunho,
  chaves.preferenciasDaConta,
  chaves.avaliacoesRascunho,
  chaves.destinoPendente,
];
