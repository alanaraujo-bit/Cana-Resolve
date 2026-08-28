/**
 * De onde o perfil vem, e para onde as edições vão.
 *
 * A única fronteira do módulo com "o mundo". As telas recebem um `Perfil` e
 * chamam `salvar`; elas não sabem — e não devem saber — se aquilo veio de
 * rede, de disco ou de exemplo.
 *
 * Duas regras vivem aqui, como no módulo de oportunidades:
 *
 * 1. **Honestidade.** Sem API configurada, em desenvolvimento a interface é
 *    alimentada por exemplos declarados e o que se edita fica **no aparelho**;
 *    em produção nada carrega e nada salva, e a falha é dita com todas as
 *    letras. É a mesma regra da autenticação na Fase 01.
 * 2. **Separação.** O e-mail da conta não vira e-mail comercial sozinho, e a
 *    imagem local nunca é anunciada como publicada. Ver `imagem.ts`.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { authConfig } from '@/auth/config';
import { perfilDeExemplo, type Cenario } from './exemplos';
import type { Perfil } from './tipos';

const MENSAGEM_LEITURA = 'Não foi possível carregar seu perfil agora.';
const MENSAGEM_SALVAR = 'Não foi possível salvar suas alterações agora.';
const ATRASO = 460;
const ATRASO_SALVAR = 320;

/** Erro com frase de produto. O detalhe técnico só aparece em desenvolvimento. */
export class ErroDePerfil extends Error {
  readonly detalhe?: string;

  constructor(mensagem: string, detalhe?: string) {
    super(mensagem);
    this.name = 'ErroDePerfil';
    this.detalhe = detalhe;
  }
}

export function comoErroDePerfil(e: unknown, padrao = MENSAGEM_LEITURA): ErroDePerfil {
  if (e instanceof ErroDePerfil) return e;
  return new ErroDePerfil(padrao, e instanceof Error ? e.message : String(e));
}

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * A porta é a API de **dados**, não a de autenticação: desde 28/08/2026 a
 * entrada é real e a leitura de perfil ainda não existe. Olhar para a
 * autenticação aqui apagaria os exemplos no dia em que o login ficou pronto.
 */
function semApi(): boolean {
  return !authConfig.dataApiBaseUrl;
}

function exigirDesenvolvimento(mensagem: string) {
  if (!__DEV__) {
    throw new ErroDePerfil(
      mensagem,
      'EXPO_PUBLIC_AUTH_API_URL não configurada — veja BLOCKERS.md.',
    );
  }
}

/* -------------------------------------------------------------------------- */
/*  Rascunho local — só desenvolvimento                                       */
/* -------------------------------------------------------------------------- */

/**
 * O que se edita sem API fica gravado no aparelho, para que testar não
 * signifique preencher tudo de novo a cada recarga do Metro. É rascunho local
 * e declarado: não é sincronização, não é backup e some com `esquecer()`.
 */
const CHAVE = 'cr.perfil.rascunho.v1';

/** `Date` não sobrevive a JSON. Estas duas funções cuidam disso e nada mais. */
function paraTexto(p: Perfil): string {
  return JSON.stringify(p, (_chave, valor) =>
    valor instanceof Date ? { __data: valor.toISOString() } : valor,
  );
}

function deTexto(texto: string): Perfil {
  return JSON.parse(texto, (_chave, valor) => {
    if (valor && typeof valor === 'object' && typeof valor.__data === 'string') {
      return new Date(valor.__data);
    }
    return valor;
  }) as Perfil;
}

async function lerRascunho(): Promise<Perfil | null> {
  try {
    const texto = await AsyncStorage.getItem(CHAVE);
    return texto ? deTexto(texto) : null;
  } catch {
    // Rascunho ilegível não pode impedir a tela de abrir: cai no exemplo.
    return null;
  }
}

async function gravarRascunho(p: Perfil): Promise<void> {
  try {
    await AsyncStorage.setItem(CHAVE, paraTexto(p));
  } catch {
    /* silencioso: é conveniência de desenvolvimento, não dado crítico */
  }
}

/** Recomeça do zero — o seletor de cenário usa. */
export async function esquecer(): Promise<void> {
  memoria = null;
  try {
    await AsyncStorage.removeItem(CHAVE);
  } catch {
    /* idem */
  }
}

/* -------------------------------------------------------------------------- */
/*  Leitura e escrita                                                         */
/* -------------------------------------------------------------------------- */

let memoria: Perfil | null = null;

/**
 * Lê o perfil do parceiro.
 *
 * `nome` vem da sessão e serve só para um perfil recém-criado não nascer
 * anônimo — não é o perfil, é o ponto de partida dele.
 */
export async function lerPerfil(cenario: Cenario, nome: string): Promise<Perfil> {
  if (semApi()) {
    exigirDesenvolvimento(MENSAGEM_LEITURA);
    await espera(ATRASO);

    if (cenario === 'erro') {
      throw new ErroDePerfil(
        MENSAGEM_LEITURA,
        'Cenário de exemplo "erro", para conferir o estado de falha.',
      );
    }

    if (memoria) return memoria;

    const rascunho = await lerRascunho();
    memoria = rascunho ?? perfilDeExemplo(cenario, nome);
    return memoria;
  }

  throw new ErroDePerfil(
    MENSAGEM_LEITURA,
    'Leitura de perfil pela API ainda não implementada — ver PERFIL.md.',
  );
}

/**
 * Salva o perfil inteiro.
 *
 * Salvar é sempre explícito: nenhuma tela grava enquanto se digita. O parceiro
 * decide quando terminou, e o que ele não confirmou não vale.
 */
export async function salvarPerfil(p: Perfil): Promise<Perfil> {
  if (semApi()) {
    exigirDesenvolvimento(MENSAGEM_SALVAR);
    await espera(ATRASO_SALVAR);
    memoria = p;
    await gravarRascunho(p);
    return p;
  }

  throw new ErroDePerfil(
    MENSAGEM_SALVAR,
    'Escrita de perfil pela API ainda não implementada — ver PERFIL.md.',
  );
}

/** O rascunho local ainda não saiu do aparelho. A tela avisa isso uma vez. */
export function apenasLocal(): boolean {
  return semApi();
}
