/**
 * As preferências do aplicativo — o que a pessoa controla sobre o
 * **comportamento** do produto.
 *
 * A linha que separa este módulo do Perfil é a mesma que separa Conta de
 * vitrine: o que o morador vê (serviços, bairros, horário) mora no Perfil e
 * alimenta o encontro entre pedido e profissional. O que está aqui não muda o
 * que o profissional oferece — muda como o aplicativo se comporta com ele.
 *
 * A segunda linha, mais importante para o dia em que o servidor de dados
 * existir, é **onde cada preferência mora**:
 *
 * | Preferência | Onde vive | Por quê |
 * | --- | --- | --- |
 * | Aparência | aparelho | é de quem segura o telefone, não da conta |
 * | Idioma | aparelho (hoje fixo) | idem |
 * | Pausar oportunidades | conta | o servidor precisa saber para parar de mandar |
 * | Notificações (Fase 06) | conta | o envio é decidido no servidor |
 *
 * Misturar as duas no mesmo armazenamento faria a pausa se perder ao trocar de
 * aparelho e o tema viajar junto com o login — os dois errados. Por isso a
 * aparência vive em `theme/preferencia.ts` e o resto aqui, sob uma chave que
 * sai do aparelho quando alguém sai da conta (`session/chaves.ts`).
 */

/** O único idioma que existe de verdade hoje. Ver `IDIOMAS` abaixo. */
export type Idioma = 'pt-BR';

export const IDIOMAS: Record<Idioma, string> = {
  'pt-BR': 'Português (Brasil)',
};

/**
 * As preferências que pertencem à conta.
 *
 * Pequeno de propósito. Cada campo aqui precisou responder "o profissional
 * realmente precisa controlar isso?" — e filtro por bairro, por valor mínimo e
 * por horário responderam que não: seriam regras que estreitam o encontro antes
 * de existir volume para saber se ajudam.
 */
export type PreferenciasDaConta = {
  /**
   * Pausa o recebimento de novas oportunidades. Férias, agenda cheia, doença.
   *
   * Não é "desativar conta": o perfil continua no ar, o histórico continua
   * inteiro, e voltar é um toque. Ver `AJUSTES.md`.
   */
  oportunidadesPausadas: boolean;
  /** Quando a pausa começou — a Home usa para lembrar desde quando. */
  pausadasEm: Date | null;
};

export const preferenciasPadrao: PreferenciasDaConta = {
  oportunidadesPausadas: false,
  pausadasEm: null,
};

/** Uma frase curta sobre o estado do recebimento, para a Home e os Ajustes. */
export function resumoDaPausa(p: PreferenciasDaConta, agora = new Date()): string {
  if (!p.oportunidadesPausadas) return 'Recebendo novas oportunidades';
  if (!p.pausadasEm) return 'Recebimento pausado';

  const dias = Math.floor((agora.getTime() - p.pausadasEm.getTime()) / 86_400_000);
  if (dias <= 0) return 'Pausado hoje';
  if (dias === 1) return 'Pausado desde ontem';
  return `Pausado há ${dias} dias`;
}
