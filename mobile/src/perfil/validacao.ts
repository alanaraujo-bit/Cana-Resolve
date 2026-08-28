/**
 * Validação e normalização dos campos do perfil.
 *
 * Duas regras de conduta aqui:
 *
 * 1. **Normalizar em silêncio, reclamar só quando precisa.** O parceiro digita
 *    o telefone como quiser; quem arruma é o aplicativo. Erro só aparece
 *    quando o dado realmente não serve.
 * 2. **Aviso não é bloqueio.** O que é opinião nossa (um serviço em CAIXA
 *    ALTA, uma promessa que ninguém pode conferir) vira sugestão discreta, não
 *    porta trancada. Perfil é do parceiro.
 */

import { MAXIMO_DA_DESCRICAO, type Servico } from './tipos';

/* -------------------------------------------------------------------------- */
/*  Telefone                                                                  */
/* -------------------------------------------------------------------------- */

/** Só os dígitos, como a pessoa digitou. */
export function digitos(entrada: string): string {
  return entrada.replace(/\D/g, '');
}

/** Máscara de digitação: "(99) 99999-9999", crescendo conforme se digita. */
export function mascaraTelefone(entrada: string): string {
  const d = digitos(entrada).replace(/^55/, '').slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Guarda-se sempre em E.164. O Brasil é o único DDI por enquanto. */
export function paraE164(entrada: string): string | null {
  const d = digitos(entrada).replace(/^55/, '');
  if (d.length !== 10 && d.length !== 11) return null;
  return `+55${d}`;
}

/**
 * O que há de errado com o telefone, ou `null`.
 * Vazio não é erro: o campo é opcional até a hora de salvar.
 */
export function erroDeTelefone(entrada: string): string | null {
  const bruto = digitos(entrada).replace(/^55/, '');
  if (bruto.length === 0) return null;
  if (bruto.length < 10) return 'Faltam números. Inclua o DDD.';
  if (bruto.length > 11) return 'Números demais. Confira o DDD.';
  const ddd = Number(bruto.slice(0, 2));
  if (ddd < 11 || ddd > 99) return 'DDD inválido.';
  return null;
}

/* -------------------------------------------------------------------------- */
/*  Instagram, site, e-mail                                                   */
/* -------------------------------------------------------------------------- */

/** Aceita "@nome", "instagram.com/nome" ou "nome". Guarda "nome". */
export function normalizarInstagram(entrada: string): string | null {
  const limpo = entrada
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^(www\.)?instagram\.com\//i, '')
    .replace(/^@/, '')
    .replace(/\/.*$/, '')
    .trim();
  return limpo.length === 0 ? null : limpo;
}

export function erroDeInstagram(entrada: string): string | null {
  const nome = normalizarInstagram(entrada);
  if (nome === null) return null;
  if (!/^[A-Za-z0-9._]{1,30}$/.test(nome)) {
    return 'Use só o nome do perfil, como @suaempresa.';
  }
  return null;
}

/** Aceita sem "https://" e completa. Guarda a URL inteira. */
export function normalizarSite(entrada: string): string | null {
  const limpo = entrada.trim();
  if (limpo.length === 0) return null;
  return /^https?:\/\//i.test(limpo) ? limpo : `https://${limpo}`;
}

export function erroDeSite(entrada: string): string | null {
  const url = normalizarSite(entrada);
  if (url === null) return null;
  if (!/^https?:\/\/[^\s.]+\.[^\s]{2,}$/i.test(url)) return 'Endereço incompleto.';
  return null;
}

export function erroDeEmail(entrada: string): string | null {
  const limpo = entrada.trim();
  if (limpo.length === 0) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(limpo)) return 'E-mail incompleto.';
  return null;
}

/* -------------------------------------------------------------------------- */
/*  Serviço personalizado                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Arruma o que o parceiro escreveu: tira grito, tira pontuação repetida,
 * corta no tamanho e deixa a primeira letra maiúscula. "FAÇO DE TUDO CHAMA NO
 * ZAP!!!!" não é um serviço — vira "Faço de tudo chama no zap", e o aviso
 * abaixo sugere o lugar certo para isso.
 */
export function normalizarServico(entrada: string): string {
  const limpo = entrada
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[!?.]{2,}/g, '')
    .slice(0, 40)
    .trim();

  if (limpo.length === 0) return '';

  const semGrito =
    limpo === limpo.toUpperCase() && limpo.length > 3 ? limpo.toLowerCase() : limpo;

  return semGrito.charAt(0).toUpperCase() + semGrito.slice(1);
}

/** Comparação para não entrar duas vezes o mesmo serviço com outra roupa. */
export function mesmaCoisa(a: string, b: string): boolean {
  const chave = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]/g, '');
  return chave(a) === chave(b);
}

export function jaExiste(servicos: Servico[], rotulo: string): boolean {
  return servicos.some((s) => mesmaCoisa(s.rotulo, rotulo));
}

/* -------------------------------------------------------------------------- */
/*  Descrição                                                                 */
/* -------------------------------------------------------------------------- */

export function erroDeDescricao(entrada: string): string | null {
  if (entrada.length > MAXIMO_DA_DESCRICAO) {
    return `Passou ${entrada.length - MAXIMO_DA_DESCRICAO} caracteres.`;
  }
  return null;
}

/**
 * Promessas que ninguém consegue conferir.
 *
 * Isto **não** impede de salvar — é um lembrete discreto, uma vez, de que o
 * que convence em Canaã é o serviço descrito, não o superlativo. O parceiro
 * decide.
 */
const PROMESSAS = [
  /\bo\s+melhor\b/i,
  /\bmelhor\s+d[aoe]\b/i,
  /\bn[úu]mero\s*1\b/i,
  /\bl[íi]der\b/i,
  /\b100\s*%\s*(garantid|satisfa)/i,
  /\bimbat[íi]vel\b/i,
  /\bo\s+mais\s+barato\b/i,
];

export function avisoDeDescricao(entrada: string): string | null {
  if (PROMESSAS.some((r) => r.test(entrada))) {
    return 'Promessas difíceis de comprovar convencem menos que dizer o que você faz e há quanto tempo.';
  }
  return null;
}

/** Conta o que resta, para o contador discreto do campo. */
export function restamNaDescricao(entrada: string): number {
  return MAXIMO_DA_DESCRICAO - entrada.length;
}
