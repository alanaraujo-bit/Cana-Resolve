import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

/**
 * Senhas com scrypt, do próprio Node.
 *
 * scrypt é lento de propósito e caro em memória, que é justamente o que trava
 * um ataque de força bruta com GPU. Os parâmetros ficam guardados dentro do
 * hash: no dia em que forem aumentados, os hashes antigos continuam válidos e
 * a conferência segue funcionando.
 */

const N = 16384;
const R = 8;
const P = 1;
const KEYLEN = 64;
const MAXMEM = 64 * 1024 * 1024;

const b64 = (buf: Buffer) => buf.toString("base64url");

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await scryptAsync(password.normalize("NFKC"), salt, KEYLEN, {
    N,
    r: R,
    p: P,
    maxmem: MAXMEM,
  });
  return ["scrypt", N, R, P, b64(salt), b64(key)].join("$");
}

export async function verifyPassword(password: string, stored: string) {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const [, n, r, p, salt, key] = parts;
  const expected = Buffer.from(key, "base64url");

  let actual: Buffer;
  try {
    actual = await scryptAsync(
      password.normalize("NFKC"),
      Buffer.from(salt, "base64url"),
      expected.length,
      { N: Number(n), r: Number(r), p: Number(p), maxmem: MAXMEM },
    );
  } catch {
    return false;
  }

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/**
 * Gasta o mesmo tempo de uma conferência real. Serve para que "e-mail que não
 * existe" e "senha errada" demorem igual: sem isso, o tempo de resposta conta
 * quais e-mails estão cadastrados.
 */
export async function fakeVerify() {
  await scryptAsync("senha-inexistente", randomBytes(16), KEYLEN, {
    N,
    r: R,
    p: P,
    maxmem: MAXMEM,
  });
  return false;
}
