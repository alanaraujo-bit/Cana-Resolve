import Link from "next/link";

import {
  FilterBar,
  FilterSelect,
  QuickFilters,
  SearchInput,
} from "@/components/ops/filters";
import {
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
import { cx } from "@/components/ui";
import { requireOperator } from "@/lib/auth/guard";
import { categoryOptions, urgencias } from "@/lib/categories";
import { listRequests } from "@/lib/domain/requests";
import { statesOf } from "@/lib/domain/states";

export const metadata = { title: "Solicitações" };
export const dynamic = "force-dynamic";

const atalhos = [
  { id: "abertas", label: "Em aberto" },
  { id: "nova", label: "Novas" },
  { id: "pronta", label: "Prontas para encaminhar" },
  { id: "encaminhada", label: "Encaminhadas" },
  { id: "resolvida", label: "Resolvidas" },
  { id: "todas", label: "Todas" },
];

export default async function SolicitacoesPage({
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

  const estado = um("estado") ?? "abertas";
  const { linhas, total, pagina, paginas } = await listRequests({
    estado,
    categoria: um("categoria"),
    urgencia: um("urgencia"),
    busca: um("busca"),
    pagina: Number(um("pagina") ?? 1),
  });

  return (
    <>
      <PageHeader
        eyebrow="Demanda"
        title="Solicitações"
        lead="Cada pedido de morador que entrou pelo site, com o código pelo qual ele é chamado."
      />

      <FilterBar>
        <SearchInput placeholder="Código, descrição, nome ou telefone" />
        <FilterSelect
          param="categoria"
          label="Categoria"
          todos="Todas as categorias"
          opcoes={categoryOptions.map((c) => ({ id: c.id, label: c.name }))}
        />
        <FilterSelect
          param="urgencia"
          label="Urgência"
          todos="Qualquer urgência"
          opcoes={urgencias.map((u) => ({ id: u.id, label: u.label }))}
        />
        <FilterSelect
          param="estado"
          label="Estado"
          todos="Estado…"
          opcoes={statesOf("request").map((s) => ({ id: s.id, label: s.label }))}
          soDesktop
        />
      </FilterBar>

      <div className="mb-4">
        <QuickFilters param="estado" opcoes={atalhos} padrao="abertas" />
      </div>

      <Panel className="overflow-hidden">
        {linhas.length === 0 ? (
          <EmptyState
            title={
              um("busca") || um("categoria") || um("urgencia")
                ? "Nenhum pedido com esses filtros"
                : "Nenhuma solicitação por aqui"
            }
            hint={
              um("busca") || um("categoria") || um("urgencia")
                ? "Tente afrouxar os filtros ou buscar por outro termo."
                : "Quando um morador enviar um pedido em /solicitar, ele nasce aqui com um código antes mesmo de a conversa no WhatsApp começar."
            }
          />
        ) : (
          <>
            <Responsive
              tabela={
            <TableShell className="ops-zebra">
              <thead>
                <tr>
                  <Th className="w-[6.5rem]">Código</Th>
                  <Th>O que a pessoa precisa</Th>
                  <Th className="w-[11rem]">Categoria</Th>
                  <Th className="w-[8rem]">Bairro</Th>
                  <Th className="w-[7rem]" align="center">
                    Enviado a
                  </Th>
                  <Th className="w-[11rem]">Estado</Th>
                  <Th className="w-[7.5rem]" align="right">
                    Entrou
                  </Th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((s) => (
                  <Tr key={s.id}>
                    <Td>
                      <Link
                        href={`/ops/solicitacoes/${s.id}`}
                        className="text-brand-ink hover:text-brand-hover font-mono text-[0.8125rem] tabular-nums"
                      >
                        {s.code}
                      </Link>
                    </Td>
                    <Td>
                      <Link
                        href={`/ops/solicitacoes/${s.id}`}
                        className="text-ink hover:text-brand-ink block max-w-[34rem] truncate transition-colors"
                        title={s.description}
                      >
                        {s.description}
                      </Link>
                      <span className="text-faint text-[0.75rem]">
                        {s.residentName}
                        {s.urgency === "urgente" ? " · urgente" : ""}
                      </span>
                    </Td>
                    <Td className="text-muted">{s.categoryName ?? <Dash />}</Td>
                    <Td className="text-muted">{s.neighborhood || <Dash />}</Td>
                    <Td align="center">
                      <span
                        className={cx(
                          "tabular-nums",
                          s.encaminhados === 0 ? "text-faint" : "text-ink",
                        )}
                      >
                        {s.encaminhados === 0 ? "—" : s.encaminhados}
                      </span>
                    </Td>
                    <Td>
                      <StatusBadge machine="request" status={s.status} />
                    </Td>
                    <Td align="right" className="text-faint text-[0.8125rem]">
                      <When value={s.createdAt} />
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </TableShell>
              }
              cartoes={
                <CardList>
                  {linhas.map((s) => (
                    <CardRow
                      key={s.id}
                      href={`/ops/solicitacoes/${s.id}`}
                      titulo={s.description}
                      selo={<StatusBadge machine="request" status={s.status} />}
                      meta={
                        <>
                          <span className="font-mono tabular-nums">{s.code}</span>
                          {" · "}
                          {s.residentName}
                          {s.urgency === "urgente" ? " · urgente" : ""}
                        </>
                      }
                      rodape={
                        <>
                          <span>{s.categoryName ?? "Sem categoria"}</span>
                          {s.neighborhood ? <span>· {s.neighborhood}</span> : null}
                          <span>
                            ·{" "}
                            {s.encaminhados === 0
                              ? "sem encaminhamento"
                              : `${s.encaminhados} parceiro${s.encaminhados > 1 ? "s" : ""}`}
                          </span>
                          <span>· <When value={s.createdAt} /></span>
                        </>
                      }
                    />
                  ))}
                </CardList>
              }
            />

            <ListFooter total={total} singular="solicitação" plural="solicitações">
              {paginas > 1 ? (
                <span className="flex items-center gap-3">
                  {pagina > 1 ? (
                    <Link
                      href={comPagina(params, pagina - 1)}
                      className="text-brand-ink hover:text-brand-hover"
                    >
                      Anterior
                    </Link>
                  ) : null}
                  <span>
                    {pagina} de {paginas}
                  </span>
                  {pagina < paginas ? (
                    <Link
                      href={comPagina(params, pagina + 1)}
                      className="text-brand-ink hover:text-brand-hover"
                    >
                      Próxima
                    </Link>
                  ) : null}
                </span>
              ) : null}
            </ListFooter>
          </>
        )}
      </Panel>
    </>
  );
}

/** Mantém os filtros atuais e troca só a página. */
function comPagina(
  params: Record<string, string | string[] | undefined>,
  pagina: number,
) {
  const query = new URLSearchParams();
  for (const [chave, valor] of Object.entries(params)) {
    if (chave === "pagina") continue;
    if (typeof valor === "string" && valor) query.set(chave, valor);
  }
  query.set("pagina", String(pagina));
  return `/ops/solicitacoes?${query}`;
}
