"use client";

import { useActionState, useState } from "react";

import { cx } from "@/components/ui";
import type { ActionResult, ServerAction } from "@/lib/action-result";
import type { Candidato } from "@/lib/domain/matching";
import { waLinkTo } from "@/lib/domain/phone";
import { Aviso, Submit } from "./forms";
import { Badge, EmptyState } from "./ui";

/**
 * O encaminhamento assistido.
 *
 * O sistema ordena e explica; quem decide é a pessoa. Cada candidato mostra a
 * razão de estar ali e a ressalva que pesa contra — nada de um número
 * misterioso de "compatibilidade" sem nada por trás.
 *
 * A condição comercial do parceiro não entra na ordenação. Ela aparece como
 * selo, porque é informação útil sobre quem ele é, mas nenhum ponto é somado
 * por ser Fundador.
 */
export function DistributePanel({
  requestId,
  candidatos,
  mensagem,
  action,
  redeVazia,
}: {
  requestId: string;
  candidatos: Candidato[];
  /** Mensagem já escrita para o parceiro, usada nos links do WhatsApp. */
  mensagem: string;
  action: ServerAction;
  redeVazia: boolean;
}) {
  const [estado, run] = useActionState<ActionResult, FormData>(action, {});
  const [escolhidos, setEscolhidos] = useState<string[]>([]);
  const [mostrarTodos, setMostrarTodos] = useState(false);

  const disponiveis = candidatos.filter((c) => !c.jaEncaminhado);
  const compativeis = disponiveis.filter((c) => c.score >= 40);
  const lista = mostrarTodos ? disponiveis : compativeis.length > 0 ? compativeis : disponiveis;

  function alternar(id: string) {
    setEscolhidos((atual) =>
      atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id],
    );
  }

  if (candidatos.length === 0) {
    return (
      <EmptyState
        title={redeVazia ? "A rede ainda está vazia" : "Nenhum parceiro para mostrar"}
        hint={
          redeVazia
            ? "Nenhum parceiro foi aprovado ainda. Assim que o primeiro entrar na rede, ele aparece aqui automaticamente para receber pedidos compatíveis."
            : "Todos os parceiros da rede já receberam este pedido."
        }
      />
    );
  }

  if (disponiveis.length === 0) {
    return (
      <EmptyState
        title="Todo mundo já recebeu"
        hint="Cada parceiro da rede já recebeu este pedido. O que falta agora é acompanhar os desfechos abaixo."
      />
    );
  }

  return (
    <form action={run} className="px-4 py-3">
      <input type="hidden" name="id" value={requestId} />
      {escolhidos.map((id) => (
        <input key={id} type="hidden" name="parceiro" value={id} />
      ))}

      <ul className="space-y-1.5">
        {lista.map((c) => {
          const marcado = escolhidos.includes(c.id);
          return (
            <li key={c.id}>
              <div
                className={cx(
                  "rounded-lg border transition-colors",
                  marcado
                    ? "border-brand-line bg-brand-soft/50"
                    : "border-line hover:border-line-strong",
                )}
              >
                <label className="flex cursor-pointer items-start gap-3 p-3">
                  <input
                    type="checkbox"
                    checked={marcado}
                    onChange={() => alternar(c.id)}
                    className="accent-brand mt-[3px] h-4 w-4 shrink-0"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-ink text-[0.9375rem] font-medium">
                        {c.name}
                      </span>
                      {c.founder ? (
                        <Badge tone="neutral" dot={false}>
                          Fundador
                        </Badge>
                      ) : null}
                      <span className="text-faint font-mono text-[0.75rem]">{c.code}</span>
                    </span>

                    {c.motivos.length > 0 ? (
                      <span className="text-muted mt-1 block text-[0.8125rem] leading-snug">
                        {c.motivos.join(" · ")}
                      </span>
                    ) : null}

                    {c.ressalvas.length > 0 ? (
                      <span className="text-accent-ink mt-0.5 block text-[0.8125rem] leading-snug">
                        {c.ressalvas.join(" · ")}
                      </span>
                    ) : null}
                  </span>

                  {/* A barra é a leitura rápida; os motivos ao lado são a explicação. */}
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-faint text-[0.75rem] tabular-nums">
                      {c.score}
                    </span>
                    <span
                      aria-hidden="true"
                      className="bg-surface-3 block h-1 w-12 overflow-hidden rounded-full"
                    >
                      <span
                        className={cx(
                          "block h-full rounded-full",
                          c.score >= 60 ? "bg-brand" : c.score >= 40 ? "bg-accent" : "bg-line-strong",
                        )}
                        style={{ width: `${c.score}%` }}
                      />
                    </span>
                  </span>
                </label>

                {marcado ? (
                  <p className="border-line border-t px-3 py-2">
                    <a
                      href={waLinkTo(c.whatsapp, mensagem)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-ink hover:text-brand-hover text-[0.8125rem] font-medium"
                    >
                      Abrir a conversa com {c.name.split(/\s+/)[0]} no WhatsApp →
                    </a>
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      {!mostrarTodos && disponiveis.length > lista.length ? (
        <button
          type="button"
          onClick={() => setMostrarTodos(true)}
          className="text-faint hover:text-ink mt-2 text-[0.8125rem] transition-colors"
        >
          Mostrar os outros {disponiveis.length - lista.length} parceiros da rede
        </button>
      ) : null}

      <div className="border-line mt-3 flex flex-wrap items-center gap-3 border-t pt-3">
        <Submit disabled={escolhidos.length === 0}>
          {escolhidos.length === 0
            ? "Escolha os parceiros"
            : escolhidos.length === 1
              ? "Encaminhar para 1 parceiro"
              : `Encaminhar para ${escolhidos.length} parceiros`}
        </Submit>

        <label className="text-muted flex cursor-pointer items-center gap-2 text-[0.8125rem]">
          <input
            type="checkbox"
            name="jaEnviado"
            value="sim"
            defaultChecked
            className="accent-brand h-4 w-4"
          />
          Já mandei a mensagem no WhatsApp
        </label>
      </div>

      <p className="text-faint mt-2 text-[0.75rem] leading-snug">
        Desmarque acima se quiser apenas separar os parceiros agora e enviar
        depois — eles ficam como “Selecionado” até a mensagem sair.
      </p>

      <div className="mt-3">
        <Aviso estado={estado} />
      </div>
    </form>
  );
}
