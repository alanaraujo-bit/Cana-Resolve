import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { and, eq, gt, isNotNull, sql } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import { partnerSessions, partners } from "@/lib/db/schema";
import { conferir, gerarHash, precisaRegravar } from "./senha";

/**
 * Entrada do parceiro no aplicativo.
 *
 * Três decisões que valem ser lidas antes do código:
 *
 * 1. **Quem não tem senha não entra, e não fica sabendo disso.** O cadastro
 *    público não pede senha, então a maioria dos parceiros tem `passwordHash`
 *    nulo. Esse caso responde exatamente como senha errada — inclusive no
 *    tempo gasto —, porque a diferença entre "não existe" e "errou" é um mapa
 *    de quem é cliente.
 *
 * 2. **A sessão vive no banco, não dentro do token.** O token é só um número
 *    aleatório; quem sabe o que ele significa é a tabela. É isso que faz
 *    expirar e "sair de todos os aparelhos" serem reais, e não uma data
 *    assinada que continua valendo depois de revogada.
 *
 * 3. **Do token cru só existe uma cópia**, no aparelho de quem entrou. O banco
 *    guarda o SHA-256. Um vazamento da tabela não devolve sessão a ninguém.
 */

/** Quanto tempo uma sessão dura sem ninguém usá-la. */
const DIAS = 30;

export type ContaDoParceiro = {
  id: string;
  nome: string;
  papel: "profissional";
};

export type Sessao = { token: string; conta: ContaDoParceiro };

const hashDoToken = (token: string) =>
  createHash("sha256").update(token).digest("base64url");

/**
 * Um hash descartável, usado quando o e-mail não existe ou não tem senha.
 *
 * Sem isto, um e-mail desconhecido responderia na hora e um e-mail cadastrado
 * levaria as dezenas de milissegundos do scrypt — e essa diferença, medida,
 * diz quem é parceiro. Gastar o mesmo tempo nos dois casos fecha isso.
 */
const HASH_FANTASMA =
  "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

/**
 * Confere e-mail e senha e devolve a sessão criada.
 * `null` para qualquer falha de credencial — a rota não recebe o motivo.
 */
export async function entrarComSenha(
  email: string,
  senha: string,
): Promise<Sessao | null> {
  const db = getDb();
  const alvo = email.trim().toLowerCase();
  if (!alvo || !senha) return null;

  const [parceiro] = await db
    .select({
      id: partners.id,
      name: partners.name,
      passwordHash: partners.passwordHash,
    })
    .from(partners)
    .where(sql`lower(${partners.email}) = ${alvo}`)
    .limit(1);

  const guardado = parceiro?.passwordHash ?? HASH_FANTASMA;
  const confere = await conferir(senha, guardado);

  if (!parceiro || !parceiro.passwordHash || !confere) return null;

  // O custo do scrypt sobe com o tempo; quem entra com um hash antigo sai
  // daqui já regravado, sem nunca ter percebido.
  if (precisaRegravar(parceiro.passwordHash)) {
    try {
      await db
        .update(partners)
        .set({ passwordHash: await gerarHash(senha) })
        .where(eq(partners.id, parceiro.id));
    } catch {
      /* regravar é manutenção: falhar aqui não pode impedir a entrada */
    }
  }

  const token = randomBytes(32).toString("base64url");
  const expiraEm = new Date(Date.now() + DIAS * 24 * 60 * 60 * 1000);

  await db.insert(partnerSessions).values({
    tokenHash: hashDoToken(token),
    partnerId: parceiro.id,
    expiresAt: expiraEm,
  });

  return {
    token,
    conta: { id: parceiro.id, nome: parceiro.name, papel: "profissional" },
  };
}

/** Quem é o dono deste token, se ele ainda vale. */
export async function contaDaSessao(token: string): Promise<ContaDoParceiro | null> {
  if (!token) return null;
  const db = getDb();

  const [linha] = await db
    .select({ id: partners.id, name: partners.name, tokenHash: partnerSessions.tokenHash })
    .from(partnerSessions)
    .innerJoin(partners, eq(partners.id, partnerSessions.partnerId))
    .where(
      and(
        eq(partnerSessions.tokenHash, hashDoToken(token)),
        gt(partnerSessions.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!linha) return null;

  // A comparação já aconteceu no índice; esta é só a confirmação em tempo
  // constante de que a linha encontrada é mesmo a deste token.
  const a = Buffer.from(linha.tokenHash);
  const b = Buffer.from(hashDoToken(token));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  await db
    .update(partnerSessions)
    .set({ lastSeenAt: new Date() })
    .where(eq(partnerSessions.tokenHash, linha.tokenHash));

  return { id: linha.id, nome: linha.name, papel: "profissional" };
}

/** Encerra uma sessão. Sair é imediato e não depende de o token expirar. */
export async function sair(token: string): Promise<void> {
  if (!token) return;
  const db = getDb();
  await db.delete(partnerSessions).where(eq(partnerSessions.tokenHash, hashDoToken(token)));
}

/**
 * Define a senha de um parceiro. Usada pela ferramenta de linha de comando
 * enquanto não existe tela de "criar senha" — ver `scripts/senha-parceiro.ts`.
 */
export async function definirSenha(partnerId: string, senha: string): Promise<void> {
  const db = getDb();
  await db
    .update(partners)
    .set({ passwordHash: await gerarHash(senha), passwordSetAt: new Date() })
    .where(eq(partners.id, partnerId));
}

/** Quantos parceiros já podem entrar. Serve ao `db:status`. */
export async function quantosComSenha(): Promise<number> {
  const db = getDb();
  const [linha] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(partners)
    .where(isNotNull(partners.passwordHash));
  return linha?.n ?? 0;
}
