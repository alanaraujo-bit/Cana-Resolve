import { redirect } from "next/navigation";

import { LaunchPanel } from "@/components/ops/launch-panel";
import { ActionForm, inputClass, Label, Submit } from "@/components/ops/forms";
import {
  Badge,
  KeyValue,
  Panel,
  PanelHeader,
  PageHeader,
  When,
  formatDateTime,
} from "@/components/ops/ui";
import { cx } from "@/components/ui";
import { requireOperator } from "@/lib/auth/guard";
import { listSessions } from "@/lib/auth/session";
import { BETA_PRICE_CENTS, BETA_DAYS, formatBRL } from "@/lib/domain/beta";
import { foundersPendingStart } from "@/lib/domain/partners";
import { launchedAt } from "@/lib/domain/settings";
import { encerrarSessoes, registrarLancamento, trocarSenha } from "./actions";

export const metadata = { title: "Configurações" };
export const dynamic = "force-dynamic";

export default async function ConfigPage() {
  const user = await requireOperator();
  const [lancamento, pendentes, sessoes] = await Promise.all([
    launchedAt(),
    foundersPendingStart(),
    listSessions(user.id),
  ]);

  async function sairDeTodos() {
    "use server";
    await encerrarSessoes();
    redirect("/ops/entrar");
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Administração"
        title="Configurações"
        lead="O que governa a operação e o seu acesso."
      />

      <div className="space-y-5">
        {/* ---------- lançamento ---------- */}
        <Panel>
          <PanelHeader
            title="Lançamento da operação"
            hint="O momento em que o Canaã Resolve abre para os moradores."
            actions={
              lancamento ? (
                <Badge tone="positive">Aberta</Badge>
              ) : (
                <Badge tone="attention">Ainda não aberta</Badge>
              )
            }
          />
          <LaunchPanel
            lancadaEm={lancamento}
            pendentes={pendentes.map((p) => ({
              id: p.id,
              code: p.code,
              name: p.name,
              pago: Boolean(p.betaPaidAt),
              onboarding: Boolean(p.onboardingDoneAt),
            }))}
            podeExecutar={user.role === "owner"}
            action={registrarLancamento}
          />
        </Panel>

        {/* ---------- condição comercial ---------- */}
        <Panel>
          <PanelHeader
            title="Condição do Beta Fundador"
            hint="A regra que o sistema aplica hoje."
          />
          <dl className="grid grid-cols-2 gap-x-5 gap-y-4 px-4 py-4 sm:grid-cols-3">
            <KeyValue label="Valor">{formatBRL(BETA_PRICE_CENTS)}</KeyValue>
            <KeyValue label="Duração">{BETA_DAYS} dias</KeyValue>
            <KeyValue label="Início da contagem">No lançamento da operação</KeyValue>
          </dl>
          <p className="border-line text-faint border-t px-4 py-3 text-[0.8125rem] leading-relaxed">
            O que acontece depois dos {BETA_DAYS} dias ainda não foi decidido —
            valor, formato e regra de renovação. Nada disso está codificado em
            lugar nenhum, e nenhuma tela promete o que não foi definido. Quando
            a decisão existir, o lugar de mudar é{" "}
            <code className="text-muted">lib/domain/beta.ts</code>.
          </p>
        </Panel>

        {/* ---------- conta ---------- */}
        <Panel>
          <PanelHeader title="Sua conta" />
          <dl className="grid grid-cols-2 gap-x-5 gap-y-4 px-4 py-4 sm:grid-cols-3">
            <KeyValue label="Nome">{user.name}</KeyValue>
            <KeyValue label="E-mail">{user.email}</KeyValue>
            <KeyValue label="Papel">
              {user.role === "owner" ? "Responsável" : "Operador"}
            </KeyValue>
          </dl>

          <div className="border-line border-t">
            <ActionForm action={trocarSenha} className="space-y-3 px-4 py-4">
              <p className="text-ink text-[0.875rem] font-medium">Trocar a senha</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <Label htmlFor="atual">Senha atual</Label>
                  <input
                    id="atual"
                    name="atual"
                    type="password"
                    autoComplete="current-password"
                    required
                    className={cx(inputClass, "mt-1.5")}
                  />
                </div>
                <div>
                  <Label htmlFor="nova">Nova senha</Label>
                  <input
                    id="nova"
                    name="nova"
                    type="password"
                    autoComplete="new-password"
                    required
                    className={cx(inputClass, "mt-1.5")}
                  />
                </div>
                <div>
                  <Label htmlFor="confirma">Repita a nova</Label>
                  <input
                    id="confirma"
                    name="confirma"
                    type="password"
                    autoComplete="new-password"
                    required
                    className={cx(inputClass, "mt-1.5")}
                  />
                </div>
              </div>
              <Submit variant="outline">Trocar senha</Submit>
            </ActionForm>
          </div>
        </Panel>

        {/* ---------- sessões ---------- */}
        <Panel>
          <PanelHeader
            title="Aparelhos conectados"
            hint="Cada entrada sua que ainda está válida."
          />
          <ul className="divide-line divide-y">
            {sessoes.map((s) => (
              <li
                key={s.tokenHash}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5"
              >
                <span className="text-ink text-[0.875rem]">
                  {s.device ?? "Aparelho não identificado"}
                </span>
                <span className="text-faint text-[0.8125rem]">
                  usado <When value={s.lastSeenAt} /> · expira{" "}
                  {formatDateTime(s.expiresAt)}
                </span>
              </li>
            ))}
          </ul>
          <form action={sairDeTodos} className="border-line border-t px-4 py-3">
            <button
              type="submit"
              className="border-danger/30 text-danger hover:bg-danger-soft inline-flex h-9 items-center rounded-lg border px-3.5 text-[0.875rem] font-medium transition-colors"
            >
              Sair de todos os aparelhos
            </button>
            <p className="text-faint mt-2 text-[0.75rem]">
              Encerra também esta sessão. Você vai precisar entrar de novo.
            </p>
          </form>
        </Panel>
      </div>
    </div>
  );
}
