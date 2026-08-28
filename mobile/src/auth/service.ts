/**
 * O contrato de autenticação do aplicativo.
 *
 * Regra que não se negocia: só existe sessão quando um servidor confirmou a
 * identidade. Enquanto a API não estiver configurada, cada caminho falha de
 * forma honesta — com uma frase de produto para a pessoa e um aviso técnico
 * apenas em desenvolvimento. Nada aqui finge ter autenticado.
 */
import { Platform } from 'react-native';

import type { Account } from '@/session/SessionProvider';
import { authConfig } from './config';
import { AuthError, toAuthError } from './errors';

type Credencial =
  | { tipo: 'senha'; email: string; senha: string }
  | { tipo: 'google'; code: string; codeVerifier?: string; redirectUri: string }
  | { tipo: 'apple'; identityToken: string; nomeCompleto?: string | null };

export type SignInResult = { account: Account; token: string };

const TIMEOUT = 15000;

/** A base da API, sem barra no fim, ou o erro honesto de que ela não existe. */
function base(): string {
  const url = authConfig.apiBaseUrl;
  if (!url) {
    throw new AuthError(
      'nao-configurado',
      'EXPO_PUBLIC_AUTH_API_URL ainda não foi definida — veja BLOCKERS.md.',
    );
  }
  return url.replace(/\/$/, '');
}

/**
 * Uma chamada à API de autenticação, com prazo.
 *
 * Sem prazo, um servidor que aceita a conexão e não responde deixa a tela
 * carregando para sempre — e a pessoa sem saber se o botão foi apertado.
 */
async function chamar(caminho: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    return await fetch(`${base()}${caminho}`, {
      ...init,
      headers: { 'x-cr-plataforma': Platform.OS, ...(init.headers ?? {}) },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

type ContaDaApi = {
  id?: string;
  nome?: string;
  email?: string | null;
  papel?: Account['papel'];
};

function contaDaResposta(conta: ContaDaApi): Account {
  return {
    id: conta.id!,
    nome: conta.nome ?? 'Parceiro',
    email: conta.email ?? null,
    papel: conta.papel ?? 'profissional',
    origem: 'servidor',
  };
}

export async function trocarPorSessao(credencial: Credencial): Promise<SignInResult> {
  try {
    const response = await chamar('/auth/sessoes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(credencial),
    });

    if (response.status === 401 || response.status === 403) {
      throw new AuthError('credenciais');
    }
    if (!response.ok) {
      throw new AuthError('desconhecido', `HTTP ${response.status}`);
    }

    const data = (await response.json()) as { token?: string; conta?: ContaDaApi };

    if (!data?.token || !data.conta?.id) {
      throw new AuthError('desconhecido', 'Resposta da API sem token ou conta.');
    }

    return { token: data.token, account: contaDaResposta(data.conta) };
  } catch (error) {
    throw toAuthError(error);
  }
}

/**
 * A sessão guardada neste aparelho ainda vale?
 *
 * Chamada uma vez, na abertura. Três respostas possíveis, e a diferença entre
 * elas é o que separa um aplicativo confiável de um que expulsa gente sem
 * motivo:
 *
 * - **conta** → a sessão vale, e de quebra chegam nome e e-mail atualizados;
 * - **`null`** → o servidor disse que não vale mais (expirou ou foi revogada).
 *   É o único caso em que se manda entrar de novo;
 * - **erro** → não deu para perguntar (sem internet, servidor fora). Aqui a
 *   sessão **não** é descartada: ficar sem sinal não pode custar o login.
 */
export async function confirmarSessao(token: string): Promise<Account | null> {
  try {
    const response = await chamar('/auth/sessoes', {
      method: 'GET',
      headers: { authorization: `Bearer ${token}` },
    });

    if (response.status === 401 || response.status === 403) return null;
    if (!response.ok) throw new AuthError('desconhecido', `HTTP ${response.status}`);

    const data = (await response.json()) as { conta?: ContaDaApi };
    if (!data?.conta?.id) throw new AuthError('desconhecido', 'Resposta da API sem conta.');

    return contaDaResposta(data.conta);
  } catch (error) {
    throw toAuthError(error);
  }
}

/**
 * Encerra a sessão no servidor.
 *
 * Melhor esforço, e de propósito: sair é decisão de quem está com o aparelho na
 * mão, e não pode falhar porque a rede caiu. Quando esta chamada não chega, a
 * credencial local some do mesmo jeito e a sessão do servidor morre sozinha na
 * data de expiração.
 */
export async function encerrarSessao(token: string): Promise<void> {
  try {
    await chamar('/auth/sessoes', {
      method: 'DELETE',
      headers: { authorization: `Bearer ${token}` },
    });
  } catch {
    /* silencioso: quem sai, sai */
  }
}

/** O que pode dar errado ao trocar a senha — cada um com um destino na tela. */
export type FalhaDeSenha =
  | 'sessao'
  | 'senha-atual'
  | 'sem-senha'
  | 'senha-fraca'
  | 'senha-igual'
  | 'muitas-tentativas'
  | 'indisponivel'
  | 'rede';

export class ErroDeSenha extends Error {
  readonly code: FalhaDeSenha;
  /** Detalhe técnico — só aparece em desenvolvimento. */
  readonly detalhe?: string;

  constructor(code: FalhaDeSenha, mensagem: string, detalhe?: string) {
    super(mensagem);
    this.name = 'ErroDeSenha';
    this.code = code;
    this.detalhe = detalhe;
  }
}

/**
 * Troca a senha da conta.
 *
 * Existe porque a operação é **real**: o servidor confere a senha atual, grava
 * a nova e derruba os outros aparelhos. Enquanto não fosse assim, esta função
 * não deveria existir — e a tela que a chama, tampouco.
 */
export async function alterarSenhaDaConta(
  token: string,
  atual: string,
  nova: string,
): Promise<void> {
  let response: Response;
  try {
    response = await chamar('/auth/senha', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ atual, nova }),
    });
  } catch (error) {
    const auth = toAuthError(error);
    throw new ErroDeSenha(
      auth.code === 'nao-configurado' ? 'indisponivel' : 'rede',
      auth.code === 'nao-configurado'
        ? 'Não foi possível alterar sua senha agora. Tente novamente em instantes.'
        : 'Sem conexão no momento. Verifique a internet e tente de novo.',
      auth.detail,
    );
  }

  if (response.ok) return;

  if (response.status === 401) {
    throw new ErroDeSenha('sessao', 'Sua sessão expirou. Entre novamente para continuar.');
  }
  if (response.status === 403) {
    throw new ErroDeSenha('senha-atual', 'A senha atual não confere.');
  }
  if (response.status === 409) {
    throw new ErroDeSenha(
      'sem-senha',
      'Esta conta entra por outro método e não tem senha para trocar.',
    );
  }
  if (response.status === 429) {
    throw new ErroDeSenha(
      'muitas-tentativas',
      'Muitas tentativas seguidas. Espere um minuto e tente de novo.',
    );
  }
  if (response.status === 422) {
    const corpo = (await response.json().catch(() => null)) as {
      erro?: string;
      detalhe?: string;
    } | null;
    throw new ErroDeSenha(
      corpo?.erro === 'senha_igual' ? 'senha-igual' : 'senha-fraca',
      corpo?.detalhe ?? 'Escolha uma senha diferente.',
    );
  }

  throw new ErroDeSenha(
    'indisponivel',
    'Não foi possível alterar sua senha agora. Tente novamente em instantes.',
    `HTTP ${response.status}`,
  );
}

/**
 * A régua da senha nova, igual à do servidor (`lib/auth/senha.ts`).
 *
 * Curta de propósito: quem vai digitar isto é um eletricista no meio da rua.
 * Exigir símbolo e maiúscula não compra segurança — compra senha no papel.
 */
export function validarSenhaNova(valor: string): string | null {
  if (!valor) return 'Escolha uma senha.';
  if (valor.length < 8) return 'A senha precisa de pelo menos 8 caracteres.';
  if (valor.length > 256) return 'Senha longa demais.';
  if (/^\d+$/.test(valor)) return 'Não use só números.';
  return null;
}

/** Validação de formulário — antes de qualquer viagem à rede. */
export function validarEmail(valor: string): string | null {
  const email = valor.trim();
  if (!email) return 'Informe o seu e-mail.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return 'Esse e-mail parece incompleto.';
  return null;
}

export function validarSenha(valor: string): string | null {
  if (!valor) return 'Informe a sua senha.';
  if (valor.length < 6) return 'A senha tem pelo menos 6 caracteres.';
  return null;
}
