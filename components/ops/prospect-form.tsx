"use client";

import { cx } from "@/components/ui";
import type { ServerAction } from "@/lib/action-result";
import { ActionForm, inputClass, Label, Submit, textareaClass } from "./forms";

export type ProspectFormValues = {
  id: string;
  name: string;
  contactName: string | null;
  whatsapp: string;
  email: string | null;
  categoryId: string | null;
  website: string | null;
  instagram: string | null;
  address: string | null;
  notes: string | null;
  nextAction: string | null;
  nextActionAt: Date | null;
};

/** `2026-08-26`, o formato que `<input type="date">` entende. */
function paraCampoData(data: Date | null) {
  if (!data) return "";
  const local = new Date(data.getTime() - data.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

/**
 * O perfil do prospect.
 *
 * O bloco da próxima ação fica em destaque no topo, e não perdido entre os
 * outros campos, porque ele é o que faz o funil andar: uma empresa interessada
 * sem retorno marcado é uma empresa que vai ser esquecida.
 */
export function ProspectForm({
  action,
  valores,
  categorias,
}: {
  action: ServerAction;
  valores: ProspectFormValues;
  categorias: { id: string; name: string }[];
}) {
  return (
    <ActionForm action={action} className="space-y-4 px-4 py-4">
      <input type="hidden" name="id" value={valores.id} />

      <div className="border-line-strong bg-surface-2/60 grid gap-3 rounded-lg border border-dashed p-3 sm:grid-cols-[1fr_10rem]">
        <div>
          <Label htmlFor="proximaAcao">Próxima ação</Label>
          <input
            id="proximaAcao"
            name="proximaAcao"
            defaultValue={valores.nextAction ?? ""}
            placeholder="Ex.: retornar a ligação, mandar a página"
            className={cx(inputClass, "mt-1.5")}
          />
        </div>
        <div>
          <Label htmlFor="proximaAcaoEm">Quando</Label>
          <input
            id="proximaAcaoEm"
            name="proximaAcaoEm"
            type="date"
            defaultValue={paraCampoData(valores.nextActionAt)}
            className={cx(inputClass, "mt-1.5")}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="nome">Empresa</Label>
          <input
            id="nome"
            name="nome"
            required
            defaultValue={valores.name}
            className={cx(inputClass, "mt-1.5")}
          />
        </div>

        <div>
          <Label htmlFor="contato">Responsável</Label>
          <input
            id="contato"
            name="contato"
            defaultValue={valores.contactName ?? ""}
            className={cx(inputClass, "mt-1.5")}
          />
        </div>

        <div>
          <Label htmlFor="telefone">WhatsApp</Label>
          <input
            id="telefone"
            name="telefone"
            required
            inputMode="tel"
            defaultValue={valores.whatsapp}
            className={cx(inputClass, "mt-1.5")}
          />
        </div>

        <div>
          <Label htmlFor="email">E-mail</Label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={valores.email ?? ""}
            className={cx(inputClass, "mt-1.5")}
          />
        </div>

        <div>
          <Label htmlFor="categoria">Categoria</Label>
          <select
            id="categoria"
            name="categoria"
            defaultValue={valores.categoryId ?? ""}
            className={cx(inputClass, "mt-1.5")}
          >
            <option value="">Ainda não sei</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="instagram">Instagram</Label>
          <input
            id="instagram"
            name="instagram"
            defaultValue={valores.instagram ?? ""}
            className={cx(inputClass, "mt-1.5")}
          />
        </div>

        <div>
          <Label htmlFor="site">Site</Label>
          <input
            id="site"
            name="site"
            defaultValue={valores.website ?? ""}
            className={cx(inputClass, "mt-1.5")}
          />
        </div>

        <div>
          <Label htmlFor="endereco">Endereço</Label>
          <input
            id="endereco"
            name="endereco"
            defaultValue={valores.address ?? ""}
            className={cx(inputClass, "mt-1.5")}
          />
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="observacoes">Observações</Label>
          <textarea
            id="observacoes"
            name="observacoes"
            rows={3}
            defaultValue={valores.notes ?? ""}
            className={cx(textareaClass, "mt-1.5")}
          />
        </div>
      </div>

      <Submit variant="outline">Salvar</Submit>
    </ActionForm>
  );
}
