import Link from "next/link";

import { NewProspectForm } from "@/components/ops/new-prospect-form";
import { Panel, PageHeader } from "@/components/ops/ui";
import { requireOperator } from "@/lib/auth/guard";
import { listCatalog } from "@/lib/domain/catalog";
import { criarProspect } from "../actions";

export const metadata = { title: "Novo prospect" };
export const dynamic = "force-dynamic";

export default async function NovoProspectPage() {
  await requireOperator();
  const catalogo = await listCatalog();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        eyebrow="Comercial"
        title="Nova empresa no funil"
        lead="Só o essencial agora. O resto do perfil se completa na conversa."
        actions={
          <Link
            href="/ops/comercial"
            className="text-muted hover:text-ink inline-flex h-9 items-center px-1 text-[0.875rem] transition-colors"
          >
            Voltar
          </Link>
        }
      />

      <Panel>
        <NewProspectForm
          action={criarProspect}
          categorias={catalogo.map((c) => ({ id: c.id, name: c.name }))}
        />
      </Panel>

      <p className="text-faint mt-4 text-[0.8125rem] leading-relaxed">
        Se o WhatsApp já estiver no funil, você vai parar direto no registro que
        já existe — nenhuma empresa entra duas vezes.
      </p>
    </div>
  );
}
