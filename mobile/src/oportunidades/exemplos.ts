/**
 * Dados de exemplo — **só para desenvolvimento visual**.
 *
 * Nada aqui vem de servidor nenhum, e nada aqui deve ser apresentado como se
 * viesse. É este arquivo que alimenta a interface enquanto a API não existe, e
 * é este arquivo que some quando ela existir: as telas falam com os tipos de
 * `tipos.ts`, nunca com estes objetos.
 *
 * As pessoas, os bairros e os problemas são plausíveis e inventados. Os
 * telefones usam o prefixo 5599 e números que não existem.
 */
import type { Carteira, Contato, Evento, Oportunidade } from './tipos';

/** Conjuntos que a interface precisa saber desenhar. */
export type Cenario = 'movimentada' | 'so-historico' | 'primeiro-acesso' | 'erro';

export const cenarios: Cenario[] = ['movimentada', 'so-historico', 'primeiro-acesso', 'erro'];

export const rotuloCenario: Record<Cenario, string> = {
  movimentada: 'semana movimentada',
  'so-historico': 'nada novo, só histórico',
  'primeiro-acesso': 'conta nova, sem nada',
  erro: 'falha ao carregar',
};

const min = (n: number) => new Date(Date.now() - n * 60_000);
const h = (n: number) => min(n * 60);
const d = (n: number) => min(n * 60 * 24);

const profissional = {
  primeiroNome: 'João',
  empresa: 'Clima Sul Refrigeração',
  categorias: ['Ar-condicionado e refrigeração', 'Elétrica', 'Segurança eletrônica'],
  recebendo: true,
};

const contatos: Record<string, Contato> = {
  o3: { primeiroNome: 'Rafaela', telefone: '+5599981234567', whatsapp: true },
  o4: { primeiroNome: 'Domingos', telefone: '+5599984445566', whatsapp: true },
  o6: { primeiroNome: 'Célia', telefone: '+5599987771122', whatsapp: false },
  o7: { primeiroNome: 'Ivan', telefone: '+5599991234567', whatsapp: true },
};

/** Uma linha de história por acontecimento real, e nada além disso. */
function historia(...eventos: Evento[]): Evento[] {
  return eventos;
}

const base: Oportunidade[] = [
  {
    id: 'o1',
    categoria: 'Ar-condicionado e refrigeração',
    necessidade: 'O ar-condicionado liga, mas não está gelando',
    descricao:
      'Ele liga normalmente, o painel acende e o ventilador funciona, só que sai ar quase na temperatura do quarto. Já limpei os filtros no fim de semana e não mudou nada.',
    regiao: 'Novo Horizonte',
    urgencia: 'hoje',
    observacoes: 'Split de 12 mil BTUs, instalado há uns três anos.',
    recebidaEm: min(9),
    atualizadaEm: min(9),
    estado: 'nova',
    contato: null,
    resultado: null,
    motivoRecusa: null,
    historico: historia({ tipo: 'recebida', em: min(9) }),
  },
  {
    // Descrição curta e sem nenhum opcional — a composição precisa aguentar.
    id: 'o2',
    categoria: 'Elétrica',
    necessidade: 'Preciso de um eletricista',
    descricao: null,
    regiao: 'Centro',
    urgencia: 'agora',
    observacoes: null,
    recebidaEm: min(48),
    atualizadaEm: min(48),
    estado: 'nova',
    contato: null,
    resultado: null,
    motivoRecusa: null,
    historico: historia({ tipo: 'recebida', em: min(48) }),
  },
  {
    // Descrição longa de verdade, e o bairro mais comprido da cidade.
    id: 'o3',
    categoria: 'Elétrica',
    necessidade: 'Tomadas da cozinha e da área externa pararam de funcionar',
    descricao:
      'A energia está funcionando normalmente na maior parte da casa, mas algumas tomadas da cozinha e da área externa pararam de funcionar desde ontem. O disjuntor não desarmou e as luzes continuam acendendo em todos os cômodos. Aconteceu logo depois de uma chuva forte, e a caixa de força fica na área de serviço, que é coberta mas pega respingo quando venta muito.',
    regiao: 'Loteamento Vila Nova do Sol Nascente',
    urgencia: 'proximos-dias',
    observacoes: null,
    recebidaEm: h(5),
    atualizadaEm: h(5),
    estado: 'vista',
    contato: null,
    resultado: null,
    motivoRecusa: null,
    historico: historia({ tipo: 'recebida', em: h(5) }, { tipo: 'vista', em: h(4) }),
  },
  {
    id: 'o4',
    categoria: 'Segurança eletrônica',
    necessidade: 'Instalação de câmeras em uma residência',
    descricao:
      'Quero instalar quatro câmeras: duas na frente, uma nos fundos e uma na garagem. A casa já tem internet e um lugar no escritório onde dá para deixar o gravador.',
    regiao: 'Cidade Nova',
    urgencia: 'proximos-dias',
    observacoes: 'Prefiro que a visita seja no fim da tarde.',
    recebidaEm: d(1),
    atualizadaEm: h(20),
    estado: 'em-contato',
    contato: contatos.o4,
    resultado: null,
    motivoRecusa: null,
    historico: historia(
      { tipo: 'recebida', em: d(1) },
      { tipo: 'vista', em: h(23) },
      { tipo: 'interesse', em: h(22) },
      { tipo: 'contato', em: h(20), detalhe: 'Pelo WhatsApp' },
    ),
  },
  {
    id: 'o6',
    categoria: 'Ar-condicionado e refrigeração',
    necessidade: 'Limpeza de dois aparelhos antes do fim do mês',
    descricao: 'São dois splits de quarto, nenhum com defeito. É só a limpeza mesmo.',
    regiao: 'Novo Brasil',
    urgencia: 'sem-pressa',
    observacoes: null,
    recebidaEm: d(2),
    atualizadaEm: d(2),
    estado: 'interessado',
    contato: contatos.o6,
    resultado: null,
    motivoRecusa: null,
    historico: historia(
      { tipo: 'recebida', em: d(2) },
      { tipo: 'vista', em: d(2) },
      { tipo: 'interesse', em: h(40) },
    ),
  },
  {
    id: 'o7',
    categoria: 'Informática',
    necessidade: 'Computador muito lento e travando',
    descricao:
      'Demora uns cinco minutos para abrir e trava quando tenho mais de uma aba aberta. É um computador de mesa, uso para o trabalho.',
    regiao: 'Centro',
    urgencia: 'proximos-dias',
    observacoes: null,
    recebidaEm: d(5),
    atualizadaEm: d(4),
    estado: 'encerrada',
    contato: contatos.o7,
    resultado: 'servico-realizado',
    motivoRecusa: null,
    historico: historia(
      { tipo: 'recebida', em: d(5) },
      { tipo: 'vista', em: d(5) },
      { tipo: 'interesse', em: d(5) },
      { tipo: 'contato', em: d(5), detalhe: 'Pelo WhatsApp' },
      { tipo: 'encerrada', em: d(4), detalhe: 'Serviço realizado' },
    ),
  },
  {
    id: 'o8',
    categoria: 'Elétrica',
    necessidade: 'Troca do chuveiro e do disjuntor',
    descricao: 'O chuveiro parou e o disjuntor desarma toda vez que ligo.',
    regiao: 'Jardim Canaã',
    urgencia: 'hoje',
    observacoes: null,
    recebidaEm: d(6),
    atualizadaEm: d(6),
    estado: 'encerrada',
    contato: null,
    resultado: 'nao-consegui-atender',
    motivoRecusa: 'sem-disponibilidade',
    historico: historia(
      { tipo: 'recebida', em: d(6) },
      { tipo: 'vista', em: d(6) },
      { tipo: 'encerrada', em: d(6), detalhe: 'Sem disponibilidade agora' },
    ),
  },
  {
    id: 'o9',
    categoria: 'Ar-condicionado e refrigeração',
    necessidade: 'Barulho alto na condensadora do ar da sala',
    descricao:
      'A parte de fora começou a fazer um barulho de chacoalhar quando liga. Funciona e gela, mas o barulho incomoda os vizinhos.',
    regiao: 'Vale dos Sonhos',
    urgencia: 'proximos-dias',
    observacoes: null,
    recebidaEm: d(9),
    atualizadaEm: d(9),
    estado: 'encerrada',
    contato: null,
    resultado: 'cliente-nao-respondeu',
    motivoRecusa: null,
    historico: historia(
      { tipo: 'recebida', em: d(9) },
      { tipo: 'vista', em: d(9) },
      { tipo: 'interesse', em: d(9) },
      { tipo: 'contato', em: d(9), detalhe: 'Pelo WhatsApp' },
      { tipo: 'encerrada', em: d(7), detalhe: 'Cliente não respondeu' },
    ),
  },
  {
    id: 'o10',
    categoria: 'Segurança eletrônica',
    necessidade: 'Portão eletrônico abre sozinho de madrugada',
    descricao: null,
    regiao: 'Bairro Bela Vista',
    urgencia: 'sem-pressa',
    observacoes: null,
    recebidaEm: d(14),
    atualizadaEm: d(14),
    estado: 'encerrada',
    contato: null,
    resultado: 'nao-fechamos',
    motivoRecusa: null,
    historico: historia(
      { tipo: 'recebida', em: d(14) },
      { tipo: 'vista', em: d(13) },
      { tipo: 'interesse', em: d(13) },
      { tipo: 'contato', em: d(13), detalhe: 'Por telefone' },
      { tipo: 'encerrada', em: d(11), detalhe: 'Não fechamos' },
    ),
  },
];

/**
 * Cada leitura devolve uma cópia funda: o repositório é a única coisa que
 * muda de estado, e um cenário nunca contamina o outro.
 */
function copiar(o: Oportunidade): Oportunidade {
  return {
    ...o,
    contato: o.contato ? { ...o.contato } : null,
    historico: o.historico.map((e) => ({ ...e })),
  };
}

export function carteiraDeExemplo(cenario: Cenario): Carteira {
  if (cenario === 'primeiro-acesso') {
    return {
      profissional: {
        ...profissional,
        empresa: null,
        categorias: ['Ar-condicionado e refrigeração'],
      },
      oportunidades: [],
      pendencia: {
        id: 'area',
        titulo: 'Defina sua área de atendimento',
        explicacao:
          'Sem os bairros que você atende, só chegam oportunidades de quem estiver bem perto de você.',
        acao: 'Definir agora',
      },
      contaNova: true,
    };
  }

  if (cenario === 'so-historico') {
    return {
      profissional,
      oportunidades: base
        .filter((o) => o.estado !== 'nova' && o.estado !== 'vista')
        .map(copiar),
      pendencia: null,
      contaNova: false,
    };
  }

  return {
    profissional,
    oportunidades: base.map(copiar),
    pendencia: null,
    contaNova: false,
  };
}

/**
 * O id que não existe em cenário nenhum — serve para conferir a tela de
 * "esta oportunidade não está mais disponível" sem inventar erro.
 */
export const idInexistente = 'o-inexistente';
