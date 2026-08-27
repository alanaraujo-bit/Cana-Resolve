"use client";

import { useState } from "react";

import { cx } from "@/components/ui";
import type { ServerAction } from "@/lib/action-result";
import { ActionForm, inputClass, Label, Submit, textareaClass } from "./forms";

export type CategoriaComServicos = {
  id: string;
  name: string;
  servicos: { id: string; name: string }[];
};

export type PartnerProfileValues = {
  id: string;
  name: string;
  ownerName: string | null;
  whatsapp: string;
  email: string | null;
  document: string | null;
  description: string | null;
  availability: string | null;
  servesWholeCity: boolean;
  neighborhoods: string[];
  categoryIds: string[];
  serviceIds: string[];
  notes: string | null;
};

/**
 * O perfil do parceiro.
 *
 * Categorias e serviços não são decoração de cadastro: é literalmente isso que
 * o matching lê. Um parceiro com a categoria certa e nenhum serviço marcado
 * recebe pedidos genéricos daquela categoria; com os serviços marcados, ele
 * passa a aparecer primeiro exatamente no problema que sabe resolver. Por isso
 * os serviços ficam visíveis, e não escondidos atrás de outra tela.
 */
export function PartnerProfileForm({
  action,
  valores,
  categorias,
}: {
  action: ServerAction;
  valores: PartnerProfileValues;
  categorias: CategoriaComServicos[];
}) {
  const [escolhidas, setEscolhidas] = useState<string[]>(valores.categoryIds);
  const [servicos, setServicos] = useState<string[]>(valores.serviceIds);
  const [atendeTudo, setAtendeTudo] = useState(valores.servesWholeCity);

  function alternarCategoria(id: string) {
    setEscolhidas((atual) => {
      if (atual.includes(id)) {
        // Some a categoria, somem os serviços dela: um serviço órfão nunca
        // seria visto pelo matching e só confundiria quem lesse o perfil.
        const daCategoria = new Set(
          categorias.find((c) => c.id === id)?.servicos.map((s) => s.id) ?? [],
        );
        setServicos((s) => s.filter((x) => !daCategoria.has(x)));
        return atual.filter((x) => x !== id);
      }
      return [...atual, id];
    });
  }

  function alternarServico(id: string) {
    setServicos((atual) =>
      atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id],
    );
  }

  const abertas = categorias.filter((c) => escolhidas.includes(c.id));

  return (
    <ActionForm action={action} className="space-y-5 px-4 py-4">
      <input type="hidden" name="id" value={valores.id} />
      {escolhidas.map((id) => (
        <input key={id} type="hidden" name="categoria" value={id} />
      ))}
      {servicos.map((id) => (
        <input key={id} type="hidden" name="servico" value={id} />
      ))}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="nome">Nome comercial</Label>
          <input
            id="nome"
            name="nome"
            required
            defaultValue={valores.name}
            className={cx(inputClass, "mt-1.5")}
          />
        </div>
        <div>
          <Label htmlFor="responsavel">Responsável</Label>
          <input
            id="responsavel"
            name="responsavel"
            defaultValue={valores.ownerName ?? ""}
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
          <Label htmlFor="documento" hint="CNPJ ou CPF, se já tiver">
            Documento
          </Label>
          <input
            id="documento"
            name="documento"
            defaultValue={valores.document ?? ""}
            className={cx(inputClass, "mt-1.5")}
          />
        </div>
        <div>
          <Label htmlFor="disponibilidade" hint="Ex.: seg a sáb, 7h às 18h">
            Disponibilidade
          </Label>
          <input
            id="disponibilidade"
            name="disponibilidade"
            defaultValue={valores.availability ?? ""}
            className={cx(inputClass, "mt-1.5")}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="descricao" hint="Como ele se apresenta, em uma ou duas frases.">
          Descrição
        </Label>
        <textarea
          id="descricao"
          name="descricao"
          rows={2}
          defaultValue={valores.description ?? ""}
          className={cx(textareaClass, "mt-1.5")}
        />
      </div>

      {/* ---------- atuação ---------- */}
      <div className="border-line border-t pt-4">
        <Label hint="A primeira marcada é a principal — é a que mais pesa no encaminhamento.">
          Categorias
        </Label>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {categorias.map((c) => {
            const marcada = escolhidas.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => alternarCategoria(c.id)}
                aria-pressed={marcada}
                className={cx(
                  "rounded-lg border px-2.5 py-1.5 text-[0.8125rem] font-medium transition-colors",
                  marcada
                    ? "border-brand bg-brand text-on-brand"
                    : "border-line text-muted hover:border-line-strong hover:text-ink",
                )}
              >
                {c.name}
              </button>
            );
          })}
        </div>
      </div>

      {abertas.length > 0 ? (
        <div>
          <Label hint="Marcar os serviços faz ele aparecer primeiro no problema exato. Deixar em branco não o exclui — só o torna menos preciso.">
            Serviços
          </Label>
          <div className="mt-2 space-y-3">
            {abertas.map((c) => (
              <div key={c.id}>
                <p className="text-faint text-[0.75rem] font-medium tracking-[0.03em] uppercase">
                  {c.name}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {c.servicos.map((s) => {
                    const marcado = servicos.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => alternarServico(s.id)}
                        aria-pressed={marcado}
                        className={cx(
                          "rounded-md border px-2 py-1 text-[0.8125rem] transition-colors",
                          marcado
                            ? "border-brand-line bg-brand-soft text-brand-ink"
                            : "border-line text-muted hover:border-line-strong hover:text-ink",
                        )}
                      >
                        {s.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* ---------- região ---------- */}
      <div className="border-line border-t pt-4">
        <Label>Região de atendimento</Label>
        <label className="text-muted mt-2 flex cursor-pointer items-center gap-2 text-[0.875rem]">
          <input
            type="checkbox"
            name="atendeTudo"
            value="sim"
            checked={atendeTudo}
            onChange={(e) => setAtendeTudo(e.target.checked)}
            className="accent-brand h-4 w-4"
          />
          Atende Canaã dos Carajás inteira
        </label>
        {!atendeTudo ? (
          <div className="mt-3">
            <Label htmlFor="bairros" hint="Separe por vírgula.">
              Bairros atendidos
            </Label>
            <textarea
              id="bairros"
              name="bairros"
              rows={2}
              defaultValue={valores.neighborhoods.join(", ")}
              placeholder="Centro, Novo Horizonte, Vila Bom Jesus…"
              className={cx(textareaClass, "mt-1.5")}
            />
          </div>
        ) : null}
      </div>

      <div className="border-line border-t pt-4">
        <Label htmlFor="observacoes" hint="Só a equipe vê.">
          Observações internas
        </Label>
        <textarea
          id="observacoes"
          name="observacoes"
          rows={2}
          defaultValue={valores.notes ?? ""}
          className={cx(textareaClass, "mt-1.5")}
        />
      </div>

      <Submit variant="outline">Salvar perfil</Submit>
    </ActionForm>
  );
}
