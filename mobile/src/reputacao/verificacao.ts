/**
 * O que "verificado" quer dizer — e o que ele não quer dizer.
 *
 * O tipo `Verificacao` mora em `perfil/tipos.ts`, porque é um campo do perfil.
 * O **significado** mora aqui, junto da reputação, porque é aqui que ele é
 * usado: um selo é um sinal de confiança, e sinal de confiança é o assunto
 * deste módulo.
 *
 * Duas regras governam este arquivo inteiro:
 *
 * 1. **§31 — nenhum selo sem explicação.** Se a tela escreve "Informações
 *    verificadas", o usuário precisa conseguir descobrir *o que* foi conferido.
 *    Por isso cada tipo carrega rótulo público e descrição pública, e a folha
 *    de explicação lê daqui em vez de repetir texto solto na tela.
 * 2. **§32 — verificação não é garantia.** O Canaã Resolve confere um dado; ele
 *    não executa o serviço, não fiscaliza a obra e não responde pelo resultado.
 *    A frase que diz isso está neste arquivo e é obrigatória na explicação —
 *    não é um rodapé opcional que alguém pode esquecer de renderizar.
 *
 * E o que **não** existe aqui: nenhum tipo de verificação que o processo real
 * não suporte (§30, §81). Hoje o processo real é nenhum — não há envio de
 * documento, não há quem analise, e a interface diz isso com todas as letras.
 * Os três tipos abaixo são o vocabulário, não uma promessa.
 */

// Relativo pelo mesmo motivo de `elegibilidade.ts`: o `tsc` do repositório do
// site alcança este arquivo pelo teste que confere o significado dos selos.
import type {
  EstadoVerificacao,
  ItemDeVerificacao,
  TipoDeVerificacao,
} from '../perfil/tipos';

/* -------------------------------------------------------------------------- */
/*  O que cada tipo significa                                                 */
/* -------------------------------------------------------------------------- */

/**
 * O rótulo público. Curto, literal e sem adjetivo.
 *
 * Repare no que nenhum deles diz: "confiável", "aprovado", "certificado".
 * Cada um nomeia **o dado conferido**, e não uma qualidade da pessoa.
 */
export const rotuloPublico: Record<TipoDeVerificacao, string> = {
  contato: 'Contato confirmado',
  identidade: 'Identidade confirmada',
  empresa: 'Empresa confirmada',
};

/** O que exatamente foi conferido. É a resposta ao §31. */
export const descricaoPublica: Record<TipoDeVerificacao, string> = {
  contato:
    'O Canaã Resolve ligou ou escreveu para o número deste perfil e confirmou que ele responde.',
  identidade:
    'O Canaã Resolve conferiu um documento de identidade e confirmou que ele é da pessoa deste perfil.',
  empresa:
    'O Canaã Resolve conferiu o registro da empresa e confirmou que ela existe com este nome.',
};

/**
 * O que a verificação **não** cobre, por tipo.
 *
 * Existe porque a pergunta que um morador faz ao ver um selo não é "o que vocês
 * conferiram?" — é "posso confiar?". Responder só a primeira deixa a segunda ser
 * respondida pela imaginação dele.
 */
export const limitePublico: Record<TipoDeVerificacao, string> = {
  contato: 'Não diz nada sobre a qualidade do serviço.',
  identidade: 'Não é avaliação de trabalho, nem antecedentes.',
  empresa: 'Não é fiscalização, nem garantia de execução.',
};

/**
 * **A frase do §32.** Obrigatória em toda explicação de verificação.
 *
 * Ela existe porque a confusão que ela evita é a mais cara do produto: um
 * morador que entende "verificado" como "garantido" contrata acreditando que o
 * Canaã Resolve responde pelo serviço — e o Canaã Resolve não responde. Errar
 * isso uma vez custa mais do que nunca ter mostrado selo nenhum.
 */
export const NAO_E_GARANTIA =
  'Verificação não é garantia de serviço. O Canaã Resolve conecta você a profissionais da cidade e confere as informações que consegue conferir — quem executa o serviço é o profissional.';

/* -------------------------------------------------------------------------- */
/*  Estados                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * O que o **profissional** lê sobre cada estado (§82, §83, §84).
 *
 * Linguagem administrativa não sai daqui para a tela: "rejeitada" é o nome
 * interno do estado, e o que a pessoa lê é "não conseguimos confirmar" — que
 * descreve o que aconteceu sem dizer o que ela é.
 */
export const rotuloEstadoInterno: Record<EstadoVerificacao, string> = {
  'nao-iniciada': 'Não enviada',
  'em-analise': 'Em análise',
  verificado: 'Confirmada',
  rejeitada: 'Não confirmada',
  'precisa-atualizacao': 'Precisa de atualização',
};

export const explicacaoEstado: Record<EstadoVerificacao, string> = {
  'nao-iniciada': 'Você ainda não enviou nada para conferirmos.',
  'em-analise': 'Recebemos suas informações. Avisamos assim que houver resposta.',
  verificado: 'Confirmada. Ela aparece no seu perfil para os moradores.',
  // §84 — objetivo, e com o próximo passo. Nunca "você não é confiável".
  rejeitada:
    'Não conseguimos confirmar estas informações. Você pode enviar de novo quando tiver os dados corretos em mãos.',
  'precisa-atualizacao':
    'Estas informações mudaram ou venceram. Envie de novo para o selo continuar valendo.',
};

/**
 * O que chega ao morador (§82, §86).
 *
 * Só `verificado` vira sinal público. `em-analise`, `rejeitada` e
 * `precisa-atualizacao` são conversa entre o Canaã Resolve e o parceiro — expor
 * "verificação recusada" num perfil público seria uma punição que ninguém
 * decidiu aplicar.
 */
export function ehPublica(item: ItemDeVerificacao): boolean {
  return item.estado === 'verificado';
}

/** Só o que foi realmente confirmado (§30). Nunca o que foi só enviado. */
export function itensPublicos(itens: readonly ItemDeVerificacao[]): ItemDeVerificacao[] {
  return itens.filter(ehPublica);
}

/**
 * O selo único que resume as verificações públicas (§33, §88).
 *
 * **Um**, e não um por tipo. Três selos lado a lado — "Contato confirmado",
 * "Identidade confirmada", "Empresa confirmada" — viram a coleção de emblemas
 * que o §33 proíbe pelo nome, e o parceiro com dois passa a parecer inferior ao
 * de três. O selo diz que existe verificação; a folha diz qual.
 *
 * `null` quando não há nenhuma — e aí a ausência é ausência, não um selo cinza
 * de "não verificado" pendurado no perfil de quem chegou hoje (§28).
 */
export function seloDeVerificacao(itens: readonly ItemDeVerificacao[]): string | null {
  const publicos = itensPublicos(itens);
  if (publicos.length === 0) return null;
  return publicos.length === 1
    ? rotuloPublico[publicos[0]!.tipo]
    : 'Informações verificadas';
}

/** O rótulo acessível do selo: diz o que foi conferido, não só que há selo (§95, §96). */
export function seloAcessivel(itens: readonly ItemDeVerificacao[]): string | null {
  const publicos = itensPublicos(itens);
  if (publicos.length === 0) return null;
  return `Verificado pelo Canaã Resolve: ${publicos.map((i) => rotuloPublico[i.tipo].toLowerCase()).join(', ')}`;
}

/* -------------------------------------------------------------------------- */
/*  Parceiro Fundador                                                         */
/* -------------------------------------------------------------------------- */

/**
 * O que o selo de Fundador significa — e a frase existe porque a confusão que
 * ela evita é o §29 inteiro.
 *
 * Fundador é **histórico**, não qualidade. Não é nota, não é prioridade, não é
 * "melhor profissional". É a constatação de que alguém estava aqui quando a
 * rede começou, e isso é verdade sobre o passado, não sobre o serviço de
 * amanhã.
 */
export const FUNDADOR_ROTULO = 'Parceiro fundador';

export const FUNDADOR_SIGNIFICADO =
  'Participou da formação inicial da rede Canaã Resolve.';

export const FUNDADOR_LIMITE =
  'Não é uma nota, não significa melhor avaliação e não dá prioridade no encaminhamento.';
