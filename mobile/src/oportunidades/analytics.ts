/**
 * Os eventos que um dia vão medir se o Canaã Resolve entrega valor.
 *
 * Não existe infraestrutura de analytics no aplicativo, e este arquivo **não a
 * inventa**: ele declara o contrato e, em desenvolvimento, imprime o que teria
 * sido enviado. Quando houver um destino real, ele entra em `despachar` — e
 * nenhuma tela muda.
 *
 * O cuidado que este arquivo carrega é conceitual, não técnico: abrir a mesma
 * oportunidade cinco vezes não são cinco oportunidades recebidas, nem cinco
 * visualizações. Por isso `oportunidade_vista` é emitido **uma vez por
 * oportunidade**, na primeira abertura — a mesma transição que muda o estado
 * de `nova` para `vista`. Recebimento é acontecimento do servidor e não é
 * emitido daqui de jeito nenhum.
 */
import type { MotivoRecusa, Resultado } from './tipos';

export type Evento =
  /** Primeira abertura desta oportunidade por este profissional. */
  | { nome: 'oportunidade_vista'; id: string; categoria: string; urgencia: string }
  /** Tocou em "Consigo atender". */
  | { nome: 'interesse_demonstrado'; id: string; categoria: string }
  /** Abriu o WhatsApp ou o discador — a intenção foi explícita. */
  | { nome: 'contato_iniciado'; id: string; canal: 'whatsapp' | 'telefone' }
  /** Recusou, com ou sem motivo. */
  | { nome: 'nao_consigo_atender'; id: string; motivo: MotivoRecusa | null }
  /** Encerrou informando como terminou. */
  | { nome: 'oportunidade_encerrada'; id: string; resultado: Resultado }
  /** Abriu a Central por um caminho que não é a barra de abas. */
  | { nome: 'oportunidade_aberta_por_link'; id: string };

/** Onde os eventos serão entregues quando existir para onde entregar. */
function despachar(evento: Evento) {
  if (__DEV__) {
    console.log('[analytics]', evento.nome, evento);
  }
  // Produção: sem destino configurado, o evento é descartado em silêncio. Não
  // há fila, não há retentativa e não há promessa de entrega — inventar isso
  // seria fingir uma medição que ainda não existe.
}

/** Guarda o que já foi emitido uma vez só, dentro desta sessão. */
const umaVez = new Set<string>();

export function registrar(evento: Evento) {
  if (evento.nome === 'oportunidade_vista') {
    const chave = `vista:${evento.id}`;
    if (umaVez.has(chave)) return;
    umaVez.add(chave);
  }
  despachar(evento);
}
