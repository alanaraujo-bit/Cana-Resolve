"use client";

import { useActionState } from "react";
import { partnerAccess, residentAccess, type AccessState } from "@/app/actions/audience";

const initialState: AccessState = undefined;

export function AccessForm({ audience }: { audience: "resident" | "partner" }) {
  const action = audience === "resident" ? residentAccess : partnerAccess;
  const [state, formAction, pending] = useActionState(action, initialState);
  const isPartner = audience === "partner";

  return (
    <form action={formAction} className="border-line bg-surface shadow-card rounded-3xl border p-5 sm:p-7">
      <label className="text-ink block text-sm font-medium" htmlFor="codigo">
        {isPartner ? "Código de parceiro" : "Código da solicitação"}
      </label>
      <input id="codigo" name="codigo" required autoCapitalize="characters" placeholder={isPartner ? "PA-0001" : "CR-00021"} className="border-field-line bg-field text-ink mt-2 min-h-12 w-full rounded-xl border px-3.5 text-base uppercase outline-none focus:border-brand" />
      <label className="text-ink mt-5 block text-sm font-medium" htmlFor="telefone">WhatsApp usado no cadastro</label>
      <input id="telefone" name="telefone" required inputMode="tel" autoComplete="tel" placeholder="(94) 99999-9999" className="border-field-line bg-field text-ink mt-2 min-h-12 w-full rounded-xl border px-3.5 text-base outline-none focus:border-brand" />
      {state?.error ? <p role="alert" className="mt-4 text-sm text-danger">{state.error}</p> : null}
      <button disabled={pending} className="bg-brand text-on-brand hover:bg-brand-hover mt-6 min-h-12 w-full rounded-xl px-4 text-sm font-semibold transition disabled:opacity-60" type="submit">
        {pending ? "Conferindo…" : isPartner ? "Entrar no Partner App" : "Ver minhas solicitações"}
      </button>
      <p className="text-faint mt-4 text-xs leading-relaxed">Se não encontrar o código, fale com a gente pelo WhatsApp. Assim protegemos suas informações.</p>
    </form>
  );
}
