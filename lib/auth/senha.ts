// Sem `server-only` de propósito: aqui não há segredo nem conexão, só
// derivação de chave — e a ferramenta de linha de comando que cria a primeira
// senha de um parceiro precisa importar isto fora do servidor. Quem fala com o
// banco é `parceiro.ts`, e lá a guarda existe.
import {
  randomBytes,
  scrypt as scryptCb,
  timingSafeEqual,
  type ScryptOptions,
} from "node:crypto";

/**
 * Senhas — derivação e verificação.
 *
 * `scrypt` da biblioteca padrão do Node, no formato que o esquema já
 * documentava para os operadores:
 *
 *     scrypt$N$r$p$salt$hash        (salt e hash em base64url)
 *
 * Guardar os parâmetros junto do hash é o que permite endurecer o custo depois
 * sem invalidar a senha de ninguém: um hash antigo continua verificável com os
 * parâmetros dele, e a linha é regravada com os novos no próximo login.
 *
 * Por que scrypt e não bcrypt/argon2: vem no Node, não tem binário nativo para
 * compilar e roda igual no ambiente da Vercel. Uma dependência a menos numa
 * superfície onde dependência é risco.
 */

/**
 * `promisify` perde a sobrecarga que aceita opções, e sem opções o `scrypt` do
 * Node não recebe memória suficiente para N = 16384. Daí o invólucro à mão.
 */
function scrypt(
  senha: string,
  sal: Buffer,
  tamanho: number,
  opcoes: ScryptOptions,
): Promise<Buffer> {
  return new Promise((ok, erro) => {
    scryptCb(senha, sal, tamanho, opcoes, (e, derivado) =>
      e ? erro(e) : ok(derivado as Buffer),
    );
  });
}

/** Custo atual. Ajustar aqui endurece as senhas novas sem quebrar as antigas. */
const N = 16384;
const R = 8;
const P = 1;
const TAMANHO = 32;
const SAL = 16;

/** O tamanho máximo que aceitamos derivar — scrypt não tem limite, memória tem. */
const MAXIMO = 256;

const b64 = (b: Buffer) => b.toString("base64url");

export async function gerarHash(senha: string): Promise<string> {
  if (senha.length > MAXIMO) throw new Error("senha longa demais");
  const sal = randomBytes(SAL);
  const derivado = await scrypt(senha.normalize("NFKC"), sal, TAMANHO, {
    N,
    r: R,
    p: P,
    // O padrão do Node não dá memória para N=16384; sem isto, scrypt falha.
    maxmem: 64 * 1024 * 1024,
  });
  return `scrypt$${N}$${R}$${P}$${b64(sal)}$${b64(derivado)}`;
}

/**
 * Confere a senha contra o hash guardado.
 *
 * Devolve `false` para qualquer entrada estranha em vez de lançar: quem chama é
 * uma rota de login, e a diferença entre "hash corrompido" e "senha errada" não
 * é assunto de quem está tentando entrar.
 */
export async function conferir(senha: string, guardado: string): Promise<boolean> {
  if (!guardado || senha.length > MAXIMO) return false;

  const partes = guardado.split("$");
  if (partes.length !== 6 || partes[0] !== "scrypt") return false;

  const n = Number(partes[1]);
  const r = Number(partes[2]);
  const p = Number(partes[3]);
  if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p)) return false;
  // Um hash forjado com N absurdo viraria negação de serviço na própria rota.
  if (n > 1 << 20 || r > 32 || p > 16) return false;

  let sal: Buffer;
  let esperado: Buffer;
  try {
    sal = Buffer.from(partes[4]!, "base64url");
    esperado = Buffer.from(partes[5]!, "base64url");
  } catch {
    return false;
  }
  if (sal.length === 0 || esperado.length === 0) return false;

  try {
    const derivado = await scrypt(senha.normalize("NFKC"), sal, esperado.length, {
      N: n,
      r,
      p,
      maxmem: 256 * 1024 * 1024,
    });
    return derivado.length === esperado.length && timingSafeEqual(derivado, esperado);
  } catch {
    return false;
  }
}

/** O hash foi feito com um custo mais fraco que o de hoje? */
export function precisaRegravar(guardado: string): boolean {
  const partes = guardado.split("$");
  if (partes.length !== 6 || partes[0] !== "scrypt") return true;
  return Number(partes[1]) < N;
}

/**
 * A régua mínima da senha.
 *
 * Curta de propósito: quem vai digitar isto é um eletricista no meio da rua, no
 * teclado do celular. Exigir símbolo e maiúscula não compra segurança de
 * verdade — compra senha anotada no papel. O que protege esta rota é o freio de
 * tentativas, não o teatro de complexidade.
 */
export function validarSenha(senha: string): string | null {
  if (senha.length < 8) return "A senha precisa de pelo menos 8 caracteres.";
  if (senha.length > MAXIMO) return "Senha longa demais.";
  if (/^\d+$/.test(senha)) return "Não use só números.";
  return null;
}
