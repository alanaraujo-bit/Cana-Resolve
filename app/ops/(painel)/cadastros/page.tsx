import { ApplicationCard } from "@/components/ops/application-card";
import { QuickFilters, SearchInput, FilterBar } from "@/components/ops/filters";
import { EmptyState, Panel, PageHeader } from "@/components/ops/ui";
import { requireOperator } from "@/lib/auth/guard";
import { listCatalog } from "@/lib/domain/catalog";
import { listApplications } from "@/lib/domain/partners";
import { analisarCadastro, aprovarCadastro } from "./actions";

export const metadata = { title: "Cadastros" };
export const dynamic = "force-dynamic";

const atalhos = [
  { id: "pendentes", label: "Esperando análise" },
  { id: "aprovado", label: "Aprovados" },
  { id: "recusado", label: "Recusados" },
  { id: "todos", label: "Todos" },
];

export default async function CadastrosPage({
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

  const [linhas, catalogo] = await Promise.all([
    listApplications({ estado: um("estado") ?? "pendentes", busca: um("busca") }),
    listCatalog(),
  ]);

  const destacado = um("cadastro");

  return (
    <>
      <PageHeader
        eyebrow="Qualificação"
        title="Cadastros recebidos"
        lead="O que chegou pelo formulário de /parceiros. Nenhuma empresa entra na rede sem alguém olhar."
      />

      <FilterBar>
        <SearchInput placeholder="Empresa, responsável ou telefone" />
      </FilterBar>

      <div className="mb-4">
        <QuickFilters param="estado" opcoes={atalhos} padrao="pendentes" />
      </div>

      <Panel className="overflow-hidden">
        {linhas.length === 0 ? (
          <EmptyState
            title={
              um("busca")
                ? "Nenhum cadastro com esse termo"
                : (um("estado") ?? "pendentes") === "pendentes"
                  ? "Nenhum cadastro esperando"
                  : "Nada por aqui"
            }
            hint={
              um("busca")
                ? "Tente outro termo."
                : (um("estado") ?? "pendentes") === "pendentes"
                  ? "Toda fila vazia é boa notícia. Quando uma empresa preencher o formulário de /parceiros, o cadastro cai aqui — e não some se ela fechar o WhatsApp."
                  : "Ainda não há cadastros nesse estado."
            }
          />
        ) : (
          <ul className="divide-line divide-y">
            {linhas.map(({ application, categoryName, prospectCode }) => (
              <li key={application.id}>
                <ApplicationCard
                  cadastro={{
                    id: application.id,
                    name: application.name,
                    company: application.company,
                    whatsapp: application.whatsapp,
                    categoryId: application.categoryId,
                    categoryName,
                    servesCanaa: application.servesCanaa,
                    howFound: application.howFound,
                    status: application.status,
                    reviewNotes: application.reviewNotes,
                    attribution: application.attribution,
                    createdAt: application.createdAt,
                    prospectId: application.prospectId,
                    prospectCode,
                  }}
                  categorias={catalogo.map((c) => ({ id: c.id, name: c.name }))}
                  analisar={analisarCadastro}
                  aprovar={aprovarCadastro}
                  abertoInicialmente={destacado === application.id}
                />
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
