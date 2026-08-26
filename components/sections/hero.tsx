"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  categories,
  categoryName,
  guessCategory,
  problemExamples,
} from "@/lib/categories";
import {
  categoryIcons,
  IconArrowRight,
  IconPin,
  IconSearch,
} from "@/components/icons";
import { buttonClass, Container, cx } from "@/components/ui";
import { CategoryLink } from "@/components/category-link";
import { PointerAura } from "@/components/motion";
import { track } from "@/lib/analytics";

/** Placeholder que escreve exemplos reais de pedido, um de cada vez. */
function useTypedPlaceholder(active: boolean) {
  const [text, setText] = useState(problemExamples[0]);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !active) return;

    let phrase = 0;
    let char = problemExamples[0].length;
    let erasing = true;
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      const current = problemExamples[phrase];
      if (erasing) {
        char -= 1;
        if (char <= 0) {
          erasing = false;
          phrase = (phrase + 1) % problemExamples.length;
        }
      } else {
        char += 1;
        if (char >= problemExamples[phrase].length) erasing = true;
      }
      setText(problemExamples[phrase].slice(0, Math.max(char, 0)));
      const delay = erasing ? (char <= 1 ? 900 : 22) : char >= current.length ? 2600 : 45;
      timer = setTimeout(tick, delay);
    };

    timer = setTimeout(tick, 2400);
    return () => clearTimeout(timer);
  }, [active]);

  return text;
}

export function Hero() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const ghostActive = !focused && value.length === 0;
  const placeholder = useTypedPlaceholder(ghostActive);

  const guess = useMemo(() => guessCategory(value), [value]);
  const GuessIcon = guess ? categoryIcons[guess] : null;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim();
    track("consumidor_request_start", {
      local: "busca-home",
      tem_descricao: Boolean(q),
      categoria_sugerida: guess ?? "nenhuma",
    });
    const params = new URLSearchParams();
    if (q) params.set("descricao", q);
    if (guess) params.set("categoria", guess);
    const qs = params.toString();
    router.push(qs ? `/solicitar?${qs}` : "/solicitar");
  }

  return (
    <PointerAura className="relative isolate overflow-hidden">
      {/* Fundo: lavagem quente, duas auroras em deriva lenta, curvas e grão.
          As auroras também respondem de longe ao ponteiro — o suficiente
          para dar profundidade, nunca o bastante para chamar atenção. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="bg-bg absolute inset-0" />
        <div className="cr-contour absolute inset-0 opacity-70" />
        <div className="from-brand-soft absolute inset-x-0 top-0 h-[36rem] bg-gradient-to-b to-transparent opacity-60 dark:opacity-40" />
        <div className="cr-drift-a cr-aura bg-brand absolute -top-24 -left-24 h-[28rem] w-[28rem] rounded-full opacity-[0.07] blur-[90px] dark:opacity-[0.10]" />
        <div className="cr-drift-b cr-aura-far bg-accent absolute -top-10 right-[-8rem] h-[24rem] w-[24rem] rounded-full opacity-[0.05] blur-[100px] dark:opacity-[0.07]" />
        <div className="cr-grain absolute inset-0" />
        <div className="via-line absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent to-transparent" />
      </div>

      <Container className="pt-14 pb-16 sm:pt-20 sm:pb-20 lg:pt-24 lg:pb-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="cr-enter border-brand-line bg-surface/70 text-brand-ink inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[0.8125rem] font-medium backdrop-blur-sm">
            <IconPin className="h-4 w-4" />
            Canaã dos Carajás — PA
          </p>

          <h1
            className="cr-enter mt-7 text-[2.375rem] leading-[1.06] tracking-[-0.03em] text-balance sm:text-[3.25rem] lg:text-[3.75rem]"
            style={{ "--cr-delay": "90ms" } as React.CSSProperties}
          >
            O que você precisa{" "}
            <span className="text-brand-ink relative whitespace-nowrap">
              resolver
              <svg
                aria-hidden="true"
                viewBox="0 0 220 12"
                preserveAspectRatio="none"
                className="text-brand/30 absolute -bottom-[0.06em] left-0 h-[0.34em] w-full"
              >
                <path
                  d="M2 8.5C40 4 92 2.5 130 3.5c34 .9 62 3.4 88 6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  className="cr-draw-load"
                  style={{ "--cr-len": 230 } as React.CSSProperties}
                />
              </svg>
            </span>{" "}
            hoje?
          </h1>

          <p
            className="cr-enter text-muted mx-auto mt-6 max-w-xl text-[1.0625rem] leading-relaxed text-pretty sm:text-lg"
            style={{ "--cr-delay": "170ms" } as React.CSSProperties}
          >
            Conte o seu problema em uma frase. A equipe usa essas informações
            para fazer o encaminhamento inicial a profissionais e empresas que atendem a região.
          </p>

          <form
            onSubmit={onSubmit}
            className="cr-enter mx-auto mt-9 max-w-xl"
            style={{ "--cr-delay": "250ms" } as React.CSSProperties}
          >
            <label htmlFor="hero-busca" className="sr-only">
              Descreva o que você precisa resolver
            </label>
            <div
              className={cx(
                "bg-field flex flex-col gap-2 rounded-2xl border p-2 text-left transition-[box-shadow,border-color,transform] duration-300 sm:flex-row sm:items-center",
                focused
                  ? "border-brand shadow-lift -translate-y-0.5"
                  : "border-field-line shadow-card",
              )}
            >
              <div className="flex flex-1 items-center gap-3 px-3 py-1">
                <IconSearch
                  className={cx(
                    "h-5 w-5 shrink-0 transition-colors duration-300",
                    focused ? "text-brand" : "text-faint",
                  )}
                />
                <div className="relative flex-1">
                  <input
                    id="hero-busca"
                    name="descricao"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    autoComplete="off"
                    enterKeyHint="search"
                    className="text-ink relative z-10 h-11 w-full min-w-0 bg-transparent text-[1.0625rem] outline-none sm:h-12"
                  />
                  {/* Exemplo que se escreve sozinho, com o cursor piscando. */}
                  {ghostActive ? (
                    <span
                      aria-hidden="true"
                      className="cr-caret cr-ghost text-faint pointer-events-none absolute inset-0 flex items-center overflow-hidden text-[1.0625rem] whitespace-nowrap"
                    >
                      {placeholder}
                    </span>
                  ) : null}
                </div>
              </div>
              <button
                type="submit"
                className={buttonClass("brand", "md", "cr-sheen shrink-0 sm:h-12")}
              >
                Encontrar quem resolve
                <IconArrowRight className="cr-nudge h-[18px] w-[18px]" />
              </button>
            </div>

            <div className="mt-3 flex min-h-[1.25rem] flex-wrap items-center justify-center gap-x-3 gap-y-1">
              {guess && GuessIcon ? (
                <span
                  key={guess}
                  className="cr-chip-in border-brand-line bg-brand-soft text-brand-ink inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.75rem] font-medium"
                >
                  <GuessIcon className="h-3.5 w-3.5" />
                  Parece {categoryName(guess)}
                </span>
              ) : null}
              <p className="text-faint text-[0.8125rem]">
                Grátis para quem contrata. Você fala direto com o profissional.
              </p>
            </div>
          </form>

          <div
            className="cr-enter mt-10"
            style={{ "--cr-delay": "330ms" } as React.CSSProperties}
          >
            <p className="text-faint text-[0.8125rem]">Ou escolha por onde começar</p>
            <ul className="mt-4 flex flex-wrap justify-center gap-2">
              {categories.slice(0, 5).map((c) => {
                const Icon = categoryIcons[c.id];
                return (
                  <li key={c.id}>
                    <CategoryLink
                      category={c.id}
                      href={`/solicitar?categoria=${c.id}`}
                      className="border-line bg-surface/70 text-muted hover:border-brand-line hover:text-brand-ink hover:bg-brand-soft inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-[0.8125rem] backdrop-blur-sm transition-[color,background-color,border-color,transform] duration-300 hover:-translate-y-0.5"
                    >
                      <Icon className="h-4 w-4" />
                      {c.short}
                    </CategoryLink>
                  </li>
                );
              })}
              <li>
                <Link
                  href="#servicos"
                  className="text-faint hover:text-ink group inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[0.8125rem] transition-colors"
                >
                  ver todos
                  <IconArrowRight className="cr-nudge h-3.5 w-3.5" />
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </Container>
    </PointerAura>
  );
}
