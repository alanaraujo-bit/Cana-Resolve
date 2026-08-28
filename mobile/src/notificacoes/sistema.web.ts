/**
 * O mesmo contrato de `sistema.ts`, para o navegador.
 *
 * A prévia web é onde o produto é conferido a cada passo desde a Fase 01 —
 * `expo-notifications` importado ali derrubaria o bundle, e com ele o único
 * lugar onde dá para olhar o aplicativo sem uma build.
 *
 * Este arquivo **não simula push**. Ele diz `indisponivel`, e a interface
 * explica isso com todas as letras, do mesmo jeito que `permissoes.tsx` já faz
 * com a galeria e `storage.ts` com o `SecureStore`. Fingir um token aqui seria
 * exatamente o que o §62 proíbe: marcar checklist com teatro.
 */
import type { Carga, EstadoDaPermissao } from './tipos';

export type Disponibilidade = 'pronta' | 'expo-go' | 'sem-aparelho' | 'sem-projeto' | 'web';

export function projectId(): string | null {
  return null;
}

export function disponibilidade(): Disponibilidade {
  return 'web';
}

export function ambiente(): 'development' | 'production' {
  return 'development';
}

export function descricaoDoAparelho(): string {
  return 'Navegador';
}

export async function prepararCanais(): Promise<void> {}

export async function lerPermissao(): Promise<EstadoDaPermissao> {
  return 'indisponivel';
}

export async function pedirPermissao(): Promise<EstadoDaPermissao> {
  return 'indisponivel';
}

export type FalhaDeToken = 'sem-permissao' | 'indisponivel' | 'erro';

export type ResultadoDeToken =
  | { ok: true; token: string }
  | { ok: false; falha: FalhaDeToken; detalhe?: string };

export async function obterToken(): Promise<ResultadoDeToken> {
  return { ok: false, falha: 'indisponivel', detalhe: 'web' };
}

export async function definirSelo(): Promise<void> {}

export type Assinatura = { remove: () => void };

const inerte: Assinatura = { remove: () => {} };

export function aoReceber(_ouvinte: (carga: Carga) => void): Assinatura {
  return inerte;
}

export function aoTocar(_ouvinte: (carga: Carga) => void): Assinatura {
  return inerte;
}

export function tocouParaAbrir(): Carga | null {
  return null;
}

export function esquecerToqueInicial(): void {}
