"use client";

import { useActionState } from "react";

import { partnerAccess, type AccessState } from "@/app/actions/audience";
import { buttonClass, cx } from "@/components/ui";

const initialState: AccessState = undefined;

const inputBase =
  "border-field-line bg-field text-ink mt-2 min-h-12 w-full rounded-xl border px-3.5 text-base outline-none focus:border-brand";

/**
 * A única porta de entrada do Parceiro — não existe equivalente para o
 * morador. Ver `lib/auth/audience.ts`: o código PA + WhatsApp é curto o
 * bastante para valer a pena forçar, então a Server Action por trás deste
 * formulário aplica dois freios (por IP e por código) antes de consultar o
 * banco.
 */
export function PartnerAccessForm({ proximo }: { proximo?: string }) {
  const [state, formAction, pending] = useActionState(partnerAccess, initialState);

  return (
    <form action={formAction} className="border-line bg-surface shadow-card rounded-3xl border p-5 sm:p-7">
      {proximo ? <input type="hidden" name="proximo" value={proximo} /> : null}
      <label className="text-ink block text-sm font-medium" htmlFor="codigo">
        Código de parceiro
      </label>
      <input
        id="codigo"
        name="codigo"
        required
        autoCapitalize="characters"
        placeholder="PA-0001"
        className={cx(inputBase, "uppercase")}
      />
      <label className="text-ink mt-5 block text-sm font-medium" htmlFor="telefone">
        WhatsApp cadastrado
      </label>
      <input
        id="telefone"
        name="telefone"
        required
        inputMode="tel"
        autoComplete="tel"
        placeholder="(94) 99999-9999"
        className={inputBase}
      />
      {state?.error ? (
        <p role="alert" className="text-danger mt-4 text-sm">
          {state.error}
        </p>
      ) : null}
      <button disabled={pending} className={buttonClass("brand", "lg", "mt-6 w-full")} type="submit">
        {pending ? "Conferindo…" : "Entrar"}
      </button>
      <p className="text-faint mt-4 text-xs leading-relaxed">
        Se não encontrar o código, fale com a gente pelo WhatsApp. Assim protegemos os dados dos moradores.
      </p>
    </form>
  );
}
