import type { Href } from 'expo-router';

/**
 * O endereço das Configurações, escrito uma vez.
 *
 * Ele existe por causa de um detalhe do gerador de rotas tipadas: para o
 * `index.tsx` de uma pilha, ele emite `/ajustes/index` — que **não é** o
 * endereço que o roteador serve. Quem navega para lá cai em "Unmatched Route";
 * quem navega para `/ajustes` chega. Foi encontrado no navegador, não no
 * compilador, e é exatamente o tipo de erro que passa por tipo e lint.
 *
 * A conversão fica aqui, com esta explicação, e não espalhada em cada tela que
 * precisa voltar para a capa.
 */
export const ROTA_DE_AJUSTES = '/ajustes' as Href;
