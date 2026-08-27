"use client";

import Link from "next/link";
import { useState } from "react";

import { cx } from "@/components/ui";
import type { ServerAction } from "@/lib/action-result";
import { formatBRL } from "@/lib/domain/beta";
import { waLinkTo } from "@/lib/domain/phone";
import { StatusChanger } from "./forms";
import { Badge, StatusBadge, When } from "./ui";

export type OportunidadeLinha = {
  id: string;
  status: string;
  createdAt: Date;
  sentAt: Date | null;
  respondedAt: Date | null;
  quoteAmountCents: number | null;
  outcomeReason: string | null;
  partnerId: string;
  partnerName: string;
  /** Só existe onde a tela tem o parceiro carregado por inteiro. */
  partnerWhatsapp?: string;
  partnerFounder: boolean;
};

/**
 * Uma linha de encaminhamento, com o desfecho editável ali mesmo.
 *
 * Fica fechada por padrão: o normal é olhar a lista e entender a situação de
 * relance. Só quem vai mexer abre — e aí aparecem apenas os desfechos que o
 * estado atual permite.
 */
export function OpportunityRow({
  oportunidade: o,
  action,
  mensagem,
}: {
  oportunidade: OportunidadeLinha;
  action: ServerAction;
  /** Mensagem pronta para reenviar ao parceiro pelo WhatsApp. */
  mensagem?: string;
}) {
  const [aberto, setAberto] = useState(false);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link
              href={`/ops/parceiros/${o.partnerId}`}
              className="text-ink hover:text-brand-ink text-[0.9375rem] font-medium transition-colors"
            >
              {o.partnerName}
            </Link>
            {o.partnerFounder ? (
              <Badge tone="neutral" dot={false}>
                Fundador
              </Badge>
            ) : null}
          </div>
          <p className="text-faint mt-0.5 text-[0.8125rem]">
            {o.sentAt ? (
              <>
                enviado <When value={o.sentAt} />
              </>
            ) : (
              "ainda não enviado"
            )}
            {o.quoteAmountCents ? ` · orçou ${formatBRL(o.quoteAmountCents)}` : ""}
            {o.outcomeReason ? ` · ${o.outcomeReason}` : ""}
          </p>
        </div>

        <StatusBadge machine="opportunity" status={o.status} />

        <div className="flex items-center gap-2">
          {mensagem && o.partnerWhatsapp ? (
            <a
              href={waLinkTo(o.partnerWhatsapp, mensagem)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-ink hover:text-brand-hover text-[0.8125rem] font-medium"
            >
              WhatsApp
            </a>
          ) : null}
          <button
            type="button"
            onClick={() => setAberto((v) => !v)}
            aria-expanded={aberto}
            className={cx(
              "border-line text-muted hover:border-line-strong hover:text-ink",
              "h-8 rounded-lg border px-2.5 text-[0.8125rem] transition-colors",
            )}
          >
            {aberto ? "Fechar" : "Desfecho"}
          </button>
        </div>
      </div>

      {aberto ? (
        <div className="border-line bg-surface-2/50 border-t">
          <StatusChanger
            machine="opportunity"
            current={o.status}
            action={action}
            id={o.id}
            label="O que aconteceu"
          />
        </div>
      ) : null}
    </div>
  );
}
