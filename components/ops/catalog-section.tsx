"use client";

import { useActionState } from "react";
import { useState } from "react";

import { cx } from "@/components/ui";
import type { ActionResult, ServerAction } from "@/lib/action-result";
import type { CategoriaComServicos } from "@/lib/domain/catalog";
import { ActionForm, inputClass, Submit } from "./forms";
import { Badge, PanelHeader } from "./ui";

/**
 * Uma categoria e os serviços dela.
 *
 * Nada aqui apaga: o botão desativa. Um serviço desativado some dos seletores
 * e continua explicando os pedidos antigos que apontam para ele — o histórico
 * é o ativo, não a lista.
 */
export function CatalogSection({
  categoria,
  criarServico,
  alternarAtivo,
}: {
  categoria: CategoriaComServicos;
  criarServico: ServerAction;
  alternarAtivo: ServerAction;
}) {
  const [adicionando, setAdicionando] = useState(false);
  const ativos = categoria.servicos.filter((s) => s.active).length;

  return (
    <>
      <PanelHeader
        title={categoria.name}
        hint={`${ativos} de ${categoria.servicos.length} serviços ativos · ${categoria.parceiros} ${
          categoria.parceiros === 1 ? "parceiro" : "parceiros"
        }`}
        actions={
          <ToggleForm
            action={alternarAtivo}
            tipo="categoria"
            id={categoria.id}
            ativo={categoria.active}
            rotuloAtivo="Ativa"
            rotuloInativo="Desativada"
          />
        }
      />

      <div className="px-4 py-3">
        {categoria.servicos.length === 0 ? (
          <p className="text-faint text-[0.8125rem]">Nenhum serviço ainda.</p>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {categoria.servicos.map((servico) => (
              <li key={servico.id}>
                <ToggleForm
                  action={alternarAtivo}
                  tipo="servico"
                  id={servico.id}
                  ativo={servico.active}
                  rotuloAtivo={servico.name}
                  rotuloInativo={servico.name}
                  comoChip
                />
              </li>
            ))}
          </ul>
        )}

        {adicionando ? (
          <ActionForm action={criarServico} className="mt-3">
            <input type="hidden" name="categoria" value={categoria.id} />
            <div className="flex flex-wrap items-center gap-2">
              <input
                name="nome"
                required
                autoFocus
                placeholder="Nome do serviço"
                className={cx(inputClass, "w-auto min-w-[12rem] flex-1")}
              />
              <Submit variant="outline">Adicionar</Submit>
              <button
                type="button"
                onClick={() => setAdicionando(false)}
                className="text-faint hover:text-ink text-[0.8125rem] transition-colors"
              >
                Cancelar
              </button>
            </div>
          </ActionForm>
        ) : (
          <button
            type="button"
            onClick={() => setAdicionando(true)}
            className="text-brand-ink hover:text-brand-hover mt-3 text-[0.8125rem] font-medium"
          >
            + Novo serviço
          </button>
        )}
      </div>
    </>
  );
}

function ToggleForm({
  action,
  tipo,
  id,
  ativo,
  rotuloAtivo,
  rotuloInativo,
  comoChip = false,
}: {
  action: ServerAction;
  tipo: "categoria" | "servico";
  id: string;
  ativo: boolean;
  rotuloAtivo: string;
  rotuloInativo: string;
  comoChip?: boolean;
}) {
  // O resultado da ação não vira aviso aqui: a resposta visível é o próprio
  // chip mudando de estado quando a página revalida.
  const [, alternar] = useActionState<ActionResult, FormData>(action, {});

  return (
    <form action={alternar}>
      <input type="hidden" name="tipo" value={tipo} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="ativar" value={ativo ? "nao" : "sim"} />
      {comoChip ? (
        <button
          type="submit"
          title={ativo ? "Clique para desativar" : "Clique para reativar"}
          className={cx(
            "rounded-md border px-2 py-1 text-[0.8125rem] transition-colors",
            ativo
              ? "border-line text-muted hover:border-line-strong hover:text-ink"
              : "border-line text-faint line-through hover:text-muted",
          )}
        >
          {ativo ? rotuloAtivo : rotuloInativo}
        </button>
      ) : (
        <button type="submit" title={ativo ? "Desativar" : "Reativar"}>
          <Badge tone={ativo ? "positive" : "neutral"}>
            {ativo ? rotuloAtivo : rotuloInativo}
          </Badge>
        </button>
      )}
    </form>
  );
}
