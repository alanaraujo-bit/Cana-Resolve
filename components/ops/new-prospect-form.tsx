"use client";

import { cx } from "@/components/ui";
import type { ServerAction } from "@/lib/action-result";
import { ActionForm, inputClass, Label, Submit, textareaClass } from "./forms";

/**
 * Cadastro de uma empresa no funil.
 *
 * Dois campos obrigatórios: nome e WhatsApp. O resto é o que você já souber.
 * Um formulário de prospecção com quinze campos obrigatórios não é rigor — é
 * a garantia de que ninguém vai cadastrar a empresa que acabou de ver na rua.
 */
export function NewProspectForm({
  action,
  categorias,
}: {
  action: ServerAction;
  categorias: { id: string; name: string }[];
}) {
  return (
    <ActionForm action={action} className="space-y-4 px-4 py-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="nome">Empresa</Label>
          <input
            id="nome"
            name="nome"
            required
            autoFocus
            placeholder="Como a empresa se chama"
            className={cx(inputClass, "mt-1.5")}
          />
        </div>

        <div>
          <Label htmlFor="contato">Responsável</Label>
          <input
            id="contato"
            name="contato"
            placeholder="Com quem se fala"
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
            placeholder="(94) 99999-9999"
            className={cx(inputClass, "mt-1.5")}
          />
        </div>

        <div>
          <Label htmlFor="categoria">Categoria</Label>
          <select id="categoria" name="categoria" className={cx(inputClass, "mt-1.5")}>
            <option value="">Ainda não sei</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="origem" hint="Como você chegou nela">
            Origem
          </Label>
          <select id="origem" name="origem" className={cx(inputClass, "mt-1.5")}>
            <option value="mapeamento">Mapeamento</option>
            <option value="indicacao">Indicação</option>
            <option value="instagram">Instagram</option>
            <option value="google">Google / Maps</option>
            <option value="presencial">Encontrei pessoalmente</option>
            <option value="outro">Outro</option>
          </select>
        </div>

        <div>
          <Label htmlFor="instagram">Instagram</Label>
          <input
            id="instagram"
            name="instagram"
            placeholder="@perfil"
            className={cx(inputClass, "mt-1.5")}
          />
        </div>

        <div>
          <Label htmlFor="site">Site</Label>
          <input
            id="site"
            name="site"
            placeholder="site.com.br"
            className={cx(inputClass, "mt-1.5")}
          />
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="endereco">Endereço</Label>
          <input
            id="endereco"
            name="endereco"
            placeholder="Onde fica, se você souber"
            className={cx(inputClass, "mt-1.5")}
          />
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="observacoes">Observações</Label>
          <textarea
            id="observacoes"
            name="observacoes"
            rows={3}
            placeholder="O que chamou a atenção, quem indicou, o que já se sabe…"
            className={cx(textareaClass, "mt-1.5")}
          />
        </div>
      </div>

      <Submit>Adicionar ao funil</Submit>
    </ActionForm>
  );
}
