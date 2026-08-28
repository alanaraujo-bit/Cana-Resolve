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

export async function trocarPorSessao(credencial: Credencial): Promise<SignInResult> {
  const base = authConfig.apiBaseUrl;
  if (!base) {
    throw new AuthError(
      'nao-configurado',
      'EXPO_PUBLIC_AUTH_API_URL ainda não foi definida — veja BLOCKERS.md.',
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);

  try {
    const response = await fetch(`${base.replace(/\/$/, '')}/auth/sessoes`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-cr-plataforma': Platform.OS },
      body: JSON.stringify(credencial),
      signal: controller.signal,
    });

    if (response.status === 401 || response.status === 403) {
      throw new AuthError('credenciais');
    }
    if (!response.ok) {
      throw new AuthError('desconhecido', `HTTP ${response.status}`);
    }

    const data = (await response.json()) as {
      token?: string;
      conta?: { id?: string; nome?: string; papel?: Account['papel'] };
    };

    if (!data?.token || !data.conta?.id) {
      throw new AuthError('desconhecido', 'Resposta da API sem token ou conta.');
    }

    return {
      token: data.token,
      account: {
        id: data.conta.id,
        nome: data.conta.nome ?? 'Parceiro',
        papel: data.conta.papel ?? 'profissional',
        origem: 'servidor',
      },
    };
  } catch (error) {
    throw toAuthError(error);
  } finally {
    clearTimeout(timer);
  }
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
