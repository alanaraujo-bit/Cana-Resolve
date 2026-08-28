/**
 * Os eventos do perfil — o contrato, não a infraestrutura.
 *
 * Como no módulo de oportunidades, este arquivo **não inventa** analytics: ele
 * declara o que um dia será medido e, em desenvolvimento, imprime o que teria
 * sido enviado. Quando houver destino real, ele entra em `despachar` — e
 * nenhuma tela muda.
 *
 * O que estes eventos deveriam responder, quando existirem:
 *
 * - quantos parceiros param no meio do preenchimento, e **em qual seção**;
 * - se quem completa o perfil converte mais oportunidades em contato;
 * - se a prévia pública muda o comportamento de quem a abre;
 * - quais campos ninguém preenche — porque esses talvez não devessem ser pedidos.
 *
 * Nenhum evento carrega conteúdo do parceiro: nem nome, nem telefone, nem
 * descrição, nem imagem. Só a forma do que aconteceu.
 */

import type { Secao } from './completude';

export type Evento =
  /** Abriu a área do perfil. */
  | { nome: 'perfil_aberto' }
  /** Entrou para editar uma seção. */
  | { nome: 'edicao_iniciada'; secao: Secao }
  /** Salvou o perfil inteiro. */
  | { nome: 'perfil_salvo' }
  /** Saiu da edição com alterações que não salvou. */
  | { nome: 'edicao_abandonada'; secao: Secao }
  /** Trocou entre pessoa e empresa. */
  | { nome: 'tipo_alterado'; tipo: 'profissional' | 'empresa' }
  /** Escolheu a categoria principal. */
  | { nome: 'categoria_escolhida'; categoria: string }
  /** Quantos serviços ficaram marcados, e quantos foram escritos à mão. */
  | { nome: 'servicos_definidos'; total: number; personalizados: number }
  /** Cidade inteira ou bairros escolhidos a dedo. */
  | { nome: 'atendimento_definido'; cidadeInteira: boolean; bairros: number }
  /** Trocou a foto ou a logo. */
  | { nome: 'imagem_definida'; onde: 'retrato' | 'portfolio' }
  /** Tirou uma foto do portfólio. */
  | { nome: 'foto_removida' }
  /** Abriu "Ver como aparece". */
  | { nome: 'previa_aberta' };

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
