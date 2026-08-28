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

import type { CategoriaDePreferencia } from '@/notificacoes/tipos';

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

  /**
   * Que avisos ele quer receber (§36 da Fase 06).
   *
   * Três, e nenhum a mais — a especificação é explícita em não querer quinze
   * interruptores. Segurança **não** está aqui: um alerta de acesso à conta
   * não responde ao mesmo opt-out de uma comunicação comum (§37). Marketing
   * também não, e a ausência é o que impede alguém de mandar campanha usando
   * a autorização dada para receber oportunidade (§38).
   *
   * Isto é **preferência**, não permissão. O sistema operacional pode estar
   * bloqueando a entrega com todos os três ligados — e a tela precisa dizer
   * isso, em vez de fingir que está funcionando (§35, §88).
   */
  avisos: Record<CategoriaDePreferencia, boolean>;
};

export const preferenciasPadrao: PreferenciasDaConta = {
  oportunidadesPausadas: false,
  pausadasEm: null,
  // Tudo ligado por padrão: quem chegou a conceder a permissão do sistema já
  // disse que quer ser avisado. Um padrão desligado faria a permissão parecer
  // quebrada.
  avisos: { oportunidades: true, atualizacoes: true, comunicados: true },
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
