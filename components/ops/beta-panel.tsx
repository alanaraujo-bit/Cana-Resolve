"use client";

import { useState } from "react";

import { cx } from "@/components/ui";
import type { ServerAction } from "@/lib/action-result";
import { BETA_PRICE_CENTS, formatBRL, type BetaStatus } from "@/lib/domain/beta";
import { ActionForm, inputClass, Label, Submit } from "./forms";
import { Badge, formatDate } from "./ui";

/**
 * A condição de Parceiro Fundador.
 *
 * A tela existe, sobretudo, para dizer uma coisa em voz alta: **o pagamento
 * não inicia os 90 dias**. Registrar o pagamento reserva a participação; o
 * relógio só começa quando a operação abrir para os moradores. Uma interface
 * que sugerisse o contrário criaria uma expectativa que o produto não cumpre.
 */
export function BetaPanel({
  partnerId,
  founder,
  beta,
  pagamentos,
  registrarPagamento,
  concluirOnboarding,
}: {
  partnerId: string;
  founder: boolean;
  beta: BetaStatus;
  pagamentos: {
    id: string;
    amountCents: number;
    method: string | null;
    reference: string | null;
    paidAt: Date;
  }[];
  registrarPagamento: ServerAction;
  concluirOnboarding: ServerAction;
}) {
  const [abrirPagamento, setAbrirPagamento] = useState(false);

  const tom =
    beta.phase === "em_andamento"
      ? "positive"
      : beta.phase === "aguardando_pagamento"
        ? "attention"
        : beta.phase === "encerrado"
          ? "negative"
          : "neutral";

  return (
    <div className="px-4 py-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={tom}>{beta.label}</Badge>
        {founder ? (
          <span className="text-faint text-[0.75rem]">
            {formatBRL(BETA_PRICE_CENTS)} pelos primeiros 90 dias
          </span>
        ) : null}
      </div>

      <p className="text-muted mt-2 text-[0.875rem] leading-snug">{beta.hint}</p>

      {beta.startsAt && beta.endsAt ? (
        <div className="mt-3">
          <div
            aria-hidden="true"
            className="bg-surface-3 h-1.5 w-full overflow-hidden rounded-full"
          >
            <div
              className="bg-brand h-full rounded-full"
              style={{ width: `${Math.round((beta.progress ?? 0) * 100)}%` }}
            />
          </div>
          <p className="text-faint mt-1.5 flex justify-between text-[0.75rem] tabular-nums">
            <span>começou {formatDate(beta.startsAt)}</span>
            <span>termina {formatDate(beta.endsAt)}</span>
          </p>
        </div>
      ) : null}

      {/* ---------- pagamentos ---------- */}
      <div className="border-line mt-4 border-t pt-3">
        <p className="text-faint text-[0.75rem] font-medium tracking-[0.03em] uppercase">
          Pagamentos
        </p>
        {pagamentos.length === 0 ? (
          <p className="text-faint mt-1.5 text-[0.8125rem]">Nenhum registrado.</p>
        ) : (
          <ul className="mt-1.5 space-y-1">
            {pagamentos.map((p) => (
              <li key={p.id} className="text-muted text-[0.8125rem]">
                <span className="text-ink font-medium tabular-nums">
                  {formatBRL(p.amountCents)}
                </span>{" "}
                · {formatDate(p.paidAt)}
                {p.method ? ` · ${p.method}` : ""}
                {p.reference ? ` · ${p.reference}` : ""}
              </li>
            ))}
          </ul>
        )}

        {!abrirPagamento ? (
          <button
            type="button"
            onClick={() => setAbrirPagamento(true)}
            className="text-brand-ink hover:text-brand-hover mt-2 text-[0.8125rem] font-medium"
          >
            Registrar pagamento
          </button>
        ) : (
          <ActionForm action={registrarPagamento} className="mt-3 space-y-3">
            <input type="hidden" name="id" value={partnerId} />
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="valor">Valor</Label>
                <input
                  id="valor"
                  name="valor"
                  inputMode="decimal"
                  placeholder={`${(BETA_PRICE_CENTS / 100).toFixed(2).replace(".", ",")}`}
                  className={cx(inputClass, "mt-1.5")}
                />
              </div>
              <div>
                <Label htmlFor="data">Data</Label>
                <input
                  id="data"
                  name="data"
                  type="date"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  className={cx(inputClass, "mt-1.5")}
                />
              </div>
              <div>
                <Label htmlFor="forma">Forma</Label>
                <select id="forma" name="forma" className={cx(inputClass, "mt-1.5")}>
                  <option value="Pix">Pix</option>
                  <option value="Dinheiro">Dinheiro</option>
                  <option value="Cartão">Cartão</option>
                  <option value="Transferência">Transferência</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>
              <div>
                <Label htmlFor="referencia" hint="Comprovante, id da transação">
                  Referência
                </Label>
                <input
                  id="referencia"
                  name="referencia"
                  className={cx(inputClass, "mt-1.5")}
                />
              </div>
            </div>
            <p className="text-faint text-[0.75rem] leading-snug">
              Registrar o pagamento reserva a participação. Os 90 dias começam
              no lançamento da operação, não agora.
            </p>
            <div className="flex items-center gap-2">
              <Submit>Registrar</Submit>
              <button
                type="button"
                onClick={() => setAbrirPagamento(false)}
                className="text-faint hover:text-ink text-[0.8125rem] transition-colors"
              >
                Cancelar
              </button>
            </div>
          </ActionForm>
        )}
      </div>

      {/* ---------- onboarding ---------- */}
      {beta.phase === "aguardando_onboarding" ? (
        <div className="border-line mt-4 border-t pt-3">
          <ActionForm action={concluirOnboarding}>
            <input type="hidden" name="id" value={partnerId} />
            <p className="text-muted text-[0.8125rem] leading-snug">
              Quando o perfil estiver completo — categorias, serviços e região —
              marque o onboarding como concluído.
            </p>
            <div className="mt-2">
              <Submit variant="outline">Concluir onboarding</Submit>
            </div>
          </ActionForm>
        </div>
      ) : null}
    </div>
  );
}
