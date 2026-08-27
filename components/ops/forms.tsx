"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { cx } from "@/components/ui";
import type { ActionResult, ServerAction } from "@/lib/action-result";
import { interactionKinds } from "@/lib/domain/interaction-kinds";
import {
  nextStates,
  stateLabel,
  stateMeta,
  type CampoExtra,
  type MachineName,
} from "@/lib/domain/states";
import { Badge } from "./ui";

export const fieldBase =
  "w-full rounded-lg border border-line-strong bg-field px-3 text-[0.875rem] text-ink outline-none " +
  "transition-[border-color,box-shadow] duration-200 placeholder:text-faint " +
  "focus:border-brand focus:shadow-[0_0_0_3px_var(--cr-brand-soft)]";

export const inputClass = cx(fieldBase, "h-9");
export const textareaClass = cx(fieldBase, "py-2 leading-relaxed resize-y min-h-[5rem]");

export function Label({
  children,
  htmlFor,
  hint,
}: {
  children: React.ReactNode;
  htmlFor?: string;
  hint?: string;
}) {
  return (
    <label htmlFor={htmlFor} className="block">
      <span className="text-ink text-[0.8125rem] font-medium">{children}</span>
      {hint ? <span className="text-faint mt-0.5 block text-[0.75rem]">{hint}</span> : null}
    </label>
  );
}

export function Submit({
  children,
  variant = "brand",
  className = "",
  disabled,
}: {
  children: React.ReactNode;
  variant?: "brand" | "outline";
  className?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={cx(
        "inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3.5 text-[0.875rem] font-medium",
        "transition-[background-color,border-color,color] duration-150",
        "disabled:pointer-events-none disabled:opacity-50",
        variant === "brand"
          ? "bg-brand text-on-brand hover:bg-brand-hover"
          : "border-line-strong text-ink hover:bg-surface-2 border",
        className,
      )}
    >
      {pending ? "Salvando…" : children}
    </button>
  );
}

export function Aviso({ estado }: { estado: ActionResult }) {
  if (!estado.erro && !estado.mensagem) return null;
  return (
    <p
      role="status"
      className={cx(
        "rounded-lg border px-3 py-2 text-[0.8125rem] leading-snug",
        estado.erro
          ? "border-danger/25 bg-danger-soft text-danger"
          : "border-brand-line bg-brand-soft text-brand-ink",
      )}
    >
      {estado.erro ?? estado.mensagem}
    </p>
  );
}

/* ---------------------------------------------------------------
   Mudança de estado
   --------------------------------------------------------------- */

/** O campo que a máquina de estados pede para chegar a um destino. */
function Campo({ campo }: { campo: CampoExtra }) {
  if (campo.tipo === "escolha") {
    return (
      <select name={campo.nome} defaultValue="" className={inputClass} required>
        <option value="">{campo.rotulo}</option>
        {(campo.opcoes ?? []).map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      name={campo.nome}
      inputMode={campo.tipo === "valor" ? "decimal" : undefined}
      placeholder={campo.rotulo}
      className={inputClass}
    />
  );
}

/**
 * Só aparecem os destinos que a máquina de estados permite a partir de onde o
 * registro está. Não é enfeite: é o que impede um pedido de saltar de "Nova"
 * para "Resolvida" e transformar o analytics em ficção.
 *
 * Os campos que cada destino exige também vêm da máquina, e não de quem
 * desenhou a tela: "encerrar um parceiro pede um motivo" vale igual em
 * qualquer lugar de onde a transição seja disparada.
 */
export function StatusChanger({
  machine,
  current,
  action,
  label = "Mover para",
  id,
}: {
  machine: MachineName;
  current: string;
  action: ServerAction;
  label?: string;
  /** Identificador do registro; vai junto em todo envio. */
  id: string;
}) {
  const [estado, run] = useActionState<ActionResult, FormData>(action, {});
  const [destino, setDestino] = useState<string | null>(null);
  const opcoes = nextStates(machine, current);

  if (opcoes.length === 0) {
    return (
      <p className="text-faint px-4 py-3 text-[0.8125rem]">
        {stateLabel(machine, current)} é um estado final. Não há próximo passo
        automático a partir daqui.
      </p>
    );
  }

  const pede = destino ? (stateMeta(machine, destino)?.pede ?? []) : [];

  return (
    <form action={run} className="space-y-3 px-4 py-3">
      <input type="hidden" name="id" value={id} />
      <p className="text-faint text-[0.75rem] font-medium tracking-[0.03em] uppercase">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {opcoes.map((opcao) => {
          const meta = stateMeta(machine, opcao);
          const ativo = destino === opcao;
          return (
            <button
              key={opcao}
              type="button"
              onClick={() => setDestino(ativo ? null : opcao)}
              title={meta?.hint}
              aria-pressed={ativo}
              className={cx(
                "rounded-lg border px-2.5 py-1.5 text-[0.8125rem] font-medium transition-colors",
                ativo
                  ? "border-brand bg-brand text-on-brand"
                  : "border-line text-muted hover:border-line-strong hover:text-ink",
              )}
            >
              {meta?.label ?? opcao}
            </button>
          );
        })}
      </div>

      {destino ? (
        <>
          <input type="hidden" name="destino" value={destino} />
          <p className="text-muted text-[0.8125rem] leading-snug">
            {stateMeta(machine, destino)?.hint}
          </p>
          {pede.length > 0 ? (
            <div className="space-y-2">
              {pede.map((campo) => (
                <Campo key={campo.nome} campo={campo} />
              ))}
            </div>
          ) : null}
          <div className="flex items-center gap-2">
            <Submit>Confirmar</Submit>
            <button
              type="button"
              onClick={() => setDestino(null)}
              className="text-faint hover:text-ink text-[0.8125rem] transition-colors"
            >
              Cancelar
            </button>
          </div>
        </>
      ) : null}

      <Aviso estado={estado} />
    </form>
  );
}

/* ---------------------------------------------------------------
   Registro de interação
   --------------------------------------------------------------- */

/**
 * O que o sistema não tem como saber sozinho: "liguei, pediu para retornar
 * segunda". Fica ao lado da linha do tempo, e não numa tela separada, porque
 * escrever isso é parte de ler o histórico.
 */
export function NoteForm({ action, id }: { action: ServerAction; id: string }) {
  const [estado, run] = useActionState<ActionResult, FormData>(action, {});
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado.ok) ref.current?.reset();
  }, [estado]);

  return (
    <form ref={ref} action={run} className="border-line space-y-2.5 border-t px-4 py-3">
      <input type="hidden" name="id" value={id} />
      <textarea
        name="corpo"
        required
        rows={2}
        placeholder="O que aconteceu? (uma conversa, uma decisão, um combinado)"
        className={textareaClass}
      />
      <div className="flex flex-wrap items-center gap-2">
        <select name="tipo" defaultValue="nota" className={cx(inputClass, "w-auto")}>
          {interactionKinds.map((k) => (
            <option key={k.id} value={k.id}>
              {k.label}
            </option>
          ))}
        </select>
        <Submit variant="outline">Registrar</Submit>
      </div>
      <Aviso estado={estado} />
    </form>
  );
}

/* ---------------------------------------------------------------
   Formulário genérico com aviso
   --------------------------------------------------------------- */

export function ActionForm({
  action,
  children,
  className = "",
}: {
  action: ServerAction;
  children: React.ReactNode;
  className?: string;
}) {
  const [estado, run] = useActionState<ActionResult, FormData>(action, {});
  return (
    <form action={run} className={className}>
      {children}
      <div className="mt-3">
        <Aviso estado={estado} />
      </div>
    </form>
  );
}

export function Chip({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "positive" | "attention" | "negative" | "progress";
}) {
  return <Badge tone={tone}>{children}</Badge>;
}
