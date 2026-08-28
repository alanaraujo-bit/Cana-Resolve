/**
 * O quanto o perfil está pronto — e por quê isso importa.
 *
 * Não é gamificação. Não há medalha, nível, nem "complete 100% e ganhe".
 * Cada item desta lista só está aqui porque a falta dele tem uma consequência
 * concreta e dizível: ou o encaminhamento erra, ou o morador não confia, ou
 * ele não consegue chamar. A tela mostra a consequência, não a pontuação.
 *
 * Por isso cada item carrega `porque` — se não der para escrever a
 * consequência em uma linha honesta, o item não deveria existir.
 */

import { categoriaPorId } from './catalogo';
import type { Perfil } from './tipos';

/** Onde o item se resolve. A tela usa para levar direto ao lugar certo. */
export type Secao =
  | 'identidade'
  | 'servicos'
  | 'atendimento'
  | 'horario'
  | 'contato'
  | 'apresentacao';

export type ItemDeCompletude = {
  id: string;
  /** O que falta, em uma frase curta. */
  titulo: string;
  /** O que muda quando estiver preenchido. Nunca uma ameaça. */
  porque: string;
  secao: Secao;
  /** `true` quando sem isso o perfil não funciona de verdade. */
  essencial: boolean;
  pronto: boolean;
};

export function itensDeCompletude(p: Perfil): ItemDeCompletude[] {
  const temWhatsapp = Boolean(p.contatos.whatsapp);
  const temTelefone = Boolean(
    p.contatos.telefoneIgualWhatsapp ? p.contatos.whatsapp : p.contatos.telefone,
  );

  return [
    {
      id: 'nome',
      titulo: 'Seu nome',
      porque: 'É a primeira coisa que o morador lê.',
      secao: 'identidade',
      essencial: true,
      pronto: p.nome.trim().length > 1,
    },
    {
      id: 'categoria',
      titulo: 'Sua categoria',
      porque: 'É por ela que as oportunidades chegam até você.',
      secao: 'identidade',
      essencial: true,
      pronto: categoriaPorId(p.categoriaId) !== null,
    },
    {
      id: 'servicos',
      titulo: 'O que você faz',
      porque: 'Sem isso, chegam pedidos que não são do seu tipo de serviço.',
      secao: 'servicos',
      essencial: true,
      pronto: p.servicos.length > 0,
    },
    {
      id: 'atendimento',
      titulo: 'Onde você atende',
      porque: 'Evita chamado longe demais para valer a viagem.',
      secao: 'atendimento',
      essencial: true,
      pronto: p.atendimento.cidadeInteira || p.atendimento.bairros.length > 0,
    },
    {
      id: 'contato',
      titulo: 'Seu WhatsApp',
      porque: 'É por onde o morador fala com você.',
      secao: 'contato',
      essencial: true,
      pronto: temWhatsapp || temTelefone,
    },
    {
      id: 'descricao',
      titulo: 'Uma descrição do seu trabalho',
      porque: 'Quem lê uma descrição chama com mais confiança.',
      secao: 'apresentacao',
      essencial: false,
      pronto: p.descricao.trim().length >= 40,
    },
    {
      id: 'imagem',
      titulo: p.tipo === 'empresa' ? 'A logo da empresa' : 'Uma foto sua',
      porque: 'Um rosto ou uma marca deixa o perfil menos anônimo.',
      secao: 'identidade',
      essencial: false,
      pronto: p.imagem !== null,
    },
    {
      id: 'portfolio',
      titulo: 'Fotos de trabalhos que você fez',
      porque: 'É o que mais convence quem está decidindo.',
      secao: 'apresentacao',
      essencial: false,
      pronto: p.portfolio.length > 0,
    },
    {
      id: 'horario',
      titulo: 'Seu horário de atendimento',
      porque: 'O morador sabe a hora certa de chamar.',
      secao: 'horario',
      essencial: false,
      pronto: p.disponibilidade.atende24h || p.disponibilidade.dias.length > 0,
    },
  ];
}

export type Completude = {
  itens: ItemDeCompletude[];
  /** Só o que falta, na ordem em que vale a pena resolver. */
  pendentes: ItemDeCompletude[];
  /** Falta alguma coisa sem a qual o perfil não funciona. */
  faltaEssencial: boolean;
  prontos: number;
  total: number;
  /** 0 a 1. Serve para desenhar o traço — nunca para exibir "73%". */
  fracao: number;
};

export function completude(p: Perfil): Completude {
  const itens = itensDeCompletude(p);
  const pendentes = itens
    .filter((i) => !i.pronto)
    .sort((a, b) => Number(b.essencial) - Number(a.essencial));
  const prontos = itens.length - pendentes.length;

  return {
    itens,
    pendentes,
    faltaEssencial: pendentes.some((i) => i.essencial),
    prontos,
    total: itens.length,
    fracao: prontos / itens.length,
  };
}

/**
 * A frase de estado do perfil. Uma só, e adulta: nem parabéns por preencher um
 * formulário, nem cobrança por não ter preenchido.
 */
export function resumoDeCompletude(c: Completude): { titulo: string; texto: string } {
  if (c.pendentes.length === 0) {
    return {
      titulo: 'Seu perfil está completo.',
      texto: 'É assim que o morador vê você quando uma oportunidade aparece.',
    };
  }

  if (c.faltaEssencial) {
    const primeiro = c.pendentes[0]!;
    return {
      titulo: 'Falta o essencial para receber bem.',
      texto: `${primeiro.titulo}: ${primeiro.porque.toLowerCase()}`,
    };
  }

  return {
    titulo: 'Seu perfil já funciona.',
    texto: 'O que falta é o que ajuda o morador a escolher você.',
  };
}
