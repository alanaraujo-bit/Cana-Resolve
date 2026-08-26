"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { categories, problemExamples } from "@/lib/categories";
import {
  categoryIcons,
  IconArrowRight,
  IconPin,
  IconSearch,
} from "@/components/icons";
import { buttonClass, Container, cx } from "@/components/ui";
import { CategoryLink } from "@/components/category-link";
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
      setText(problemExamples[phrase].slice(0, Math.max(char, 0)) || "\u00a0");
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
  const placeholder = useTypedPlaceholder(!focused && value.length === 0);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim();
    track("consumidor_request_start", { local: "busca-home", tem_descricao: Boolean(q) });
    router.push(q ? `/solicitar?descricao=${encodeURIComponent(q)}` : "/solicitar");
  }

  return (
    <section className="relative isolate overflow-hidden">
      {/* Fundo: lavagem quente + curvas de nível + grão */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="bg-bg absolute inset-0" />
        <div className="cr-contour absolute inset-0 opacity-70" />
        <div className="from-brand-soft absolute inset-x-0 top-0 h-[36rem] bg-gradient-to-b to-transparent opacity-60 dark:opacity-40" />
        <div className="cr-grain absolute inset-0" />
        <div className="via-line absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent to-transparent" />
      </div>

      <Container className="pt-14 pb-16 sm:pt-20 sm:pb-20 lg:pt-24 lg:pb-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="border-brand-line bg-surface/70 text-brand-ink inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[0.8125rem] font-medium backdrop-blur-sm">
            <IconPin className="h-4 w-4" />
            Canaã dos Carajás — PA
          </p>

          <h1 className="mt-7 text-[2.375rem] leading-[1.06] tracking-[-0.03em] text-balance sm:text-[3.25rem] lg:text-[3.75rem]">
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
                />
              </svg>
            </span>{" "}
            hoje?
          </h1>

          <p className="text-muted mx-auto mt-6 max-w-xl text-[1.0625rem] leading-relaxed text-pretty sm:text-lg">
            Conte o seu problema em uma frase. A equipe usa essas informações
            para fazer o encaminhamento inicial a profissionais e empresas que atendem a região.
          </p>

          <form onSubmit={onSubmit} className="mx-auto mt-9 max-w-xl">
            <label htmlFor="hero-busca" className="sr-only">
              Descreva o que você precisa resolver
            </label>
            <div
              className={cx(
                "bg-field flex flex-col gap-2 rounded-2xl border p-2 text-left transition-shadow duration-200 sm:flex-row sm:items-center",
                focused
                  ? "border-brand shadow-lift"
                  : "border-field-line shadow-card",
              )}
            >
              <div className="flex flex-1 items-center gap-3 px-3 py-1">
                <IconSearch className="text-faint h-5 w-5 shrink-0" />
                <input
                  id="hero-busca"
                  name="descricao"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  placeholder={placeholder}
                  autoComplete="off"
                  enterKeyHint="search"
                  className="text-ink h-11 w-full min-w-0 bg-transparent text-[1.0625rem] outline-none sm:h-12"
                />
              </div>
              <button type="submit" className={buttonClass("brand", "md", "shrink-0 sm:h-12")}>
                Encontrar quem resolve
                <IconArrowRight className="h-[18px] w-[18px]" />
              </button>
            </div>
            <p className="text-faint mt-3 text-[0.8125rem]">
              Grátis para quem contrata. Você fala direto com o profissional.
            </p>
          </form>

          <div className="mt-10">
            <p className="text-faint text-[0.8125rem]">Ou escolha por onde começar</p>
            <ul className="mt-4 flex flex-wrap justify-center gap-2">
              {categories.slice(0, 5).map((c) => {
                const Icon = categoryIcons[c.id];
                return (
                  <li key={c.id}>
                    <CategoryLink
                      category={c.id}
                      href={`/solicitar?categoria=${c.id}`}
                      className="border-line bg-surface/70 text-muted hover:border-brand-line hover:text-brand-ink inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-[0.8125rem] backdrop-blur-sm transition-colors"
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
                  className="text-faint hover:text-ink inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[0.8125rem] transition-colors"
                >
                  ver todos
                  <IconArrowRight className="h-3.5 w-3.5" />
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </Container>
    </section>
  );
}
