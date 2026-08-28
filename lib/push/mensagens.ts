/**
 * O que uma notificação do Canaã Resolve pode dizer, e o que ela carrega por
 * dentro.
 *
 * Este arquivo é o contrato — o mesmo que `mobile/src/notificacoes/tipos.ts`
 * lê do outro lado. Ele não tem `server-only` de propósito: é forma, não
 * segredo, e o dia em que a landing precisar formatar um aviso ele já serve.
 *
 * **A regra que governa tudo aqui é o §10.** O texto que aparece na tela
 * bloqueada é lido por quem estiver por perto. Uma necessidade de morador pode
 * conter o que ninguém deveria ler por cima do ombro — "a câmera apontada para
 * o quarto da minha filha" é o exemplo que a especificação dá. Então o texto
 * visível é sempre **categoria + bairro**, dois campos que já são públicos no
 * balcão, e nunca a necessidade escrita pela pessoa, o nome dela, o telefone
 * ou o endereço (§11).
 *
 * O detalhe inteiro pertence ao aplicativo autenticado. O push só diz que ele
 * existe.
 */

/**
 * A taxonomia. Três famílias, e a especificação insiste que sejam poucas (§7).
 *
 * A separação não é decorativa: ela decide **o que o usuário pode desligar**.
 * `oportunidade` e `atualizacao` são operacionais e opcionais; `seguranca` não
 * responde à mesma preferência (§37); `comunicado` é raro por política, não
 * por falta de infraestrutura (§83). Marketing não existe nesta fase, e a
 * ausência dele aqui é o que impede alguém de mandar campanha usando a
 * autorização que o parceiro deu para receber oportunidade (§38).
 */
export type TipoDeAviso =
  /** Uma oportunidade compatível chegou. É a razão de esta fase existir. */
  | "oportunidade.nova"
  /** Algo mudou em uma oportunidade dele de um jeito que exige saber. */
  | "oportunidade.atualizada"
  /** Conta e segurança: acesso novo, senha trocada. Nunca inventado. */
  | "conta.seguranca"
  /** Comunicado do Canaã Resolve. Raro. */
  | "canaa.comunicado";

/** A que preferência cada tipo responde. `null` = não é desligável (§37). */
export const preferenciaDoTipo: Record<TipoDeAviso, CategoriaDePreferencia | null> = {
  "oportunidade.nova": "oportunidades",
  "oportunidade.atualizada": "atualizacoes",
  "conta.seguranca": null,
  "canaa.comunicado": "comunicados",
};

export type CategoriaDePreferencia = "oportunidades" | "atualizacoes" | "comunicados";

/**
 * Os canais do Android (§50). Um por família de aviso, e não um por categoria
 * de serviço — "Elétrica" e "Refrigeração" não são coisas diferentes para o
 * sistema operacional, são a mesma oportunidade.
 */
export const canalDoTipo: Record<TipoDeAviso, string> = {
  "oportunidade.nova": "oportunidades",
  "oportunidade.atualizada": "atualizacoes",
  "conta.seguranca": "conta",
  "canaa.comunicado": "atualizacoes",
};

/**
 * O que viaja dentro do push, para o aplicativo entender sem ler o texto (§12).
 *
 * Nenhum campo aqui é dado pessoal. `oportunidadeId` é um identificador
 * interno, e conhecê-lo **não** concede acesso: quem abre precisa de sessão
 * válida e de autorização sobre aquela oportunidade (§70).
 */
export type CargaDoAviso = {
  tipo: TipoDeAviso;
  /** O destino, no mesmo formato que um link interno usa. Ex.: `oportunidade/o1`. */
  destino: string;
  /** Presente quando o aviso é sobre uma oportunidade. */
  oportunidadeId?: string;
  /**
   * Quando o acontecimento ocorreu no servidor — não quando o push chegou.
   * Serve para o aplicativo descartar um aviso mais velho do que o que já
   * mostrou, sem nunca tratá-lo como estado (§22).
   */
  em: string;
  /**
   * A identidade do acontecimento. Dois envios com a mesma chave são o mesmo
   * fato, e o segundo não vira uma segunda notificação (§48).
   */
  evento: string;
  /**
   * Para quem este aviso é. O aplicativo confere contra a conta aberta antes
   * de navegar: um push da conta anterior nunca abre dado da nova (§19).
   */
  para: string;
};

export type Aviso = {
  titulo: string;
  corpo: string;
  carga: CargaDoAviso;
  /** Como agrupar no Notification Center (§49). */
  grupo: string;
};

/**
 * A chave de idempotência de um acontecimento.
 *
 * Uma oportunidade criada uma vez não pode virar três notificações porque
 * houve retentativa interna (§48). A chave descreve **o fato**, não a
 * tentativa: mesma oportunidade, mesmo tipo, mesma chave.
 */
export function chaveDoEvento(tipo: TipoDeAviso, entidadeId: string): string {
  return `${tipo}:${entidadeId}`;
}

/**
 * Uma nova oportunidade, dita de um jeito que não constrange ninguém.
 *
 * Título e corpo saem daqui e de nenhum outro lugar — se alguém quiser um dia
 * colocar a necessidade da pessoa no corpo, vai precisar mexer nesta função e
 * ler este comentário antes.
 */
export function avisoDeNovaOportunidade(entrada: {
  oportunidadeId: string;
  /** O balcão: "Ar-condicionado e refrigeração". Já é público. */
  categoria: string;
  /** O bairro. Nunca o endereço. */
  regiao: string;
  partnerId: string;
  em?: Date;
}): Aviso {
  const em = entrada.em ?? new Date();

  return {
    titulo: "Nova oportunidade",
    // "Ar-condicionado · Novo Horizonte" — exatamente o que o §9 propõe, e
    // exatamente o que cabe numa tela bloqueada sem revelar nada.
    corpo: `${entrada.categoria} · ${entrada.regiao}`,
    grupo: "oportunidades",
    carga: {
      tipo: "oportunidade.nova",
      destino: `oportunidade/${entrada.oportunidadeId}`,
      oportunidadeId: entrada.oportunidadeId,
      em: em.toISOString(),
      evento: chaveDoEvento("oportunidade.nova", entrada.oportunidadeId),
      para: entrada.partnerId,
    },
  };
}

/**
 * Uma mudança que vale interromper. A pergunta do §137 — "isto merece
 * interromper o profissional?" — está respondida na lista: só três motivos
 * passaram. Mudança de metadado, evento técnico e alteração interna não estão
 * aqui, e não é por esquecimento (§80).
 */
export type MotivoDeAtualizacao = "cancelada" | "encerrada-pelo-sistema" | "acao-necessaria";

const frasesDeAtualizacao: Record<MotivoDeAtualizacao, string> = {
  cancelada: "O morador cancelou o pedido.",
  "encerrada-pelo-sistema": "Esta oportunidade foi encerrada.",
  "acao-necessaria": "Esta oportunidade está esperando você.",
};

export function avisoDeAtualizacao(entrada: {
  oportunidadeId: string;
  categoria: string;
  motivo: MotivoDeAtualizacao;
  partnerId: string;
  em?: Date;
}): Aviso {
  const em = entrada.em ?? new Date();

  return {
    titulo: entrada.categoria,
    corpo: frasesDeAtualizacao[entrada.motivo],
    grupo: "oportunidades",
    carga: {
      tipo: "oportunidade.atualizada",
      destino: `oportunidade/${entrada.oportunidadeId}`,
      oportunidadeId: entrada.oportunidadeId,
      em: em.toISOString(),
      evento: chaveDoEvento(
        "oportunidade.atualizada",
        `${entrada.oportunidadeId}:${entrada.motivo}`,
      ),
      para: entrada.partnerId,
    },
  };
}

/**
 * Segurança. Só existe quando a infraestrutura **realmente detectou** algo
 * (§82) — não há gerador de alerta genérico neste arquivo de propósito, e o
 * único evento que o servidor sabe reconhecer hoje é a troca de senha, que é
 * uma ação do próprio dono.
 */
export function avisoDeSenhaAlterada(entrada: { partnerId: string; em?: Date }): Aviso {
  const em = entrada.em ?? new Date();

  return {
    titulo: "Sua senha foi alterada",
    corpo: "Se não foi você, fale com o Canaã Resolve agora.",
    grupo: "conta",
    carga: {
      tipo: "conta.seguranca",
      destino: "ajustes/seguranca",
      em: em.toISOString(),
      evento: chaveDoEvento("conta.seguranca", `senha:${entrada.partnerId}:${em.getTime()}`),
      para: entrada.partnerId,
    },
  };
}

/**
 * A rede de segurança do §11, aplicada ao texto pronto.
 *
 * Ela não substitui escrever com cuidado — ela pega o dia em que alguém
 * escrever com pressa. Se um número de telefone, um e-mail ou um endereço
 * aparecer no que iria para a tela bloqueada, o envio é recusado em vez de
 * entregue.
 */
const SUSPEITAS: { nome: string; regex: RegExp }[] = [
  { nome: "telefone", regex: /(?:\+?55\s?)?\(?\d{2}\)?\s?9?\d{4}[-\s]?\d{4}/ },
  { nome: "e-mail", regex: /[\w.+-]+@[\w-]+\.[\w.]+/ },
  {
    nome: "endereço",
    regex: /\b(rua|avenida|av\.|travessa|alameda|rodovia|n[ºo°]\s?\d|apto|apartamento)\b/i,
  },
  { nome: "CPF", regex: /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/ },
];

export type ProblemaDePrivacidade = { campo: "titulo" | "corpo"; suspeita: string };

export function conferirPrivacidade(aviso: Aviso): ProblemaDePrivacidade | null {
  for (const campo of ["titulo", "corpo"] as const) {
    const texto = aviso[campo];
    for (const s of SUSPEITAS) {
      if (s.regex.test(texto)) return { campo, suspeita: s.nome };
    }
  }
  return null;
}
