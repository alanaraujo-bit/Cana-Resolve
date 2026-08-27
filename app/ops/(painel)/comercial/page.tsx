import Link from "next/link";

import { FilterBar, FilterSelect, SearchInput } from "@/components/ops/filters";
import {
  Badge,
  CardList,
  CardRow,
  Dash,
  EmptyState,
  ListFooter,
  Panel,
  PageHeader,
  Responsive,
  StatusBadge,
  TableShell,
  Td,
  Th,
  Tr,
  When,
} from "@/components/ops/ui";
import { buttonClass, cx } from "@/components/ui";
import { requireOperator } from "@/lib/auth/guard";
import { categoryOptions } from "@/lib/categories";
import { formatPhone } from "@/lib/domain/phone";
import { listProspects, prospectCounts } from "@/lib/domain/prospects";
import { prospectFunnel, stateLabel, statesOf } from "@/lib/domain/states";

export const metadata = { title: "Comercial" };
export const dynamic = "force-dynamic";

export default async function ComercialPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireOperator();
  const params = await searchParams;
  const um = (chave: string) => {
    const valor = params[chave];
    return Array.isArray(valor) ? valor[0] : valor;
  };

  const estado = um("estado") ?? "ativos";
  const [{ linhas, total, agora: instante }, contagens] = await Promise.all([
    listProspects({
      estado,
      categoria: um("categoria"),
      busca: um("busca"),
      filtro: um("filtro"),
      pagina: Number(um("pagina") ?? 1),
    }),
    prospectCounts(),
  ]);

  const agora = instante.getTime();
  const query = (mudancas: Record<string, string | null>) => {
    const proximos = new URLSearchParams();
    for (const [chave, valor] of Object.entries(params)) {
      if (typeof valor === "string" && valor) proximos.set(chave, valor);
    }
    for (const [chave, valor] of Object.entries(mudancas)) {
      if (valor === null) proximos.delete(chave);
      else proximos.set(chave, valor);
    }
    proximos.delete("pagina");
    return proximos.size ? `/ops/comercial?${proximos}` : "/ops/comercial";
  };

  return (
    <>
      <PageHeader
        eyebrow="Comercial"
        title="Funil de parceiros"
        lead="Cada empresa mapeada, desde o primeiro contato até virar Parceiro Fundador."
        actions={
          <Link href="/ops/comercial/novo" className={buttonClass("brand", "sm")}>
            Novo prospect
          </Link>
        }
      />

      {/* ---------- o funil em números ---------- */}
      <div className="border-line bg-surface shadow-hair mb-5 overflow-x-auto rounded-xl border">
        <ol className="flex min-w-max">
          {prospectFunnel.map((etapa, indice) => {
            const n = contagens[etapa] ?? 0;
            const ativo = estado === etapa;
            return (
              <li key={etapa} className="relative">
                <Link
                  href={query({ estado: ativo ? null : etapa, filtro: null })}
                  className={cx(
                    "border-line block border-r px-4 py-3 transition-colors",
                    ativo ? "bg-brand-soft" : "hover:bg-surface-2",
                    indice === prospectFunnel.length - 1 && "border-r-0",
                  )}
                >
                  <span
                    className={cx(
                      "block font-sans text-[1.25rem] leading-none font-semibold tabular-nums",
                      n === 0 ? "text-faint" : ativo ? "text-brand-ink" : "text-ink",
                    )}
                  >
                    {n}
                  </span>
                  <span
                    className={cx(
                      "mt-1.5 block text-[0.75rem] leading-tight whitespace-nowrap",
                      ativo ? "text-brand-ink" : "text-faint",
                    )}
                  >
                    {stateLabel("prospect", etapa)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </div>

      <FilterBar>
        <SearchInput placeholder="Empresa, responsável, código ou telefone" />
        <FilterSelect
          param="categoria"
          label="Categoria"
          todos="Todas as categorias"
          opcoes={categoryOptions.map((c) => ({ id: c.id, label: c.name }))}
        />
        <FilterSelect
          param="estado"
          label="Etapa"
          todos="Todas as etapas"
          opcoes={statesOf("prospect").map((s) => ({ id: s.id, label: s.label }))}
        />
        <Link
          href={query({ filtro: um("filtro") === "atrasados" ? null : "atrasados" })}
          className={cx(
            "inline-flex h-9 items-center rounded-lg border px-3 text-[0.8125rem] font-medium transition-colors",
            um("filtro") === "atrasados"
              ? "border-accent-line bg-accent-soft text-accent-ink"
              : "border-line text-muted hover:border-line-strong hover:text-ink",
          )}
        >
          Retorno atrasado
        </Link>
      </FilterBar>

      <Panel className="overflow-hidden">
        {linhas.length === 0 ? (
          <EmptyState
            title={total === 0 ? "O funil está vazio" : "Nenhuma empresa com esses filtros"}
            hint={
              total === 0
                ? "A prospecção começa aqui: cadastre a primeira empresa que você quer trazer para a rede. Empresas que se cadastram sozinhas pelo site entram automaticamente."
                : "Tente afrouxar os filtros ou buscar por outro termo."
            }
            action={
              total === 0 ? (
                <Link href="/ops/comercial/novo" className={buttonClass("brand", "sm")}>
                  Cadastrar a primeira
                </Link>
              ) : null
            }
          />
        ) : (
          <>
            <Responsive
              tabela={
            <TableShell className="ops-zebra">
              <thead>
                <tr>
                  <Th>Empresa</Th>
                  <Th className="w-[11rem]">Categoria</Th>
                  <Th className="w-[10rem]">WhatsApp</Th>
                  <Th className="w-[12rem]">Etapa</Th>
                  <Th className="w-[14rem]">Próxima ação</Th>
                  <Th className="w-[8rem]" align="right">
                    Última conversa
                  </Th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((p) => {
                  const atrasado = p.nextActionAt && p.nextActionAt.getTime() <= agora;
                  return (
                    <Tr key={p.id}>
                      <Td>
                        <Link
                          href={`/ops/comercial/${p.id}`}
                          className="text-ink hover:text-brand-ink font-medium transition-colors"
                        >
                          {p.name}
                        </Link>
                        <span className="text-faint block text-[0.75rem]">
                          <span className="font-mono tabular-nums">{p.code}</span>
                          {p.contactName ? ` · ${p.contactName}` : ""}
                        </span>
                      </Td>
                      <Td className="text-muted">{p.categoryName ?? <Dash />}</Td>
                      <Td className="text-muted tabular-nums">
                        {formatPhone(p.whatsapp)}
                      </Td>
                      <Td>
                        <StatusBadge machine="prospect" status={p.status} />
                      </Td>
                      <Td>
                        {p.nextActionAt ? (
                          <span className="flex flex-col gap-1">
                            <Badge tone={atrasado ? "attention" : "neutral"} dot={false}>
                              <When value={p.nextActionAt} />
                            </Badge>
                            {p.nextAction ? (
                              <span
                                className="text-faint block max-w-[13rem] truncate text-[0.75rem]"
                                title={p.nextAction}
                              >
                                {p.nextAction}
                              </span>
                            ) : null}
                          </span>
                        ) : (
                          <Dash />
                        )}
                      </Td>
                      <Td align="right" className="text-faint text-[0.8125rem]">
                        <When value={p.lastInteractionAt ?? p.createdAt} />
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </TableShell>
              }
              cartoes={
                <CardList>
                  {linhas.map((p) => {
                    const atrasado = p.nextActionAt && p.nextActionAt.getTime() <= agora;
                    return (
                      <CardRow
                        key={p.id}
                        href={`/ops/comercial/${p.id}`}
                        titulo={p.name}
                        selo={<StatusBadge machine="prospect" status={p.status} />}
                        meta={
                          <>
                            <span className="font-mono tabular-nums">{p.code}</span>
                            {p.contactName ? ` · ${p.contactName}` : ""}
                            {" · "}
                            {formatPhone(p.whatsapp)}
                          </>
                        }
                        rodape={
                          <>
                            <span>{p.categoryName ?? "Sem categoria"}</span>
                            {p.nextActionAt ? (
                              <Badge tone={atrasado ? "attention" : "neutral"} dot={false}>
                                {p.nextAction || "Retorno"} · <When value={p.nextActionAt} />
                              </Badge>
                            ) : null}
                          </>
                        }
                      />
                    );
                  })}
                </CardList>
              }
            />
            <ListFooter total={total} singular="empresa" plural="empresas" />
          </>
        )}
      </Panel>
    </>
  );
}
