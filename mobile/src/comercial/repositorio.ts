/**
 * De onde a situação comercial vem.
 *
 * A única fronteira do módulo com "o mundo", como no Perfil, nas Oportunidades
 * e na Reputação. Mas aqui ela tem uma diferença que vale ser lida antes do
 * código, porque **é o oposto** do que os outros módulos fazem:
 *
 * ## Este repositório falha fechado
 *
 * Nos outros módulos, uma leitura que falha vira "não consegui carregar" e a
 * tela mostra um erro. Aqui, uma leitura que falha vira **situação
 * desconhecida** — e desconhecida não concede nada.
 *
 * A diferença importa porque o objeto que este arquivo devolve **decide
 * acesso**. Se uma falha de rede virasse um objeto vazio, e alguma tela lesse
 * esse objeto vazio como "sem restrição", uma queda de servidor liberaria
 * participação paga para todo mundo. Por isso a ausência de informação tem um
 * nome próprio (`origem: 'desconhecida'`), e por isso `situacaoConhecida`
 * existe: nenhuma tela precisa adivinhar a diferença entre "seu período
 * terminou" e "não deu para perguntar".
 *
 * ## A porta é a de autenticação, e não a de dados
 *
 * `EXPO_PUBLIC_AUTH_API_URL`, e não `EXPO_PUBLIC_DATA_API_URL`. O critério é o
 * mesmo que pôs o registro de aparelhos sob `auth/` na Fase 06: **o que esta
 * rota precisa saber é quem está logado**, e o resto ela lê do próprio estado
 * comercial. Ela não depende da API de dados, que continua não existindo — e
 * esperar por ela adiaria por meses uma camada que já pode ser real.
 *
 * ## Os exemplos
 *
 * Existem, são nove, e só aparecem quando **alguém os escolhe explicitamente**
 * na área de desenvolvimento — nunca como resposta a uma falha. Um cenário de
 * exemplo servido no lugar de um erro é uma compra simulada parecendo real, que
 * é exatamente o §147.
 */

import { authConfig } from '@/auth/config';
import { cobrancasDeExemplo, situacaoDeExemplo, type Cenario } from './exemplos';
import {
  lerCobrancas,
  lerSituacao,
  situacaoDesconhecida,
  type Cobranca,
  type SituacaoComercial,
} from './tipos';

const MENSAGEM = 'Não foi possível conferir sua situação agora.';
const ATRASO = 420;

export class ErroComercial extends Error {
  readonly detalhe?: string;
  /** `true` quando a sessão caiu — o único caso que manda entrar de novo. */
  readonly sessao: boolean;

  constructor(mensagem: string, detalhe?: string, sessao = false) {
    super(mensagem);
    this.name = 'ErroComercial';
    this.detalhe = detalhe;
    this.sessao = sessao;
  }
}

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

function url(caminho: string): string | null {
  const base = authConfig.apiBaseUrl;
  return base ? `${base.replace(/\/+$/, '')}${caminho}` : null;
}

async function pedir(caminho: string, token: string): Promise<unknown> {
  const endereco = url(caminho);
  if (!endereco) {
    throw new ErroComercial(MENSAGEM, 'EXPO_PUBLIC_AUTH_API_URL não configurada.');
  }

  let resposta: Response;
  try {
    resposta = await fetch(endereco, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
  } catch (e) {
    throw new ErroComercial(MENSAGEM, e instanceof Error ? e.message : String(e));
  }

  if (resposta.status === 401) {
    throw new ErroComercial('Sua sessão expirou. Entre de novo.', 'HTTP 401', true);
  }
  if (!resposta.ok) {
    throw new ErroComercial(MENSAGEM, `HTTP ${resposta.status}`);
  }

  try {
    return await resposta.json();
  } catch {
    throw new ErroComercial(MENSAGEM, 'A resposta não era JSON.');
  }
}

/**
 * A situação comercial de quem está logado.
 *
 * `cenario` só é aceito em desenvolvimento, e a checagem é dupla — o parâmetro
 * chegar não basta, `__DEV__` também precisa ser verdadeiro. Uma porta só
 * dependeria de nenhuma tela de produção passar o argumento; duas não dependem
 * de ninguém lembrar de nada.
 */
export async function lerSituacaoComercial(
  token: string | null,
  cenario: Cenario | null = null,
): Promise<SituacaoComercial> {
  if (cenario && __DEV__) {
    await espera(ATRASO);
    if (cenario === 'erro') {
      throw new ErroComercial(MENSAGEM, 'Cenário de exemplo "erro", para conferir o estado.');
    }
    return situacaoDeExemplo(cenario);
  }

  if (!token) {
    throw new ErroComercial('Sua sessão expirou. Entre de novo.', 'Sem credencial.', true);
  }

  const bruto = await pedir('/comercial/situacao', token);
  const situacao = lerSituacao(bruto);
  if (!situacao) {
    // Resposta ilegível. Não é "sem participação" — é "não sei", e a diferença
    // é o que impede a tela de afirmar algo sobre a conta de alguém.
    throw new ErroComercial(MENSAGEM, 'A resposta não tinha o formato esperado.');
  }
  return situacao;
}

/**
 * O histórico de cobrança.
 *
 * Rota separada, porque ele **não depende de haver acesso** (§104): quem pagou
 * vê o que pagou, com plano ativo ou sem. Uma falha aqui não contamina a
 * situação — a tela mostra a situação e diz que o histórico não carregou.
 */
export async function lerCobrancasDoParceiro(
  token: string | null,
  cenario: Cenario | null = null,
): Promise<Cobranca[]> {
  if (cenario && __DEV__) {
    await espera(ATRASO / 2);
    if (cenario === 'erro') throw new ErroComercial('Não foi possível carregar o histórico.');
    return cobrancasDeExemplo(cenario);
  }

  if (!token) throw new ErroComercial('Sua sessão expirou. Entre de novo.', undefined, true);
  return lerCobrancas(await pedir('/comercial/cobrancas', token));
}

/**
 * A situação quando nem dá para tentar.
 *
 * Reexportada daqui para que nenhuma tela precise construir esse objeto à mão
 * — e construí-lo à mão é como alguém acabaria escrevendo
 * `entitlements: ['receber_oportunidades']` num estado de erro.
 */
export { situacaoDesconhecida };

/**
 * Existe caminho de compra dentro do aplicativo?
 *
 * Hoje **não**, e a resposta é escrita aqui em vez de espalhada em `if`s pelas
 * telas. Quando as lojas estiverem configuradas, esta função passa a consultar
 * o que o servidor disser — e nenhuma tela muda.
 *
 * Ver `lib/billing/provedor.ts`, no repositório do site, para o porquê inteiro:
 * faltam credenciais das duas lojas, e o processo comercial aprovado exclui
 * compra indiscriminada.
 */
export function compraNoAplicativoDisponivel(): boolean {
  return false;
}
