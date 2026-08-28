/**
 * Filtros da Central.
 *
 * Existe **um** filtro: o balcão. Ele nasceu de um caso real — quem atende
 * ar-condicionado, elétrica e segurança eletrônica às vezes quer olhar só um
 * deles — e por isso ele só aparece quando a lista à vista tem mais de um.
 *
 * O que foi considerado e ficou de fora, de propósito:
 *
 * - **Estado.** Já é a divisão principal da tela (as três seções). Repetir isso
 *   como filtro seria o mesmo controle duas vezes.
 * - **Urgência.** A ordenação já traz o que espera resposta primeiro, e a
 *   pressa está escrita em cada cartão. Um filtro aqui competiria com a ordem
 *   sem resolver nada que o olho não resolva.
 * - **Período.** Só faria diferença num histórico grande. Quando ele existir, a
 *   leitura já é paginada (`Pagina`, em `repositorio.ts`) e o filtro entra
 *   junto com a paginação — não antes.
 *
 * A busca segue a mesma regra: só entra quando o histórico crescer a ponto de
 * rolar deixar de funcionar. Está registrada como decisão pendente na
 * documentação de domínio, e não como um campo vazio ocupando o topo da tela.
 */
import type { Grupo, Oportunidade } from './tipos';
import { grupoDoEstado } from './tipos';

export type Filtro = {
  /** `null` = todos os balcões. */
  categoria: string | null;
};

export const semFiltro: Filtro = { categoria: null };

export function temFiltro(f: Filtro): boolean {
  return f.categoria !== null;
}

export function doGrupo(lista: Oportunidade[], grupo: Grupo): Oportunidade[] {
  return lista.filter((o) => grupoDoEstado[o.estado] === grupo);
}

export function aplicar(lista: Oportunidade[], f: Filtro): Oportunidade[] {
  if (!f.categoria) return lista;
  return lista.filter((o) => o.categoria === f.categoria);
}

/** Os balcões presentes numa lista, em ordem alfabética. */
export function categoriasDe(lista: Oportunidade[]): string[] {
  return [...new Set(lista.map((o) => o.categoria))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

/** Quantas há em cada seção — o número que a barra de seções mostra. */
export function contarPorGrupo(lista: Oportunidade[]): Record<Grupo, number> {
  return {
    atencao: doGrupo(lista, 'atencao').length,
    andamento: doGrupo(lista, 'andamento').length,
    encerradas: doGrupo(lista, 'encerradas').length,
  };
}
