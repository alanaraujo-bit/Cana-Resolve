"use client";

import Link from "next/link";
import { useState } from "react";

import { cx } from "@/components/ui";
import type { ServerAction } from "@/lib/action-result";
import { BETA_DAYS } from "@/lib/domain/beta";
import { ActionForm, inputClass, Label, Submit } from "./forms";
import { Badge, formatDate } from "./ui";

export type FundadorPendente = {
  id: string;
  code: string;
  name: string;
  pago: boolean;
  onboarding: boolean;
};

/**
 * Abrir a operação.
 *
 * Esta é a ação com mais consequência do sistema inteiro: ela inicia, de uma
 * vez, o prazo de {BETA_DAYS} dias de todos os Fundadores prontos. A tela
 * mostra exatamente quem vai ser afetado **antes** de qualquer clique, e quem
 * vai ficar de fora e por quê — porque a surpresa aqui custaria a confiança de
 * quem pagou.
 */
export function LaunchPanel({
  lancadaEm,
  pendentes,
  podeExecutar,
  action,
}: {
  lancadaEm: Date | null;
  pendentes: FundadorPendente[];
  podeExecutar: boolean;
  action: ServerAction;
}) {
  const [aberto, setAberto] = useState(false);

  if (lancadaEm) {
    return (
      <div className="px-4 py-4">
        <p className="text-ink text-[0.9375rem] leading-relaxed">
          A operação foi aberta em{" "}
          <strong className="font-semibold">{formatDate(lancadaEm)}</strong>. A
          partir dessa data os {BETA_DAYS} dias de cada Fundador pronto passaram
          a correr.
        </p>
        {pendentes.length > 0 ? (
          <p className="text-muted mt-3 text-[0.875rem] leading-relaxed">
            {pendentes.length}{" "}
            {pendentes.length === 1 ? "fundador ainda não teve" : "fundadores ainda não tiveram"}{" "}
            o prazo iniciado — falta pagamento ou onboarding. Quando ficarem
            prontos, o período começa para eles com a própria data, e não
            retroativamente.
          </p>
        ) : null}
      </div>
    );
  }

  const prontos = pendentes.filter((p) => p.pago && p.onboarding);
  const incompletos = pendentes.filter((p) => !p.pago || !p.onboarding);

  return (
    <div className="px-4 py-4">
      <p className="text-muted text-[0.9375rem] leading-relaxed">
        Enquanto a operação não abre, nenhum Fundador tem o relógio correndo.
        Foi assim que a condição foi vendida: os {BETA_DAYS} dias valem a partir
        do momento em que existem pedidos chegando, não do pagamento.
      </p>

      <div className="border-line mt-4 rounded-lg border">
        <p className="border-line text-faint border-b px-3 py-2 text-[0.75rem] font-medium tracking-[0.03em] uppercase">
          O que acontece ao registrar
        </p>
        <div className="px-3 py-3">
          {prontos.length === 0 ? (
            <p className="text-muted text-[0.875rem] leading-snug">
              Nenhum Fundador está pronto ainda. Você pode abrir a operação assim
              mesmo — os parceiros que estiverem aguardando lançamento entram na
              distribuição — mas nenhum prazo de 90 dias começa hoje.
            </p>
          ) : (
            <>
              <p className="text-ink text-[0.875rem] font-medium">
                {prontos.length}{" "}
                {prontos.length === 1
                  ? "fundador tem os 90 dias iniciados agora:"
                  : "fundadores têm os 90 dias iniciados agora:"}
              </p>
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {prontos.map((p) => (
                  <li key={p.id}>
                    <Link href={`/ops/parceiros/${p.id}`}>
                      <Badge tone="positive">{p.name}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}

          {incompletos.length > 0 ? (
            <div className="border-line mt-3 border-t pt-3">
              <p className="text-muted text-[0.875rem]">
                Ficam de fora por enquanto:
              </p>
              <ul className="mt-1.5 space-y-1">
                {incompletos.map((p) => (
                  <li key={p.id} className="text-faint text-[0.8125rem]">
                    <Link
                      href={`/ops/parceiros/${p.id}`}
                      className="text-muted hover:text-brand-ink"
                    >
                      {p.name}
                    </Link>{" "}
                    — {!p.pago ? "sem pagamento" : "onboarding pendente"}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>

      {!podeExecutar ? (
        <p className="text-faint mt-4 text-[0.8125rem]">
          Só o responsável pela operação pode registrar o lançamento.
        </p>
      ) : !aberto ? (
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="bg-brand text-on-brand hover:bg-brand-hover mt-4 inline-flex h-9 items-center rounded-lg px-3.5 text-[0.875rem] font-medium transition-colors"
        >
          Registrar o lançamento
        </button>
      ) : (
        <ActionForm action={action} className="border-line mt-4 space-y-3 border-t pt-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="data" hint="Normalmente hoje.">
                Data de abertura
              </Label>
              <input
                id="data"
                name="data"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
                className={cx(inputClass, "mt-1.5")}
              />
            </div>
            <div>
              <Label htmlFor="confirmacao" hint="Escreva LANCAR para confirmar.">
                Confirmação
              </Label>
              <input
                id="confirmacao"
                name="confirmacao"
                autoComplete="off"
                placeholder="LANCAR"
                className={cx(inputClass, "mt-1.5")}
              />
            </div>
          </div>
          <p className="text-faint text-[0.8125rem] leading-snug">
            Isto acontece uma vez só e não tem desfazer.
          </p>
          <div className="flex items-center gap-2">
            <Submit>Abrir a operação</Submit>
            <button
              type="button"
              onClick={() => setAberto(false)}
              className="text-faint hover:text-ink text-[0.8125rem] transition-colors"
            >
              Cancelar
            </button>
          </div>
        </ActionForm>
      )}
    </div>
  );
}
