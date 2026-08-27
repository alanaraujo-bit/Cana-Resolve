"use client";

import { useState } from "react";

import { cx } from "@/components/ui";
import type { ServerAction } from "@/lib/action-result";
import { urgencias } from "@/lib/categories";
import { ActionForm, inputClass, Label, Submit, textareaClass } from "./forms";

export type CategoriaComServicos = {
  id: string;
  name: string;
  servicos: { id: string; name: string }[];
};

/**
 * A triagem.
 *
 * O morador escreveu com as palavras dele; aqui a operação confirma do que se
 * trata. O serviço só aparece depois da categoria porque escolher "chuveiro"
 * dentro de "Mecânica" não deveria ser possível — e porque a lista inteira de
 * serviços de uma vez seria grande demais para um seletor.
 */
export function TriageForm({
  requestId,
  categorias,
  action,
  inicial,
}: {
  requestId: string;
  categorias: CategoriaComServicos[];
  action: ServerAction;
  inicial: {
    categoria: string | null;
    servico: string | null;
    bairro: string | null;
    urgencia: string | null;
    observacoes: string | null;
  };
}) {
  const [categoria, setCategoria] = useState(inicial.categoria ?? "");
  const [servico, setServico] = useState(inicial.servico ?? "");

  const servicos = categorias.find((c) => c.id === categoria)?.servicos ?? [];

  return (
    <ActionForm action={action} className="space-y-3.5 px-4 py-3">
      <input type="hidden" name="id" value={requestId} />

      <div className="grid gap-3.5 sm:grid-cols-2">
        <div>
          <Label htmlFor="categoria">Categoria</Label>
          <select
            id="categoria"
            name="categoria"
            value={categoria}
            onChange={(e) => {
              setCategoria(e.target.value);
              // Trocar de categoria invalida o serviço escolhido antes.
              setServico("");
            }}
            className={cx(inputClass, "mt-1.5")}
          >
            <option value="">Ainda não classificada</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="servico" hint={categoria ? undefined : "Escolha a categoria primeiro"}>
            Serviço
          </Label>
          <select
            id="servico"
            name="servico"
            value={servico}
            onChange={(e) => setServico(e.target.value)}
            disabled={!categoria}
            className={cx(inputClass, "mt-1.5 disabled:opacity-50")}
          >
            <option value="">Não especificado</option>
            {servicos.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="bairro">Bairro</Label>
          <input
            id="bairro"
            name="bairro"
            defaultValue={inicial.bairro ?? ""}
            placeholder="Onde o serviço é"
            className={cx(inputClass, "mt-1.5")}
          />
        </div>

        <div>
          <Label htmlFor="urgencia">Urgência</Label>
          <select
            id="urgencia"
            name="urgencia"
            defaultValue={inicial.urgencia ?? ""}
            className={cx(inputClass, "mt-1.5")}
          >
            <option value="">Não informada</option>
            {urgencias.map((u) => (
              <option key={u.id} value={u.id}>
                {u.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <Label htmlFor="observacoes" hint="Só a equipe vê. Não vai para o parceiro.">
          Observações internas
        </Label>
        <textarea
          id="observacoes"
          name="observacoes"
          rows={2}
          defaultValue={inicial.observacoes ?? ""}
          placeholder="O que você entendeu conversando, o que confirmar antes de encaminhar…"
          className={cx(textareaClass, "mt-1.5")}
        />
      </div>

      <Submit variant="outline">Salvar triagem</Submit>
    </ActionForm>
  );
}
