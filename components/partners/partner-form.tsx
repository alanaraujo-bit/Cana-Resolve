"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { categoryIcons, IconCheck, IconWhatsApp } from "@/components/icons";
import { buttonClass, cx } from "@/components/ui";
import { track } from "@/lib/analytics";
import { categoryName, categoryOptions } from "@/lib/categories";
import { cadastroDepois, heardOptions } from "@/lib/partners";
import { partnerLeadMessage, waLink } from "@/lib/whatsapp";

type Errors = Partial<Record<"nome" | "empresa" | "telefone" | "categoria", string>>;

function maskPhone(raw: string) {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

const inputBase =
  "w-full rounded-xl border bg-field px-4 text-[1rem] text-ink outline-none transition-colors placeholder:text-faint focus:border-brand";

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

const proximosPassos = [
  {
    title: "Conferimos as informações",
    text: "Olhamos a sua categoria, os serviços e se você atende Canaã dos Carajás.",
  },
  {
    title: "Falamos com você pelo WhatsApp",
    text: "É a conversa em que completamos o cadastro, tiramos dúvidas e combinamos as condições por escrito.",
  },
  {
    title: "A participação é confirmada",
    text: "Só depois da análise a sua vaga na categoria é confirmada e o período de 90 dias começa a contar. Não existe aprovação automática.",
  },
];

export function PartnerForm({ compact = false }: { compact?: boolean }) {
  const [nome, setNome] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [telefone, setTelefone] = useState("");
  const [categoria, setCategoria] = useState("");
  const [atendeCanaa, setAtendeCanaa] = useState(true);
  const [comoConheceu, setComoConheceu] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [sent, setSent] = useState(false);
  const started = useRef(false);
  const linkRef = useRef<HTMLAnchorElement>(null);

  const mensagem = useMemo(
    () =>
      partnerLeadMessage({
        nome,
        empresa,
        telefone,
        categoria: categoryName(categoria),
        atendeCanaa,
        comoConheceu:
          heardOptions.find((o) => o.id === comoConheceu)?.label ?? "",
      }),
    [nome, empresa, telefone, categoria, atendeCanaa, comoConheceu],
  );

  /** O primeiro toque em qualquer campo marca o início do cadastro. */
  function marcarInicio(campo: string) {
    if (!started.current) {
      started.current = true;
      track("parceiros_form_start", { campo });
    }
  }

  function validate(): Errors {
    const e: Errors = {};
    if (nome.trim().length < 2) e.nome = "Informe o seu nome.";
    if (empresa.trim().length < 2)
      e.empresa = "Informe o nome da empresa ou como você é conhecido no trabalho.";
    if (telefone.replace(/\D/g, "").length < 10)
      e.telefone = "Informe um WhatsApp com DDD.";
    if (!categoria) e.categoria = "Escolha a categoria em que você atua.";
    return e;
  }

  function focusFirstError(e: Errors) {
    const ordem: Array<keyof Errors> = ["nome", "empresa", "telefone", "categoria"];
    const first = ordem.find((k) => e[k]);
    if (first) document.getElementById(first === "categoria" ? "categoria-legenda" : first)?.focus();
  }

  function aoClicarNoEnvio(ev: React.MouseEvent<HTMLAnchorElement>) {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) {
      ev.preventDefault();
      track("parceiros_form_error", { campos: Object.keys(e).join(",") });
      focusFirstError(e);
      return;
    }
    track("parceiros_form_submit", {
      categoria,
      atende_canaa: atendeCanaa,
      como_conheceu: comoConheceu || "nao_informado",
    });
    document.dispatchEvent(new CustomEvent("cr:parceiro-enviado"));
    setSent(true);
  }

  function submit() {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) {
      track("parceiros_form_error", { campos: Object.keys(e).join(",") });
      focusFirstError(e);
      return;
    }
    linkRef.current?.click();
  }

  function onKeyDown(ev: React.KeyboardEvent<HTMLFormElement>) {
    const target = ev.target as HTMLElement;
    if (ev.key !== "Enter" || target.tagName === "TEXTAREA") return;
    if (target.tagName === "BUTTON" || target.tagName === "A") return;
    ev.preventDefault();
    submit();
  }

  if (sent) {
    return (
      <div className="border-line bg-surface shadow-card rounded-2xl border p-6 sm:p-9">
        <span className="bg-brand-soft text-brand-ink grid h-14 w-14 place-items-center rounded-full">
          <IconWhatsApp className="h-7 w-7" />
        </span>
        <h2 className="mt-6 text-2xl leading-tight tracking-[-0.02em]">
          Abrimos o WhatsApp com o seu cadastro pronto
        </h2>
        <p className="text-muted mt-3 text-[0.9375rem] leading-relaxed">
          Falta um toque: envie a mensagem na conversa que abriu. Se ela não
          abriu sozinha, use o botão abaixo. Assim que a mensagem chegar, é
          isto que acontece:
        </p>

        <ol className="mt-7 space-y-5">
          {proximosPassos.map((passo, i) => (
            <li key={passo.title} className="flex gap-4">
              <span className="border-line-strong text-brand-ink font-display grid h-8 w-8 shrink-0 place-items-center rounded-full border text-[0.8125rem] font-semibold">
                {i + 1}
              </span>
              <div>
                <h3 className="text-ink font-sans text-[0.9375rem] font-medium">
                  {passo.title}
                </h3>
                <p className="text-muted mt-1 text-[0.875rem] leading-relaxed">
                  {passo.text}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <a
            href={waLink(mensagem)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() =>
              track("parceiros_whatsapp_click", { local: "pos-envio" })
            }
            className={buttonClass("brand", "lg", "flex-1")}
          >
            <IconWhatsApp className="h-[18px] w-[18px]" />
            Abrir a conversa de novo
          </a>
          <button
            type="button"
            onClick={() => setSent(false)}
            className={buttonClass("outline", "lg")}
          >
            Revisar os dados
          </button>
        </div>

        <p className="text-faint mt-6 text-[0.8125rem] leading-relaxed">
          Nada é cobrado agora. O pagamento da condição de lançamento só entra
          na conversa depois que a sua participação for confirmada.
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
      className={cx(
        "border-line bg-surface shadow-card rounded-2xl border",
        compact ? "p-6 sm:p-7" : "p-6 sm:p-9",
      )}
    >
      <div className="space-y-7">
        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Seu nome" htmlFor="nome" error={errors.nome}>
            <input
              id="nome"
              name="nome"
              value={nome}
              onChange={(e) => {
                marcarInicio("nome");
                setNome(e.target.value);
              }}
              autoComplete="name"
              aria-invalid={!!errors.nome}
              aria-describedby={errors.nome ? "nome-erro" : undefined}
              placeholder="Como podemos te chamar"
              className={cx(inputBase, "h-12", errors.nome ? "border-danger" : "border-field-line")}
            />
          </Field>

          <Field
            label="Empresa ou nome profissional"
            htmlFor="empresa"
            error={errors.empresa}
          >
            <input
              id="empresa"
              name="empresa"
              value={empresa}
              onChange={(e) => {
                marcarInicio("empresa");
                setEmpresa(e.target.value);
              }}
              autoComplete="organization"
              aria-invalid={!!errors.empresa}
              aria-describedby={errors.empresa ? "empresa-erro" : undefined}
              placeholder="Ex.: Refrigeração Carajás"
              className={cx(inputBase, "h-12", errors.empresa ? "border-danger" : "border-field-line")}
            />
          </Field>
        </div>

        <Field
          label="Seu WhatsApp"
          hint="É por aqui que as oportunidades e a conversa de cadastro chegam."
          htmlFor="telefone"
          error={errors.telefone}
        >
          <input
            id="telefone"
            name="telefone"
            value={telefone}
            onChange={(e) => {
              marcarInicio("telefone");
              setTelefone(maskPhone(e.target.value));
            }}
            inputMode="tel"
            autoComplete="tel-national"
            aria-invalid={!!errors.telefone}
            aria-describedby={errors.telefone ? "telefone-erro" : undefined}
            placeholder="(94) 90000-0000"
            className={cx(inputBase, "h-12", errors.telefone ? "border-danger" : "border-field-line")}
          />
        </Field>

        <fieldset>
          <legend
            id="categoria-legenda"
            tabIndex={-1}
            className="text-ink text-[0.9375rem] font-medium"
          >
            Categoria principal
          </legend>
          <p className="text-faint mt-1 text-[0.8125rem]">
            A área em que você mais trabalha. Se a sua não estiver na lista,
            escolha <span className="text-muted">Outro serviço</span> — queremos
            saber assim mesmo.
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
                      marcarInicio("categoria");
                      setCategoria(active ? "" : c.id);
                      setErrors((prev) => ({ ...prev, categoria: undefined }));
                    }}
                    className={cx(
                      "inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-[0.8125rem] transition-colors",
                      active
                        ? "border-brand bg-brand-soft text-brand-ink font-medium"
                        : "border-line text-muted hover:border-line-strong hover:text-ink",
                      errors.categoria && !active ? "border-danger/50" : "",
                    )}
                  >
                    {Icon ? <Icon className="h-4 w-4 shrink-0" /> : null}
                    <span className="sm:hidden">{c.short}</span>
                    <span className="hidden sm:inline">{c.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          {errors.categoria ? (
            <p role="alert" className="text-danger mt-2 text-[0.8125rem]">
              {errors.categoria}
            </p>
          ) : null}
        </fieldset>

        <fieldset>
          <legend className="text-ink text-[0.9375rem] font-medium">
            Você atende Canaã dos Carajás?
          </legend>
          <div className="border-line bg-surface-2 mt-3 grid grid-cols-2 gap-1 rounded-xl border p-1">
            {[
              { id: "sim", label: "Sim, atendo", value: true },
              { id: "nao", label: "Ainda não", value: false },
            ].map((op) => {
              const active = atendeCanaa === op.value;
              return (
                <label
                  key={op.id}
                  className={cx(
                    "flex cursor-pointer items-center justify-center rounded-lg px-4 py-2.5 text-[0.9375rem] transition-colors",
                    active ? "bg-raised shadow-hair text-ink font-medium" : "text-muted hover:text-ink",
                  )}
                >
                  <input
                    type="radio"
                    name="atende"
                    value={op.id}
                    checked={active}
                    onChange={() => {
                      marcarInicio("atende");
                      setAtendeCanaa(op.value);
                    }}
                    className="sr-only"
                  />
                  {op.label}
                </label>
              );
            })}
          </div>
          {!atendeCanaa ? (
            <p className="text-muted mt-2.5 text-[0.8125rem] leading-relaxed">
              O programa começa por Canaã dos Carajás, mas pode enviar assim
              mesmo: registramos o seu interesse para quando a rede alcançar a
              sua região.
            </p>
          ) : null}
        </fieldset>

        <fieldset>
          <legend className="text-ink text-[0.9375rem] font-medium">
            Como você conheceu o Canaã Resolve?{" "}
            <span className="text-faint text-[0.75rem] font-normal">opcional</span>
          </legend>
          <ul className="mt-3 flex flex-wrap gap-2">
            {heardOptions.map((o) => {
              const active = comoConheceu === o.id;
              return (
                <li key={o.id}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => setComoConheceu(active ? "" : o.id)}
                    className={cx(
                      "rounded-full border px-3.5 py-2 text-[0.8125rem] transition-colors",
                      active
                        ? "border-brand bg-brand-soft text-brand-ink font-medium"
                        : "border-line text-muted hover:border-line-strong hover:text-ink",
                    )}
                  >
                    {o.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </fieldset>

        <div>
          <a
            ref={linkRef}
            href={waLink(mensagem)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={aoClicarNoEnvio}
            className={buttonClass("brand", "lg", "w-full")}
          >
            <IconWhatsApp className="h-[18px] w-[18px]" />
            Enviar meu interesse
          </a>

          <div className="border-line mt-6 border-t pt-5">
            <p className="text-muted text-[0.8125rem] leading-relaxed">
              Enviar o interesse não gera cobrança nem confirma a vaga. Depois
              desta etapa, a análise cadastral pode pedir:
            </p>
            <ul className="text-faint mt-3 space-y-1.5 text-[0.8125rem]">
              {cadastroDepois.map((item) => (
                <li key={item} className="flex gap-2">
                  <IconCheck className="mt-[3px] h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                  {item}
                </li>
              ))}
            </ul>
            <p className="text-faint mt-4 text-[0.8125rem] leading-relaxed">
              Nesta primeira versão o cadastro chega à equipe pelo WhatsApp —
              nada é armazenado neste site. Veja a{" "}
              <Link href="/privacidade" className="text-brand-ink underline underline-offset-4">
                Política de Privacidade
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </form>
  );
}
