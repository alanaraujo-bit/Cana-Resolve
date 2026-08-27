"use client";

import Link from "next/link";
import { useState } from "react";

import { cx } from "@/components/ui";
import type { ServerAction } from "@/lib/action-result";
import { formatBRL, BETA_PRICE_CENTS } from "@/lib/domain/beta";
import { formatPhone, waLinkTo } from "@/lib/domain/phone";
import { ActionForm, Label, Submit, textareaClass } from "./forms";
import { Badge, StatusBadge, formatDateTime } from "./ui";

export type CadastroLinha = {
  id: string;
  name: string;
  company: string;
  whatsapp: string;
  categoryId: string | null;
  categoryName: string | null;
  servesCanaa: boolean;
  howFound: string | null;
  status: string;
  reviewNotes: string | null;
  attribution: Record<string, string>;
  createdAt: Date;
  prospectId: string | null;
  prospectCode: string | null;
};

/**
 * Um cadastro na fila de qualificação.
 *
 * A tela de análise mostra o que a empresa declarou e a lista de conferências
 * que precisam ser feitas fora do sistema — existe mesmo? atende Canaã? a
 * categoria confere? O sistema não tem como responder nada disso sozinho, e
 * fingir que tem seria pior do que perguntar.
 */
export function ApplicationCard({
  cadastro,
  categorias,
  analisar,
  aprovar,
  abertoInicialmente = false,
}: {
  cadastro: CadastroLinha;
  categorias: { id: string; name: string }[];
  analisar: ServerAction;
  aprovar: ServerAction;
  abertoInicialmente?: boolean;
}) {
  const [aberto, setAberto] = useState(abertoInicialmente);
  const [escolhidas, setEscolhidas] = useState<string[]>(
    cadastro.categoryId ? [cadastro.categoryId] : [],
  );

  const pendente = ["recebido", "em_analise"].includes(cadastro.status);

  function alternar(id: string) {
    setEscolhidas((atual) =>
      atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id],
    );
  }

  return (
    <div id={cadastro.id}>
      <div className="flex flex-wrap items-start gap-x-4 gap-y-2 px-4 py-3.5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-ink text-[0.9375rem] font-medium">
              {cadastro.company}
            </span>
            <StatusBadge machine="application" status={cadastro.status} />
            {!cadastro.servesCanaa ? (
              <Badge tone="attention">Diz que ainda não atende Canaã</Badge>
            ) : null}
          </div>
          <p className="text-faint mt-1 text-[0.8125rem]">
            {cadastro.name} ·{" "}
            <a
              href={waLinkTo(cadastro.whatsapp)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-ink hover:text-brand-hover tabular-nums"
            >
              {formatPhone(cadastro.whatsapp)}
            </a>{" "}
            · {cadastro.categoryName ?? "sem categoria"}
          </p>
          <p className="text-faint mt-0.5 text-[0.75rem]">
            {formatDateTime(cadastro.createdAt)}
            {cadastro.howFound ? ` · conheceu por ${cadastro.howFound}` : ""}
            {cadastro.attribution.origem ? ` · veio de ${cadastro.attribution.origem}` : ""}
            {cadastro.prospectCode ? (
              <>
                {" · "}
                <Link
                  href={`/ops/comercial/${cadastro.prospectId}`}
                  className="text-brand-ink hover:text-brand-hover font-mono"
                >
                  {cadastro.prospectCode}
                </Link>
              </>
            ) : null}
          </p>
          {cadastro.reviewNotes ? (
            <p className="text-muted mt-1.5 text-[0.8125rem] leading-snug">
              {cadastro.reviewNotes}
            </p>
          ) : null}
        </div>

        {pendente ? (
          <button
            type="button"
            onClick={() => setAberto((v) => !v)}
            aria-expanded={aberto}
            className={cx(
              "border-line text-muted hover:border-line-strong hover:text-ink",
              "h-9 shrink-0 rounded-lg border px-3 text-[0.8125rem] font-medium transition-colors",
            )}
          >
            {aberto ? "Fechar" : "Analisar"}
          </button>
        ) : null}
      </div>

      {aberto && pendente ? (
        <div className="border-line bg-surface-2/50 border-t px-4 py-4">
          <p className="text-faint text-[0.75rem] font-medium tracking-[0.03em] uppercase">
            Antes de aprovar, confira
          </p>
          <ul className="text-muted mt-2 space-y-1 text-[0.875rem] leading-snug">
            <li>· A empresa existe e o número é mesmo dela.</li>
            <li>· Atende Canaã dos Carajás de verdade.</li>
            <li>· A categoria bate com o que ela faz.</li>
            <li>· Nada evidente na reputação pública desaconselha.</li>
          </ul>

          <div className="mt-4">
            <Label hint="A primeira marcada vira a categoria principal — é a que mais pesa no encaminhamento.">
              Categorias de atuação
            </Label>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {categorias.map((c) => {
                const marcada = escolhidas.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => alternar(c.id)}
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

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {/* aprovar */}
            <ActionForm action={aprovar} className="border-line rounded-lg border p-3">
              <input type="hidden" name="id" value={cadastro.id} />
              {escolhidas.map((id) => (
                <input key={id} type="hidden" name="categoria" value={id} />
              ))}
              <p className="text-ink text-[0.875rem] font-medium">Aprovar</p>
              <p className="text-faint mt-1 text-[0.8125rem] leading-snug">
                A empresa entra na rede como “Aguardando lançamento”. Nada é
                cobrado por aqui — o pagamento é registrado depois, no perfil.
              </p>
              <label className="text-muted mt-3 flex cursor-pointer items-center gap-2 text-[0.875rem]">
                <input
                  type="checkbox"
                  name="fundador"
                  value="sim"
                  defaultChecked
                  className="accent-brand h-4 w-4"
                />
                Entra como Parceiro Fundador ({formatBRL(BETA_PRICE_CENTS)} / 90 dias)
              </label>
              <textarea
                name="observacoes"
                rows={2}
                placeholder="O que você conferiu (opcional)"
                className={cx(textareaClass, "mt-3")}
              />
              <div className="mt-3">
                <Submit disabled={escolhidas.length === 0}>
                  {escolhidas.length === 0 ? "Escolha a categoria" : "Aprovar e criar parceiro"}
                </Submit>
              </div>
            </ActionForm>

            {/* recusar ou deixar em análise */}
            <ActionForm action={analisar} className="border-line rounded-lg border p-3">
              <input type="hidden" name="id" value={cadastro.id} />
              <p className="text-ink text-[0.875rem] font-medium">
                Ainda não, ou não
              </p>
              <p className="text-faint mt-1 text-[0.8125rem] leading-snug">
                “Em análise” marca que você começou a apurar. “Recusado” encerra
                — e pede o motivo.
              </p>
              <textarea
                name="observacoes"
                rows={2}
                placeholder="O que falta apurar, ou por que não entra"
                className={cx(textareaClass, "mt-3")}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="submit"
                  name="destino"
                  value="em_analise"
                  className="border-line-strong text-ink hover:bg-surface-2 h-9 rounded-lg border px-3.5 text-[0.875rem] font-medium transition-colors"
                >
                  Deixar em análise
                </button>
                <button
                  type="submit"
                  name="destino"
                  value="recusado"
                  className="border-danger/30 text-danger hover:bg-danger-soft h-9 rounded-lg border px-3.5 text-[0.875rem] font-medium transition-colors"
                >
                  Recusar
                </button>
              </div>
            </ActionForm>
          </div>
        </div>
      ) : null}
    </div>
  );
}
