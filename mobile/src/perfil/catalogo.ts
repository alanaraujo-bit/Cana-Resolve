/**
 * O catálogo — categorias, serviços sugeridos e bairros.
 *
 * Isto é **conteúdo**, não regra: nenhuma tela decide nada com base em um id
 * daqui, e nenhuma pergunta `if (categoria === 'informatica')`. Quando a API
 * assumir, este arquivo é substituído por uma leitura remota e as telas não
 * mudam — é por isso que ele existe separado.
 *
 * Os serviços sugeridos não são uma lista fechada: são o atalho para os 90%
 * que se repetem. Quem faz algo que não está aqui escreve, e o que escreveu
 * vale igual (ver `Servico.personalizado`).
 */

export type Categoria = {
  id: string;
  /** Como aparece na tela e no perfil público. */
  rotulo: string;
  /** O ofício que o campo sugere quando a categoria é escolhida. */
  oficioSugerido: string;
  /** Atalhos de serviço. Ordem importa: o mais pedido primeiro. */
  servicos: string[];
};

export const categorias: Categoria[] = [
  {
    id: 'ar-condicionado',
    rotulo: 'Ar-condicionado e refrigeração',
    oficioSugerido: 'Técnico em refrigeração',
    servicos: [
      'Limpeza de ar-condicionado',
      'Instalação de ar-condicionado',
      'Manutenção e reparo',
      'Carga de gás',
      'Diagnóstico',
      'Geladeira e freezer',
      'Câmara fria',
    ],
  },
  {
    id: 'eletrica',
    rotulo: 'Elétrica',
    oficioSugerido: 'Eletricista',
    servicos: [
      'Instalação elétrica',
      'Reparo de tomadas e interruptores',
      'Troca de disjuntor',
      'Quadro de energia',
      'Chuveiro elétrico',
      'Iluminação',
      'Instalação de ventilador de teto',
      'Aterramento',
    ],
  },
  {
    id: 'guincho',
    rotulo: 'Guincho e auto socorro',
    oficioSugerido: 'Guincho 24 horas',
    servicos: [
      'Guincho',
      'Chaveiro automotivo',
      'Carga de bateria',
      'Troca de pneu',
      'Pane seca',
      'Transporte de veículo',
    ],
  },
  {
    id: 'mecanica',
    rotulo: 'Mecânica e automotivo',
    oficioSugerido: 'Mecânico',
    servicos: [
      'Revisão geral',
      'Troca de óleo',
      'Freios',
      'Suspensão',
      'Elétrica automotiva',
      'Ar-condicionado automotivo',
      'Injeção eletrônica',
      'Funilaria e pintura',
    ],
  },
  {
    id: 'construcao',
    rotulo: 'Construção e reformas',
    oficioSugerido: 'Pedreiro',
    servicos: [
      'Alvenaria',
      'Reforma em geral',
      'Pintura',
      'Assentamento de piso e azulejo',
      'Gesso e drywall',
      'Telhado',
      'Hidráulica',
      'Marcenaria',
      'Serralheria',
    ],
  },
  {
    id: 'seguranca',
    rotulo: 'Segurança eletrônica',
    oficioSugerido: 'Instalador de segurança eletrônica',
    servicos: [
      'Instalação de câmeras',
      'Manutenção de câmeras',
      'Alarme',
      'Cerca elétrica',
      'Interfone',
      'Fechadura eletrônica',
      'Portão automático',
    ],
  },
  {
    id: 'informatica',
    rotulo: 'Informática',
    oficioSugerido: 'Técnico em informática',
    servicos: [
      'Formatação',
      'Manutenção de computadores',
      'Instalação de rede',
      'Configuração de impressora',
      'Recuperação de arquivos',
      'Remoção de vírus',
      'Suporte técnico',
      'Montagem de computador',
    ],
  },
];

export function categoriaPorId(id: string | null): Categoria | null {
  if (!id) return null;
  return categorias.find((c) => c.id === id) ?? null;
}

/** O rótulo da categoria, ou uma frase honesta quando ainda não há uma. */
export function rotuloDaCategoria(id: string | null): string {
  return categoriaPorId(id)?.rotulo ?? 'Categoria não escolhida';
}

/**
 * Bairros de Canaã dos Carajás.
 *
 * Lista de trabalho, boa o bastante para escolher e testar. A lista oficial
 * ainda precisa ser confirmada com a prefeitura — está anotado em `PERFIL.md`
 * como pendência, não como coisa resolvida. Um bairro que falte aqui não
 * impede ninguém de atender: quem atende tudo marca "toda a cidade".
 */
export const bairros: string[] = [
  'Centro',
  'Novo Horizonte',
  'Cidade Nova',
  'Vale Dourado',
  'Jardim América',
  'Serra Dourada',
  'Bela Vista',
  'Novo Brasil',
  'Planalto',
  'Bom Jesus',
  'Cidade Jardim',
  'Alto Bonito',
  'Vila Bonita',
  'Loteamento Park Hotel',
];

export const CIDADE = 'Canaã dos Carajás';
