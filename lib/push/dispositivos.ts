import "server-only";

import { and, eq, isNull, ne, sql } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import { partnerDevices } from "@/lib/db/schema";
import type { DevicePlatform, DeviceRevocation } from "@/lib/db/schema";

/**
 * O cadastro de aparelhos que podem receber um aviso.
 *
 * Este arquivo existe para responder uma pergunta e só uma: **para onde um
 * push desta conta deve ir agora?** Não para "quem é este usuário" — o token
 * de push é endereço de entrega, nunca identidade (§55 da Fase 06).
 *
 * Três regras moram aqui, e não na rota:
 *
 * 1. **Registrar é idempotente.** A chave é a instalação (`installationId`),
 *    sorteada uma vez pelo aplicativo e guardada no aparelho. O mesmo aparelho
 *    registrando a cada abertura continua sendo uma linha só — é um
 *    `onConflictDoUpdate`, não um `insert` protegido por consulta prévia, que
 *    é onde duas requisições simultâneas criariam duas linhas.
 *
 * 2. **Trocar de conta no mesmo aparelho reaponta a linha.** O parceiro B
 *    registrando a instalação do parceiro A move `partnerId` para B. A partir
 *    daquele instante nenhuma consulta de entrega da conta A alcança este
 *    aparelho (§58). Não há janela: é a mesma escrita.
 *
 * 3. **Sair revoga, não apaga.** Uma linha apagada não conta história. O que o
 *    §57 exige é que o aparelho **pare** de receber o que era daquela conta, e
 *    uma revogação datada prova isso — um `DELETE` só prova que hoje não tem.
 *
 * E uma que é ausência de regra: nada aqui devolve `pushToken` para fora. Ele
 * entra, dorme e sai direto para o provedor no envio. Nunca para a interface,
 * nunca para log (§54, §96).
 */

export type RegistroDeDispositivo = {
  installationId: string;
  pushToken: string;
  platform: DevicePlatform;
  environment: "development" | "production";
  descricao?: string | null;
  appVersion?: string | null;
};

/** O que a rota devolve. Sem token: o aparelho já sabe o dele. */
export type DispositivoRegistrado = {
  id: string;
  installationId: string;
  platform: DevicePlatform;
  environment: string;
  registradoEm: string;
};

/**
 * Registra — ou renova — o endereço de entrega desta instalação.
 *
 * Chamar de novo com o mesmo `installationId` atualiza a linha existente,
 * inclusive quando o token mudou (§56) ou quando quem está logado mudou (§58).
 * Um registro novo sempre ressuscita uma linha revogada: se o aparelho está
 * pedindo para receber, ele está autorizado a receber de novo.
 */
export async function registrarDispositivo(
  partnerId: string,
  registro: RegistroDeDispositivo,
): Promise<DispositivoRegistrado> {
  const db = getDb();
  const agora = new Date();

  const [linha] = await db
    .insert(partnerDevices)
    .values({
      installationId: registro.installationId,
      partnerId,
      pushToken: registro.pushToken,
      platform: registro.platform,
      environment: registro.environment,
      descricao: registro.descricao ?? null,
      appVersion: registro.appVersion ?? null,
      lastSeenAt: agora,
    })
    .onConflictDoUpdate({
      target: partnerDevices.installationId,
      set: {
        partnerId,
        pushToken: registro.pushToken,
        platform: registro.platform,
        environment: registro.environment,
        descricao: registro.descricao ?? null,
        appVersion: registro.appVersion ?? null,
        lastSeenAt: agora,
        updatedAt: agora,
        // Registrar de novo é o oposto de revogar.
        revokedAt: null,
        revokedReason: null,
      },
    })
    .returning({
      id: partnerDevices.id,
      installationId: partnerDevices.installationId,
      platform: partnerDevices.platform,
      environment: partnerDevices.environment,
      createdAt: partnerDevices.createdAt,
    });

  return {
    id: linha.id,
    installationId: linha.installationId,
    platform: linha.platform,
    environment: linha.environment,
    registradoEm: linha.createdAt.toISOString(),
  };
}

/**
 * Desliga esta instalação da conta.
 *
 * O `partnerId` é exigido de propósito: sem ele, conhecer um `installationId`
 * bastaria para calar o aparelho de outra pessoa. Devolve `true` quando havia
 * o que revogar — e `false` não é erro, é o aparelho que já estava calado.
 */
export async function revogarDispositivo(
  partnerId: string,
  installationId: string,
  motivo: DeviceRevocation = "saiu",
): Promise<boolean> {
  const db = getDb();
  const agora = new Date();

  const linhas = await db
    .update(partnerDevices)
    .set({ revokedAt: agora, revokedReason: motivo, updatedAt: agora })
    .where(
      and(
        eq(partnerDevices.installationId, installationId),
        eq(partnerDevices.partnerId, partnerId),
        isNull(partnerDevices.revokedAt),
      ),
    )
    .returning({ id: partnerDevices.id });

  return linhas.length > 0;
}

/**
 * O provedor disse que este endereço não existe mais (`DeviceNotRegistered`).
 *
 * Diferente de sair: aqui não há conta pedindo nada — o aparelho foi
 * desinstalado, ou o token morreu. Insistir depois disso é gastar entrega em
 * um endereço morto (§59), então a linha some da consulta de destinos para
 * sempre, até que o aplicativo se registre de novo.
 */
export async function invalidarToken(pushToken: string): Promise<number> {
  const db = getDb();
  const agora = new Date();

  const linhas = await db
    .update(partnerDevices)
    .set({ revokedAt: agora, revokedReason: "desinstalado", updatedAt: agora })
    .where(and(eq(partnerDevices.pushToken, pushToken), isNull(partnerDevices.revokedAt)))
    .returning({ id: partnerDevices.id });

  return linhas.length;
}

/** Um destino de entrega. É a única forma de o token sair da tabela. */
export type Destino = {
  installationId: string;
  pushToken: string;
  platform: DevicePlatform;
  environment: string;
};

/**
 * Para onde mandar um aviso desta conta, agora.
 *
 * Vários aparelhos do mesmo parceiro recebem todos (§60): ele escolheu estar
 * logado nos dois. O que **não** acontece é a oportunidade virar duas no
 * domínio — isto aqui é entrega, e entrega não cria entidade.
 */
export async function destinosDoParceiro(partnerId: string): Promise<Destino[]> {
  const db = getDb();

  return db
    .select({
      installationId: partnerDevices.installationId,
      pushToken: partnerDevices.pushToken,
      platform: partnerDevices.platform,
      environment: partnerDevices.environment,
    })
    .from(partnerDevices)
    .where(and(eq(partnerDevices.partnerId, partnerId), isNull(partnerDevices.revokedAt)));
}

/**
 * O que a tela de Segurança pode mostrar sobre os aparelhos da conta.
 *
 * Sem token, sem endereço, sem nada que sirva para entregar: só quantos e
 * desde quando. É informação de conferência, não de operação.
 */
export type ResumoDeDispositivo = {
  installationId: string;
  platform: DevicePlatform;
  descricao: string | null;
  registradoEm: string;
  vistoEm: string;
};

export async function dispositivosDoParceiro(
  partnerId: string,
): Promise<ResumoDeDispositivo[]> {
  const db = getDb();

  const linhas = await db
    .select({
      installationId: partnerDevices.installationId,
      platform: partnerDevices.platform,
      descricao: partnerDevices.descricao,
      createdAt: partnerDevices.createdAt,
      lastSeenAt: partnerDevices.lastSeenAt,
    })
    .from(partnerDevices)
    .where(and(eq(partnerDevices.partnerId, partnerId), isNull(partnerDevices.revokedAt)))
    .orderBy(sql`${partnerDevices.lastSeenAt} desc`);

  return linhas.map((l) => ({
    installationId: l.installationId,
    platform: l.platform,
    descricao: l.descricao,
    registradoEm: l.createdAt.toISOString(),
    vistoEm: l.lastSeenAt.toISOString(),
  }));
}

/**
 * Revoga todas as outras instalações desta conta. Não é usado pelo aplicativo
 * hoje; existe porque "sair de todos os aparelhos" já é real para sessões
 * (`alterarSenha`), e o endereço de entrega precisa acompanhar — do contrário
 * trocar a senha derrubaria as sessões e deixaria os pushes indo.
 */
export async function revogarOutras(
  partnerId: string,
  installationId: string,
): Promise<number> {
  const db = getDb();
  const agora = new Date();

  const linhas = await db
    .update(partnerDevices)
    .set({ revokedAt: agora, revokedReason: "saiu", updatedAt: agora })
    .where(
      and(
        eq(partnerDevices.partnerId, partnerId),
        ne(partnerDevices.installationId, installationId),
        isNull(partnerDevices.revokedAt),
      ),
    )
    .returning({ id: partnerDevices.id });

  return linhas.length;
}
