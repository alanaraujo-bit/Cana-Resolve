"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { entrar, type LoginState } from "@/app/ops/entrar/actions";
import { buttonClass, cx } from "@/components/ui";

const inputBase =
  "w-full rounded-xl border border-field-line bg-field px-4 h-12 text-[1rem] text-ink outline-none " +
  "transition-[border-color,box-shadow] duration-200 placeholder:text-faint " +
  "focus:border-brand focus:shadow-[0_0_0_3px_var(--cr-brand-soft)]";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={buttonClass("brand", "lg", "w-full")}
    >
      {pending ? "Entrando…" : "Entrar"}
    </button>
  );
}

export function LoginForm({ proximo }: { proximo?: string }) {
  const [state, action] = useActionState<LoginState, FormData>(entrar, {});

  return (
    <form action={action} className="space-y-4" noValidate>
      {proximo ? <input type="hidden" name="proximo" value={proximo} /> : null}

      <div>
        <label
          htmlFor="email"
          className="text-ink text-[0.9375rem] font-medium"
        >
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          inputMode="email"
          className={cx(inputBase, "mt-2")}
          aria-invalid={state.erro ? true : undefined}
        />
      </div>

      <div>
        <label htmlFor="senha" className="text-ink text-[0.9375rem] font-medium">
          Senha
        </label>
        <input
          id="senha"
          name="senha"
          type="password"
          autoComplete="current-password"
          required
          className={cx(inputBase, "mt-2")}
          aria-invalid={state.erro ? true : undefined}
        />
      </div>

      {state.erro ? (
        <p
          role="alert"
          className="border-danger/25 bg-danger-soft text-danger rounded-lg border px-3.5 py-2.5 text-[0.875rem]"
        >
          {state.erro}
        </p>
      ) : null}

      <Submit />
    </form>
  );
}
