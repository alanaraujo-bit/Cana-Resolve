import Link from "next/link";

import {
  Badge,
  EmptyState,
  Metric,
  Panel,
  PanelHeader,
  PageHeader,
  StatusBadge,
  When,
} from "@/components/ops/ui";
import { buttonClass } from "@/components/ui";
import { requireOperator } from "@/lib/auth/guard";
import { categoryName } from "@/lib/categories";
import { loadDashboard, latestRequests } from "@/lib/domain/dashboard";
import { subjectHref, subjectLabel } from "@/lib/domain/links";

export const metadata = { title: "Visão geral" };
export const dynamic = "force-dynamic";

export default async function VisaoGeralPage() {
  const user = await requireOperator();
  const [dados, ultimas] = await Promise.all([loadDashboard(), latestRequests(6)]);
  const { numeros, pendencias, lancamento } = dados;

  const primeiroNome = user.name.split(/\s+/)[0];
  const hora = new Date().getHours();
  const saudacao = hora < 5 ? "Boa madrugada" : hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";

  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title={`${saudacao}, ${primeiroNome}`}
        lead={
          lancamento
            ? "A operação está aberta para os moradores. Isto é o que está em movimento agora."
            : "A operação ainda não abriu para os moradores. Isto é o que está em movimento agora."
        }
        actions={
          <>
            <Link href="/ops/comercial/novo" className={buttonClass("outline", "sm")}>
              Novo prospect
            </Link>
            <Link href="/ops/solicitacoes" className={buttonClass("brand", "sm")}>
              Ver solicitações
            </Link>
          </>
        }
      />

      {/* ---------- o que pede ação ---------- */}
      {pendencias.length > 0 ? (
        <Panel className="mb-6 overflow-hidden">
          <PanelHeader
            title="Precisa de você"
            hint="A operação para aqui até alguém decidir."
          />
          <ul className="divide-line divide-y">
            {pendencias.map((p) => (
              <li key={p.id}>
                <Link
                  href={p.href}
                  className="hover:bg-surface-2/70 flex items-center gap-4 px-4 py-3 transition-colors"
                >
                  <span className="border-accent-line bg-accent-soft text-accent-ink grid h-9 w-9 shrink-0 place-items-center rounded-lg border font-sans text-[0.9375rem] font-semibold tabular-nums">
                    {p.count}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="text-ink block text-[0.9375rem] leading-snug font-medium">
                      {p.label}
                    </span>
                    <span className="text-faint block text-[0.8125rem] leading-snug">
                      {p.hint}
                    </span>
                  </span>
                  <span aria-hidden="true" className="text-faint shrink-0 text-[1.125rem]">
                    ›
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      ) : (
        <Panel className="mb-6">
          <EmptyState
            title="Nada esperando decisão"
            hint="Nenhuma solicitação parada, nenhum cadastro sem análise e nenhum retorno atrasado. Quando algo chegar, aparece aqui primeiro."
          />
        </Panel>
      )}

      {/* ---------- números ---------- */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <Metric
          label="Pedidos abertos"
          value={numeros.solicitacoesAbertas}
          hint={
            numeros.solicitacoesAtencao > 0
              ? `${numeros.solicitacoesAtencao} sem encaminhamento`
              : "nenhum parado"
          }
          tone={numeros.solicitacoesAtencao > 0 ? "attention" : undefined}
          href="/ops/solicitacoes?estado=abertas"
        />
        <Metric
          label="Encaminhamentos vivos"
          value={numeros.oportunidadesVivas}
          hint="ainda podem virar serviço"
          href="/ops/oportunidades"
        />
        <Metric
          label="No funil"
          value={numeros.prospectsAtivos}
          hint="empresas a caminho"
          href="/ops/comercial"
        />
        <Metric
          label="Parceiros ativos"
          value={numeros.parceirosAtivos}
          hint={
            numeros.parceirosAguardando > 0
              ? `+${numeros.parceirosAguardando} aguardando o lançamento`
              : "recebendo oportunidades"
          }
          href="/ops/parceiros"
        />
        <Metric
          label="Fundadores"
          value={numeros.fundadores}
          hint={
            numeros.aguardandoInicioBeta > 0
              ? `${numeros.aguardandoInicioBeta} com os 90 dias por começar`
              : "na primeira fase"
          }
          href="/ops/parceiros?filtro=fundadores"
        />
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[1.15fr_1fr]">
        {/* ---------- últimos pedidos ---------- */}
        <Panel className="overflow-hidden">
          <PanelHeader
            title="Últimos pedidos"
            hint="O que chegou pelo site, do mais recente para o mais antigo."
            actions={
              <Link
                href="/ops/solicitacoes"
                className="text-brand-ink hover:text-brand-hover text-[0.8125rem] font-medium"
              >
                Ver todos
              </Link>
            }
          />
          {ultimas.length === 0 ? (
            <EmptyState
              title="Nenhuma solicitação ainda"
              hint="Quando um morador enviar um pedido em /solicitar, ele aparece aqui com um código antes mesmo de a conversa no WhatsApp começar."
            />
          ) : (
            <ul className="divide-line divide-y">
              {ultimas.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/ops/solicitacoes/${s.id}`}
                    className="hover:bg-surface-2/70 block px-4 py-3 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-faint font-mono text-[0.75rem] tabular-nums">
                        {s.code}
                      </span>
                      <StatusBadge machine="request" status={s.status} />
                    </div>
                    <p className="text-ink mt-1.5 line-clamp-2 text-[0.9375rem] leading-snug">
                      {s.description}
                    </p>
                    <div className="text-faint mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.8125rem]">
                      <span>{categoryName(s.categoryId) || "Sem categoria"}</span>
                      {s.neighborhood ? <span>· {s.neighborhood}</span> : null}
                      <span>· <When value={s.createdAt} /></span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="space-y-6">
          {/* ---------- próximas ações ---------- */}
          <Panel className="overflow-hidden">
            <PanelHeader
              title="Próximos retornos"
              hint="Quem você combinou de procurar, e quando."
            />
            {dados.proximasAcoes.length === 0 ? (
              <EmptyState
                title="Nenhum retorno marcado"
                hint="Ao registrar uma conversa no funil, marque a próxima ação: é o que evita que uma empresa interessada seja esquecida."
              />
            ) : (
              <ul className="divide-line divide-y">
                {dados.proximasAcoes.map((p) => {
                  const atrasado = p.nextActionAt! <= dados.agora;
                  return (
                    <li key={p.id}>
                      <Link
                        href={`/ops/comercial/${p.id}`}
                        className="hover:bg-surface-2/70 flex items-start gap-3 px-4 py-2.5 transition-colors"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="text-ink block truncate text-[0.9375rem] font-medium">
                            {p.name}
                          </span>
                          <span className="text-faint block truncate text-[0.8125rem]">
                            {p.nextAction || "Sem descrição da próxima ação"}
                          </span>
                        </span>
                        <Badge tone={atrasado ? "attention" : "neutral"} dot={false}>
                          <When value={p.nextActionAt} />
                        </Badge>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          {/* ---------- atividade ---------- */}
          <Panel className="overflow-hidden">
            <PanelHeader
              title="Aconteceu agora há pouco"
              hint="Tudo que o sistema registrou, em ordem."
            />
            {dados.atividade.length === 0 ? (
              <EmptyState
                title="Sem movimento ainda"
                hint="Cada mudança de estado, cadastro recebido e encaminhamento feito aparece aqui automaticamente."
              />
            ) : (
              <ol className="divide-line divide-y">
                {dados.atividade.map((a) => (
                  <li key={a.id} className="px-4 py-2.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <Link
                        href={subjectHref(a.subjectType, a.subjectId)}
                        className="text-ink hover:text-brand-ink min-w-0 flex-1 text-[0.875rem] leading-snug transition-colors"
                      >
                        {a.summary}
                      </Link>
                      <span className="text-faint shrink-0 text-[0.75rem]">
                        <When value={a.at} />
                      </span>
                    </div>
                    <p className="text-faint mt-0.5 text-[0.75rem]">
                      {subjectLabel(a.subjectType)}
                      {a.operatorName ? ` · ${a.operatorName}` : " · sistema"}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>
      </div>

      {!lancamento ? (
        <Panel className="border-brand-line bg-brand-soft/40 mt-6 px-4 py-3.5">
          <p className="text-brand-ink text-[0.9375rem] leading-relaxed">
            <strong className="font-semibold">A operação ainda não foi aberta.</strong>{" "}
            Os 90 dias dos Parceiros Fundadores só começam a contar quando você
            registrar o lançamento — não no pagamento.{" "}
            <Link href="/ops/config" className="cr-link underline-offset-4">
              Ver em Configurações
            </Link>
            .
          </p>
        </Panel>
      ) : null}
    </>
  );
}
