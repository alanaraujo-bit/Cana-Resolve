/**
 * Perfis de exemplo — **só desenvolvimento**.
 *
 * Nada daqui é dado real e nada daqui chega a produção: quem lê estes objetos
 * é o repositório, e só quando não há API configurada e `__DEV__` é verdadeiro.
 * As telas nunca importam este arquivo.
 *
 * Os exemplos existem para provar a interface contra o que ela vai encontrar:
 * um perfil completo de empresa, um perfil de autônomo pela metade, um perfil
 * recém-criado (vazio, mas válido) e um caso feio de propósito — nome
 * comprido, descrição longa, muitos serviços, muitos bairros.
 */

import type { Perfil } from './tipos';
import { perfilVazio } from './tipos';

export type Cenario = 'empresa' | 'autonomo' | 'novo' | 'extremos' | 'erro';

export const cenarios: Cenario[] = ['empresa', 'autonomo', 'novo', 'extremos', 'erro'];

export const rotuloCenario: Record<Cenario, string> = {
  empresa: 'Empresa completa',
  autonomo: 'Autônomo pela metade',
  novo: 'Perfil recém-criado',
  extremos: 'Textos longos',
  erro: 'Falha ao carregar',
};

/** Empresa com tudo preenchido — o alvo que a tela deve saber apresentar. */
function empresa(): Perfil {
  return {
    ...perfilVazio('Clima Norte Refrigeração'),
    tipo: 'empresa',
    responsavel: 'Marcos Adriano da Silva',
    imagem: null,
    categoriaId: 'ar-condicionado',
    oficio: 'Ar-condicionado e refrigeração',
    descricao:
      'Trabalhamos com instalação, limpeza e manutenção de ar-condicionado residencial e comercial em Canaã dos Carajás. Atendemos também câmara fria e refrigeração comercial. Equipe própria e ferramenta completa.',
    servicos: [
      { id: 's1', rotulo: 'Limpeza de ar-condicionado', personalizado: false },
      { id: 's2', rotulo: 'Instalação de ar-condicionado', personalizado: false },
      { id: 's3', rotulo: 'Manutenção e reparo', personalizado: false },
      { id: 's4', rotulo: 'Carga de gás', personalizado: false },
      { id: 's5', rotulo: 'Câmara fria', personalizado: false },
    ],
    atendimento: {
      cidade: 'Canaã dos Carajás',
      cidadeInteira: true,
      bairros: [],
    },
    contatos: {
      whatsapp: '+5594991234567',
      telefone: null,
      telefoneIgualWhatsapp: true,
      email: 'contato@climanorte.com.br',
      instagram: 'climanorte',
      site: 'https://climanorte.com.br',
    },
    disponibilidade: {
      atende24h: false,
      dias: ['seg', 'ter', 'qua', 'qui', 'sex', 'sab'],
      janela: { abre: '08:00', fecha: '18:00' },
      porDia: null,
    },
    portfolio: [],
    verificacao: { estado: 'verificado', em: new Date('2026-03-12T10:00:00') },
    parceiroFundador: true,
  };
}

/** Autônomo que preencheu o essencial e parou. O caso mais comum de verdade. */
function autonomo(): Perfil {
  return {
    ...perfilVazio('João Batista'),
    tipo: 'profissional',
    categoriaId: 'eletrica',
    oficio: 'Eletricista',
    descricao: '',
    servicos: [
      { id: 's1', rotulo: 'Instalação elétrica', personalizado: false },
      { id: 's2', rotulo: 'Reparo de tomadas e interruptores', personalizado: false },
      { id: 's3', rotulo: 'Chuveiro elétrico', personalizado: false },
    ],
    atendimento: {
      cidade: 'Canaã dos Carajás',
      cidadeInteira: false,
      bairros: ['Novo Horizonte', 'Cidade Nova', 'Centro'],
    },
    contatos: {
      whatsapp: '+5594988887777',
      telefone: null,
      telefoneIgualWhatsapp: true,
      email: null,
      instagram: null,
      site: null,
    },
    disponibilidade: {
      atende24h: false,
      dias: ['seg', 'ter', 'qua', 'qui', 'sex'],
      janela: { abre: '07:00', fecha: '17:00' },
      porDia: null,
    },
    portfolio: [],
    verificacao: { estado: 'nao-iniciada', em: null },
    parceiroFundador: false,
  };
}

/**
 * O caso feio: nome longo, descrição longa, serviço personalizado, muitos
 * bairros e horário por dia. Se a composição aguenta isto, aguenta o resto.
 */
function extremos(): Perfil {
  return {
    ...perfilVazio('Assistência Técnica e Instalações Prediais Vale do Carajás'),
    tipo: 'empresa',
    responsavel: 'Maria das Graças Nascimento de Oliveira',
    categoriaId: 'construcao',
    oficio: 'Construção, reformas e manutenção predial',
    descricao:
      'Atuamos há mais de doze anos em Canaã dos Carajás com reformas residenciais e comerciais, manutenção predial preventiva e corretiva, pequenos reparos, hidráulica, elétrica, pintura, gesso e acabamento em geral. Trabalhamos com equipe registrada, emitimos nota fiscal e damos garantia de três meses no serviço executado. Atendemos condomínios, comércios e obras particulares.',
    servicos: [
      { id: 's1', rotulo: 'Alvenaria', personalizado: false },
      { id: 's2', rotulo: 'Reforma em geral', personalizado: false },
      { id: 's3', rotulo: 'Pintura', personalizado: false },
      { id: 's4', rotulo: 'Assentamento de piso e azulejo', personalizado: false },
      { id: 's5', rotulo: 'Gesso e drywall', personalizado: false },
      { id: 's6', rotulo: 'Telhado', personalizado: false },
      { id: 's7', rotulo: 'Hidráulica', personalizado: false },
      { id: 's8', rotulo: 'Manutenção predial preventiva', personalizado: true },
    ],
    atendimento: {
      cidade: 'Canaã dos Carajás',
      cidadeInteira: false,
      bairros: [
        'Centro',
        'Novo Horizonte',
        'Cidade Nova',
        'Vale Dourado',
        'Jardim América',
        'Loteamento Park Hotel',
      ],
    },
    contatos: {
      whatsapp: '+5594999998888',
      telefone: '+559433334444',
      telefoneIgualWhatsapp: false,
      email: 'orcamento@valedocarajas.com.br',
      instagram: 'valedocarajas.obras',
      site: 'https://valedocarajasobras.com.br',
    },
    disponibilidade: {
      atende24h: false,
      dias: ['seg', 'ter', 'qua', 'qui', 'sex', 'sab'],
      janela: { abre: '07:30', fecha: '17:30' },
      porDia: { sab: { abre: '08:00', fecha: '12:00' } },
    },
    portfolio: [],
    verificacao: { estado: 'em-analise', em: new Date('2026-08-20T09:30:00') },
    parceiroFundador: false,
  };
}

export function perfilDeExemplo(cenario: Cenario, nome: string): Perfil {
  switch (cenario) {
    case 'empresa':
      return empresa();
    case 'autonomo':
      return autonomo();
    case 'extremos':
      return extremos();
    case 'novo':
    case 'erro':
    default:
      return perfilVazio(nome);
  }
}
