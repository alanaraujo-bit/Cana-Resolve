import Link from "next/link";

import { FilterBar, FilterSelect, QuickFilters, SearchInput } from "@/components/ops/filters";
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
} from "@/components/ops/ui";
import { buttonClass } from "@/components/ui";
import { requireOperator } from "@/lib/auth/guard";
import { categoryOptions } from "@/lib/categories";
import { betaStatus } from "@/lib/domain/beta";
import { listPartners } from "@/lib/domain/partners";
import { formatPhone } from "@/lib/domain/phone";
import { statesOf } from "@/lib/domain/states";

export const metadata = { title: "Parceiros" };
export const dynamic = "force-dynamic";

const atalhos = [
  { id: "todos", label: "Todos" },
  { id: "ativo", label: "Ativos" },
  { id: "aguardando_lancamento", label: "Aguardando lançamento" },
  { id: "pausado", label: "Pausados" },
];

export default async function ParceirosPage({
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

  const { linhas, total } = await listPartners({
    estado: um("estado") ?? "todos",
    categoria: um("categoria"),
    busca: um("busca"),
    filtro: um("filtro"),
  });

  return (
    <>
      <PageHeader
        eyebrow="Rede"
        title="Parceiros"
        lead="Quem atende Canaã pelo Canaã Resolve — e em que condição."
        actions={
          <Link href="/ops/cadastros" className={buttonClass("outline", "sm")}>
            Fila de cadastros
          </Link>
        }
      />

      <FilterBar>
        <SearchInput placeholder="Nome, responsável, código ou telefone" />
        <FilterSelect
          param="categoria"
          label="Categoria"
          todos="Todas as categorias"
          opcoes={categoryOptions.map((c) => ({ id: c.id, label: c.name }))}
        />
        <FilterSelect
          param="estado"
          label="Situação"
          todos="Qualquer situação"
          opcoes={statesOf("partner").map((s) => ({ id: s.id, label: s.label }))}
          soDesktop
        />
        <FilterSelect
          param="filtro"
          label="Recorte"
          todos="Sem recorte"
          opcoes={[
            { id: "fundadores", label: "Só Fundadores" },
            { id: "sem_pagamento", label: "Fundadores sem pagamento" },
          ]}
        />
      </FilterBar>

      <div className="mb-4">
        <QuickFilters param="estado" opcoes={atalhos} padrao="todos" />
      </div>

      <Panel className="overflow-hidden">
        {linhas.length === 0 ? (
          <EmptyState
            title={total === 0 ? "A rede ainda está vazia" : "Ninguém com esses filtros"}
            hint={
              total === 0
                ? "Os parceiros nascem da fila de cadastros: quando você aprova uma empresa, ela aparece aqui. Sem parceiro na rede, um pedido de morador não tem para onde ir."
                : "Tente afrouxar os filtros."
            }
            action={
              total === 0 ? (
                <Link href="/ops/cadastros" className={buttonClass("brand", "sm")}>
                  Ver cadastros recebidos
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
                      <Th>Parceiro</Th>
                      <Th className="w-[16rem]">Categorias</Th>
                      <Th className="w-[10rem]">WhatsApp</Th>
                      <Th className="w-[12rem]">Situação</Th>
                      <Th className="w-[13rem]">Beta Fundador</Th>
                      <Th className="w-[7rem]" align="right">
                        Recebeu
                      </Th>
                    </tr>
                  </thead>
                  <tbody>
                    {linhas.map((p) => {
                      const beta = betaStatus(p);
                      return (
                        <Tr key={p.id}>
                          <Td>
                            <Link
                              href={`/ops/parceiros/${p.id}`}
                              className="text-ink hover:text-brand-ink font-medium transition-colors"
                            >
                              {p.name}
                            </Link>
                            <span className="text-faint block text-[0.75rem]">
                              <span className="font-mono tabular-nums">{p.code}</span>
                              {p.ownerName ? ` · ${p.ownerName}` : ""}
                            </span>
                          </Td>
                          <Td className="text-muted">{p.categorias || <Dash />}</Td>
                          <Td className="text-muted tabular-nums">
                            {formatPhone(p.whatsapp)}
                          </Td>
                          <Td>
                            <StatusBadge machine="partner" status={p.status} />
                          </Td>
                          <Td>
                            {p.founder ? (
                              <Badge
                                tone={
                                  beta.phase === "em_andamento"
                                    ? "positive"
                                    : beta.phase === "aguardando_pagamento"
                                      ? "attention"
                                      : "neutral"
                                }
                                title={beta.hint}
                              >
                                {beta.label}
                              </Badge>
                            ) : (
                              <Dash />
                            )}
                          </Td>
                          <Td align="right" className="text-muted tabular-nums">
                            {p.recebidos === 0 ? <Dash /> : p.recebidos}
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
                    const beta = betaStatus(p);
                    return (
                      <CardRow
                        key={p.id}
                        href={`/ops/parceiros/${p.id}`}
                        titulo={p.name}
                        selo={<StatusBadge machine="partner" status={p.status} />}
                        meta={
                          <>
                            <span className="font-mono tabular-nums">{p.code}</span>
                            {p.ownerName ? ` · ${p.ownerName}` : ""}
                            {" · "}
                            {formatPhone(p.whatsapp)}
                          </>
                        }
                        rodape={
                          <>
                            <span>{p.categorias || "Sem categoria"}</span>
                            {p.founder ? (
                              <Badge
                                tone={beta.phase === "em_andamento" ? "positive" : "neutral"}
                                dot={false}
                              >
                                {beta.label}
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
            <ListFooter total={total} singular="parceiro" plural="parceiros" />
          </>
        )}
      </Panel>
    </>
  );
}
