"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { categoryOptions, categoryName, urgencias } from "@/lib/categories";
import {
  categoryIcons,
  IconCheck,
  IconWhatsApp,
} from "@/components/icons";
import { buttonClass, cx } from "@/components/ui";
import { site } from "@/lib/site";
import { waLink } from "@/lib/whatsapp";
import { track } from "@/lib/analytics";
import { enviarSolicitacao } from "@/lib/intake-client";

type Errors = Partial<Record<"descricao" | "nome" | "telefone" | "consent", string>>;

function maskPhone(raw: string) {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function Field({
  label,
  hint,
  htmlFor,
  error,
  optional,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor: string;
  error?: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="text-ink text-[0.9375rem] font-medium">
          {label}
        </label>
        {optional ? <span className="text-faint text-[0.75rem]">opcional</span> : null}
      </div>
      {hint ? <p className="text-faint mt-1 text-[0.8125rem]">{hint}</p> : null}
      <div className="mt-2.5">{children}</div>
      {error ? (
        <p id={`${htmlFor}-erro`} role="alert" className="text-danger mt-2 text-[0.8125rem]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const inputBase =
  "w-full rounded-xl border bg-field px-4 text-[1rem] text-ink outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-faint focus:border-brand focus:shadow-[0_0_0_3px_var(--cr-brand-soft)]";

export function RequestForm({
  initialDescricao = "",
  initialCategoria = "",
}: {
  initialDescricao?: string;
  initialCategoria?: string;
}) {
  const [descricao, setDescricao] = useState(initialDescricao);
  const [categoria, setCategoria] = useState(initialCategoria);
  const [local, setLocal] = useState("");
  const [urgencia, setUrgencia] = useState(urgencias[1].id);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [sent, setSent] = useState(false);
  /** Código do pedido (CR-00021), quando o registro chega a tempo. */
  const [codigo, setCodigo] = useState<string | null>(null);
  const started = useRef(false);
  const linkRef = useRef<HTMLAnchorElement>(null);

  /**
   * O quanto do pedido já está de pé. Vira um filete no topo do cartão:
   * mostra que falta pouco sem transformar o formulário em jogo.
   */
  const progresso = useMemo(() => {
    const feitos = [
      descricao.trim().length >= 10,
      nome.trim().length >= 2,
      telefone.replace(/\D/g, "").length >= 10,
      consent,
    ].filter(Boolean).length;
    return feitos / 4;
  }, [descricao, nome, telefone, consent]);

  const mensagem = useMemo(() => {
    const urg = urgencias.find((u) => u.id === urgencia);
    const linhas = [
      "Olá! Quero solicitar um serviço pelo Canaã Resolve.",
      "",
      `*O que preciso:* ${descricao.trim() || "—"}`,
      categoria ? `*Categoria:* ${categoryName(categoria)}` : null,
      local.trim() ? `*Onde:* ${local.trim()}` : null,
      urg ? `*Quando:* ${urg.label} — ${urg.hint}` : null,
      `*Nome:* ${nome.trim() || "—"}`,
      `*WhatsApp:* ${telefone || "—"}`,
    ].filter(Boolean);
    return linhas.join("\n");
  }, [descricao, categoria, local, urgencia, nome, telefone]);

  /**
   * O aviso some assim que o campo passa a estar certo. Manter um erro em
   * vermelho ao lado de um campo já corrigido é a forma mais rápida de
   * fazer um formulário parecer quebrado.
   */
  function limparErro(campo: keyof Errors, valido: boolean) {
    if (!valido) return;
    setErrors((prev) => (prev[campo] ? { ...prev, [campo]: undefined } : prev));
  }

  function validate(): Errors {
    const e: Errors = {};
    if (descricao.trim().length < 10)
      e.descricao = "Conte em uma frase o que precisa resolver.";
    if (nome.trim().length < 2) e.nome = "Informe o seu nome.";
    if (telefone.replace(/\D/g, "").length < 10)
      e.telefone = "Informe um WhatsApp com DDD.";
    if (!consent) e.consent = "Precisamos da sua autorização para encaminhar o pedido.";
    return e;
  }

  /**
   * Leva o foco ao primeiro campo com problema e dá nele um tranco curto —
   * o suficiente para o olho encontrar, longe de um alarme.
   */
  function focusFirstError(e: Errors) {
    const order: Array<keyof Errors> = ["descricao", "nome", "telefone", "consent"];
    const first = order.find((k) => e[k]);
    if (!first) return;
    const el = document.getElementById(first);
    el?.focus();

    const alvo = first === "consent" ? el?.closest("label") : el;
    if (!alvo || typeof alvo.animate !== "function") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    alvo.animate(
      [
        { transform: "translateX(0)" },
        { transform: "translateX(-4px)" },
        { transform: "translateX(4px)" },
        { transform: "translateX(-2px)" },
        { transform: "translateX(0)" },
      ],
      { duration: 330, easing: "cubic-bezier(0.36, 0.07, 0.19, 0.97)" },
    );
  }

  function onAnchorClick(ev: React.MouseEvent<HTMLAnchorElement>) {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) {
      ev.preventDefault();
      focusFirstError(e);
      return;
    }
    track("consumidor_request_submit", { categoria: categoria || "nao_informada" });
    document.dispatchEvent(new CustomEvent("cr:solicitacao-enviada"));

    // Grava o pedido antes de tudo, mas sem segurar o WhatsApp: se o registro
    // falhar, o caminho da pessoa continua exatamente o mesmo de antes.
    enviarSolicitacao({
      descricao,
      categoria: categoria || null,
      nome,
      telefone,
      bairro: local || null,
      urgencia,
      consentimento: consent,
    }).then(setCodigo);

    setSent(true);
  }

  function markStart() {
    if (started.current) return;
    started.current = true;
    track("consumidor_request_start");
  }

  /** Enter em um campo de texto envia o formulário, como se espera. */
  function onKeyDown(ev: React.KeyboardEvent<HTMLFormElement>) {
    const target = ev.target as HTMLElement;
    if (ev.key !== "Enter" || target.tagName === "TEXTAREA") return;
    if (target.tagName === "BUTTON" || target.tagName === "A") return;
    ev.preventDefault();
    submit();
  }

  function submit() {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) {
      focusFirstError(e);
      return;
    }
    linkRef.current?.click();
  }

  if (sent) {
    return (
      <div className="cr-bloom border-line bg-surface shadow-card rounded-2xl border p-7 text-center sm:p-10">
        <span className="cr-halo bg-brand-soft text-brand-ink relative mx-auto grid h-14 w-14 place-items-center rounded-full">
          <IconWhatsApp className="h-7 w-7" />
        </span>
        <h2 className="mt-6 text-2xl tracking-[-0.02em]">
          Abrimos o WhatsApp com o seu pedido pronto
        </h2>
        <p className="text-muted mx-auto mt-3 max-w-md text-[0.9375rem] leading-relaxed">
          Falta um toque: envie a mensagem na conversa que abriu. Se ela não
          abriu sozinha, use o botão abaixo.
        </p>
        {codigo ? (
          <div className="mt-4">
            <p className="text-faint text-[0.8125rem]">
              Seu pedido ficou registrado como{" "}
              <span className="text-ink font-medium tabular-nums">{codigo}</span>.
              Guarde esse número se precisar falar com a gente.
            </p>
            <a href="/acompanhar" className="text-brand-ink mt-3 inline-block text-sm font-semibold underline underline-offset-4">
              Acompanhar esta solicitação
            </a>
          </div>
        ) : null}
        <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <a
            href={waLink(mensagem)}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClass("brand", "lg")}
          >
            <IconWhatsApp className="h-[18px] w-[18px]" />
            Abrir a conversa de novo
          </a>
          <button
            type="button"
            onClick={() => setSent(false)}
            className={buttonClass("outline", "lg")}
          >
            Revisar o pedido
          </button>
        </div>
        <p className="text-faint mt-7 text-[0.8125rem] leading-relaxed">
          Quando você enviar a mensagem, a equipe faz o encaminhamento inicial
          para profissionais e empresas que atendem essa categoria em {site.city}.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(ev) => {
        ev.preventDefault();
        submit();
      }}
      onKeyDown={onKeyDown}
      noValidate
      className="border-line bg-surface shadow-card relative overflow-hidden rounded-2xl border p-6 sm:p-9"
      onFocusCapture={markStart}
    >
      {/* Filete de conclusão: o pedido ganhando corpo, sem contar pontos. */}
      <span
        aria-hidden="true"
        className="bg-line absolute inset-x-0 top-0 h-[3px] overflow-hidden"
      >
        <span
          className="bg-brand block h-full origin-left transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{ transform: `scaleX(${progresso})` }}
        />
      </span>

      <div className="space-y-8">
        <Field
          label="O que você precisa resolver?"
          hint="Escreva com as suas palavras, como você contaria para um conhecido."
          htmlFor="descricao"
          error={errors.descricao}
        >
          <textarea
            id="descricao"
            name="descricao"
            rows={4}
            value={descricao}
            onChange={(e) => {
              setDescricao(e.target.value);
              limparErro("descricao", e.target.value.trim().length >= 10);
            }}
            aria-invalid={!!errors.descricao}
            aria-describedby={errors.descricao ? "descricao-erro" : undefined}
            placeholder="Ex.: Meu ar-condicionado do quarto não está gelando e faz um barulho alto."
            className={cx(
              inputBase,
              "resize-y py-3 leading-relaxed",
              errors.descricao ? "border-danger" : "border-field-line",
            )}
          />
        </Field>

        <fieldset>
          <legend className="text-ink text-[0.9375rem] font-medium">Categoria</legend>
          <p className="text-faint mt-1 text-[0.8125rem]">
            Se não souber, pode deixar em branco — a gente identifica.
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {categoryOptions.map((c) => {
              const Icon = categoryIcons[c.id];
              const active = categoria === c.id;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      markStart();
                      setCategoria(active ? "" : c.id);
                      track("consumidor_category_click", { categoria: c.id });
                    }}
                    className={cx(
                      "inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-[0.8125rem]",
                      "transition-[color,background-color,border-color,transform] duration-300 ease-[cubic-bezier(0.22,1.35,0.36,1)]",
                      active
                        ? "border-brand bg-brand-soft text-brand-ink scale-[1.04] font-medium"
                        : "border-line text-muted hover:border-line-strong hover:text-ink hover:-translate-y-0.5",
                    )}
                  >
                    {Icon ? (
                      <Icon
                        className={cx(
                          "h-4 w-4 shrink-0 transition-transform duration-300",
                          active ? "scale-110" : "",
                        )}
                      />
                    ) : null}
                    <span className="sm:hidden">{c.short}</span>
                    <span className="hidden sm:inline">{c.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </fieldset>

        <Field
          label="Bairro ou referência"
          hint="Onde o serviço vai ser feito, em Canaã dos Carajás."
          htmlFor="local"
          optional
        >
          <input
            id="local"
            name="local"
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            placeholder="Ex.: Centro, perto da praça"
            autoComplete="address-level3"
            className={cx(inputBase, "border-field-line h-12")}
          />
        </Field>

        <fieldset>
          <legend className="text-ink text-[0.9375rem] font-medium">Para quando?</legend>
          <div className="border-line bg-surface-2 mt-3 grid grid-cols-1 gap-1 rounded-xl border p-1 sm:grid-cols-3">
            {urgencias.map((u) => {
              const active = urgencia === u.id;
              return (
                <label
                  key={u.id}
                  className={cx(
                    "flex cursor-pointer flex-col items-start rounded-lg px-4 py-2.5 transition-colors sm:items-center",
                    active ? "bg-raised shadow-hair text-ink" : "text-muted hover:text-ink",
                  )}
                >
                  <input
                    type="radio"
                    name="urgencia"
                    value={u.id}
                    checked={active}
                    onChange={() => setUrgencia(u.id)}
                    className="sr-only"
                  />
                  <span className="text-[0.9375rem] font-medium">{u.label}</span>
                  <span className="text-faint text-[0.75rem]">{u.hint}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Seu nome" htmlFor="nome" error={errors.nome}>
            <input
              id="nome"
              name="nome"
              value={nome}
              onChange={(e) => {
                setNome(e.target.value);
                limparErro("nome", e.target.value.trim().length >= 2);
              }}
              autoComplete="name"
              aria-invalid={!!errors.nome}
              aria-describedby={errors.nome ? "nome-erro" : undefined}
              placeholder="Como podemos te chamar"
              className={cx(inputBase, "h-12", errors.nome ? "border-danger" : "border-field-line")}
            />
          </Field>

          <Field label="Seu WhatsApp" htmlFor="telefone" error={errors.telefone}>
            <input
              id="telefone"
              name="telefone"
              value={telefone}
              onChange={(e) => {
                const v = maskPhone(e.target.value);
                setTelefone(v);
                limparErro("telefone", v.replace(/D/g, "").length >= 10);
              }}
              inputMode="tel"
              autoComplete="tel-national"
              aria-invalid={!!errors.telefone}
              aria-describedby={errors.telefone ? "telefone-erro" : undefined}
              placeholder="(94) 90000-0000"
              className={cx(inputBase, "h-12", errors.telefone ? "border-danger" : "border-field-line")}
            />
          </Field>
        </div>

        <div>
          <label
            htmlFor="consent"
            className={cx(
              "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors",
              errors.consent ? "border-danger bg-danger-soft" : "border-line bg-surface-2",
            )}
          >
            <span className="relative mt-0.5 flex h-5 w-5 shrink-0">
              <input
                id="consent"
                name="consent"
                type="checkbox"
                checked={consent}
                onChange={(e) => {
                  setConsent(e.target.checked);
                  limparErro("consent", e.target.checked);
                }}
                aria-invalid={!!errors.consent}
                aria-describedby={errors.consent ? "consent-erro" : undefined}
                className="peer h-5 w-5 appearance-none rounded-[6px] border border-[var(--cr-field-border)] bg-[var(--cr-field)] transition-[background-color,border-color,transform] duration-200 checked:border-transparent checked:bg-[var(--cr-brand)] checked:scale-105"
              />
              <IconCheck
                aria-hidden="true"
                strokeWidth={2.6}
                className="text-on-brand pointer-events-none absolute inset-0 m-auto h-3.5 w-3.5 scale-50 opacity-0 transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.22,1.35,0.36,1)] peer-checked:scale-100 peer-checked:opacity-100"
              />
            </span>
            <span className="text-muted text-[0.875rem] leading-relaxed">
              Autorizo o Canaã Resolve a compartilhar este pedido e o meu contato
              com profissionais parceiros da categoria, para que possam falar comigo.
            </span>
          </label>
          {errors.consent ? (
            <p id="consent-erro" role="alert" className="text-danger mt-2 text-[0.8125rem]">
              {errors.consent}
            </p>
          ) : null}
        </div>

        <div>
          <a
            ref={linkRef}
            href={waLink(mensagem)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => {
              onAnchorClick(event);
              if (!event.defaultPrevented) track("consumidor_whatsapp_click", { local: "formulario" });
            }}
            className={buttonClass("brand", "lg", "cr-sheen w-full")}
          >
            <IconWhatsApp className="h-[18px] w-[18px]" />
            Enviar pedido pelo WhatsApp
          </a>
          <p className="text-faint mt-4 text-[0.8125rem] leading-relaxed">
            O pedido fica registrado no Canaã Resolve e a conversa continua pelo
            WhatsApp da equipe. Guardamos o que você escreveu aqui para
            encaminhar e acompanhar — nada além disso. Veja a{" "}
            <Link href="/privacidade" className="text-brand-ink decoration-brand-line hover:decoration-current underline underline-offset-4 transition-[text-decoration-color] duration-300">
              Política de Privacidade
            </Link>
            .
          </p>
        </div>
      </div>
    </form>
  );
}
