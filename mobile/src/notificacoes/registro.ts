/**
 * O registro deste aparelho no servidor.
 *
 * A fronteira do módulo com a rede, como `repositorio.ts` é a das
 * oportunidades. Quem chama não sabe — e não deve saber — se houve HTTP,
 * repetição ou espera.
 *
 * A rota é a do **repositório do site**, sob `auth`: o que ela precisa saber é
 * quem está logado, e nada mais. Por isso ela já é real hoje, enquanto a API
 * de dados ainda não existe (§61).
 */
import { authConfig } from '@/auth/config';
import { idDaInstalacao } from './instalacao';
import { ambiente, descricaoDoAparelho } from './sistema';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

export type FalhaDeRegistro =
  /** Sem endereço de API configurado. Não é erro: é ambiente. */
  | 'sem-api'
  /** O servidor recusou a sessão. Quem trata isso é o `SessionProvider`. */
  | 'sessao'
  /** Rede fora, servidor fora, tempo esgotado. Vale tentar de novo. */
  | 'rede'
  /** O servidor respondeu algo que não sabemos ler. */
  | 'servidor';

export type ResultadoDeRegistro =
  | { ok: true; installationId: string }
  | { ok: false; falha: FalhaDeRegistro; detalhe?: string };

const TEMPO_LIMITE = 12_000;

/**
 * O limite da revogação, mais curto que o do registro — e o motivo é a pessoa,
 * não a rede: sair da conta **espera** por esta chamada (ver `signOut`), e
 * ninguém deve ficar doze segundos olhando um botão girar. Três segundos
 * cobrem uma rede ruim; além disso, sair acontece e o aparelho fica registrado
 * até a próxima entrada reapontá-lo.
 */
const TEMPO_LIMITE_CURTO = 3_000;

function url(caminho: string): string | null {
  const base = authConfig.apiBaseUrl;
  return base ? `${base.replace(/\/+$/, '')}${caminho}` : null;
}

async function comTempoLimite(
  entrada: string,
  init: RequestInit,
  limite = TEMPO_LIMITE,
): Promise<Response> {
  const abortador = new AbortController();
  const relogio = setTimeout(() => abortador.abort(), limite);
  try {
    return await fetch(entrada, { ...init, signal: abortador.signal });
  } finally {
    clearTimeout(relogio);
  }
}

/**
 * Diz ao servidor para onde mandar os avisos desta conta neste aparelho.
 *
 * É idempotente do lado de lá (§99): chamar de novo com o mesmo aparelho
 * atualiza a linha existente. Isso é o que permite chamar sem medo em toda
 * abertura, sempre que o token mudar e sempre que a conta mudar — sem
 * bookkeeping nenhum aqui dentro.
 */
export async function registrar(entrada: {
  /** A credencial da sessão. É ela que autoriza — nunca o token de push (§55). */
  sessao: string;
  /** O endereço de entrega. Vai no corpo e não aparece em mais lugar nenhum. */
  pushToken: string;
}): Promise<ResultadoDeRegistro> {
  const endereco = url('/auth/dispositivos');
  if (!endereco) return { ok: false, falha: 'sem-api' };

  const installationId = await idDaInstalacao();

  try {
    const resposta = await comTempoLimite(endereco, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${entrada.sessao}`,
      },
      body: JSON.stringify({
        installationId,
        pushToken: entrada.pushToken,
        plataforma: Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web',
        ambiente: ambiente(),
        descricao: descricaoDoAparelho(),
        appVersion: Constants.expoConfig?.version ?? null,
      }),
    });

    if (resposta.status === 401) return { ok: false, falha: 'sessao' };
    if (!resposta.ok) {
      return { ok: false, falha: 'servidor', detalhe: `HTTP ${resposta.status}` };
    }

    return { ok: true, installationId };
  } catch (e) {
    return { ok: false, falha: 'rede', detalhe: e instanceof Error ? e.message : undefined };
  }
}

/**
 * Este aparelho para de receber o que é desta conta.
 *
 * **Chamado antes de encerrar a sessão**, e o "antes" é literal: o servidor
 * identifica quem pede pela credencial, então uma sessão já apagada não prova
 * mais nada e a revogação leva 401.
 *
 * Isso não é teoria — foi medido. Disparar os dois `DELETE` juntos, como o
 * `signOut` fazia, dava `204` para a sessão e `401` para o aparelho, e a linha
 * ficava com `revoked_at` nulo: **o telefone continuava recebendo as
 * oportunidades privadas de quem tinha acabado de sair.** É o §57, o parágrafo
 * que a especificação chama de crítico. Ver `SessionProvider.signOut`.
 */
export async function revogar(sessao: string): Promise<boolean> {
  const base = url('/auth/dispositivos');
  if (!base) return false;

  try {
    const installationId = await idDaInstalacao();
    const resposta = await comTempoLimite(
      `${base}?installationId=${encodeURIComponent(installationId)}`,
      { method: 'DELETE', headers: { authorization: `Bearer ${sessao}` } },
      TEMPO_LIMITE_CURTO,
    );
    return resposta.ok || resposta.status === 204;
  } catch {
    // Falhar aqui não pode impedir alguém de sair. O aparelho continua
    // registrado até a próxima tentativa — e a proteção real é a de sempre: o
    // conteúdo do push não carrega dado privado (§10), e abrir a oportunidade
    // exige uma sessão que já não existe (§19).
    return false;
  }
}

/**
 * Uma espera que cresce, para o registro que falhou por rede (§98).
 *
 * Três tentativas, de 2s a 8s, e para. Sem laço infinito e sem bombardear o
 * servidor: se não deu, o aplicativo tenta de novo na próxima vez que voltar
 * ao primeiro plano, que é quando a rede costuma ter voltado.
 */
export const esperasDeRetentativa = [2_000, 4_000, 8_000] as const;
