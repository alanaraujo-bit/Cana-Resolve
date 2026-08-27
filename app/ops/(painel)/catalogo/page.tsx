import { CatalogSection } from "@/components/ops/catalog-section";
import { Panel, PageHeader } from "@/components/ops/ui";
import { requireOperator } from "@/lib/auth/guard";
import { listCatalog } from "@/lib/domain/catalog";
import { alternarAtivo, criarServico } from "./actions";

export const metadata = { title: "Catálogo" };
export const dynamic = "force-dynamic";

export default async function CatalogoPage() {
  await requireOperator();
  const catalogo = await listCatalog();

  const totalServicos = catalogo.reduce((soma, c) => soma + c.servicos.length, 0);

  return (
    <>
      <PageHeader
        eyebrow="Catálogo"
        title="Categorias e serviços"
        lead={
          <>
            Categoria é o balcão; serviço é o problema real da pessoa. Marcar os
            serviços que cada parceiro faz é o que transforma “manda para quem é
            de elétrica” em “manda para quem conserta chuveiro”.
          </>
        }
      />

      <p className="text-faint mb-4 text-[0.8125rem]">
        {catalogo.length} categorias · {totalServicos} serviços
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        {catalogo.map((categoria) => (
          <Panel key={categoria.id} className="overflow-hidden">
            <CatalogSection
              categoria={categoria}
              criarServico={criarServico}
              alternarAtivo={alternarAtivo}
            />
          </Panel>
        ))}
      </div>
    </>
  );
}
