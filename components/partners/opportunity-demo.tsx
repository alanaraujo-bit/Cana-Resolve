"use client";

import { useEffect, useRef, useState } from "react";
import { categoryIcons, IconArrowRight, IconClock, IconPin } from "@/components/icons";
import { cx } from "@/components/ui";
import { demoOpportunities } from "@/lib/partners";

const CICLO = 6000;

/**
 * O momento "eu entendi": a cara de uma oportunidade chegando.
 *
 * É explicitamente uma demonstração do conceito — o módulo de oportunidades
 * ainda não existe no produto, então o cartão não se disfarça de captura de
 * tela e o rodapé diz isso com todas as letras.
 *
 * O movimento aqui tem função: o ponto que pulsa diz "acabou de chegar", a
 * barra de tempo mostra que a troca é automática e para de correr quando o
 * ponteiro entra — quem está lendo manda no ritmo.
 */
export function OpportunityDemo({ className = "" }: { className?: string }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    if (paused || reduced.current) return;
    const id = setTimeout(
      () => setIndex((i) => (i + 1) % demoOpportunities.length),
      CICLO,
    );
    return () => clearTimeout(id);
  }, [index, paused]);

  const item = demoOpportunities[index];
  const Icon = categoryIcons[item.categoriaId];

  return (
    <div
      className={cx("w-full", className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="cr-lift border-line bg-surface shadow-lift relative overflow-hidden rounded-2xl border">
        <div
          aria-hidden="true"
          className="bg-brand absolute inset-x-0 top-0 h-[3px] opacity-70"
        />

        <div className="border-line relative flex items-center justify-between gap-4 border-b px-5 py-3.5 sm:px-6">
          <p className="text-brand-ink flex items-center gap-2 text-[0.6875rem] font-semibold tracking-[0.14em] uppercase">
            <span className="relative flex h-1.5 w-1.5">
              <span className="bg-brand cr-ping absolute inline-flex h-full w-full rounded-full" />
              <span className="bg-brand relative inline-flex h-1.5 w-1.5 rounded-full" />
            </span>
            Nova oportunidade
          </p>
          <p className="text-faint text-[0.6875rem] tracking-[0.1em] uppercase">
            Exemplo
          </p>

          {/* Quanto falta para o próximo exemplo entrar. */}
          <span
            aria-hidden="true"
            className="bg-line absolute inset-x-0 bottom-0 h-px overflow-hidden"
          >
            <span
              key={index}
              className="cr-timer bg-brand block h-px w-full opacity-60"
              style={{
                "--cr-timer": `${CICLO}ms`,
                animationPlayState: paused ? "paused" : "running",
              } as React.CSSProperties}
            />
          </span>
        </div>

        <div aria-live="polite" className="px-5 py-6 sm:px-6 sm:py-7">
          <div key={item.id} className="cr-swap">
            <div className="flex items-center gap-2.5">
              <span className="border-line bg-surface-2 text-brand-ink grid h-9 w-9 shrink-0 place-items-center rounded-xl border">
                {Icon ? <Icon className="h-[18px] w-[18px]" /> : null}
              </span>
              <div className="min-w-0">
                <p className="text-ink font-display text-[1.0625rem] leading-tight font-semibold tracking-[-0.01em]">
                  {item.categoria}
                </p>
                <p className="text-faint mt-0.5 flex items-center gap-1.5 text-[0.8125rem]">
                  <IconPin className="h-3.5 w-3.5 shrink-0" />
                  {item.bairro} — Canaã dos Carajás
                </p>
              </div>
            </div>

            <blockquote className="border-brand-line text-ink mt-5 border-l-2 pl-4 text-[0.9375rem] leading-relaxed">
              {item.descricao}
            </blockquote>

            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="text-muted flex items-center gap-1.5 text-[0.8125rem]">
                <IconClock className="text-faint h-4 w-4" />
                Precisa para:{" "}
                <span className="text-ink font-medium">{item.urgencia}</span>
              </span>
            </div>
          </div>

          <div className="border-line mt-6 flex items-center justify-between gap-4 border-t pt-5">
            <div className="flex items-center gap-2">
              {demoOpportunities.map((o, i) => (
                <button
                  key={o.id}
                  type="button"
                  aria-current={i === index}
                  aria-label={`Ver o exemplo de ${o.categoria}`}
                  onClick={() => setIndex(i)}
                  className={cx(
                    "h-1.5 rounded-full transition-all duration-500 ease-[cubic-bezier(0.22,1.35,0.36,1)]",
                    i === index
                      ? "bg-brand w-6"
                      : "bg-line-strong hover:bg-faint w-1.5 hover:w-3",
                  )}
                />
              ))}
            </div>
            <span className="text-brand-ink group inline-flex items-center gap-1.5 text-[0.875rem] font-medium">
              Ver oportunidade
              <IconArrowRight className="cr-nudge h-4 w-4" />
            </span>
          </div>
        </div>
      </div>

      <p className="text-faint mt-3.5 text-center text-[0.75rem] leading-relaxed">
        Demonstração de como uma solicitação é apresentada ao parceiro. Não é um
        pedido real nem uma tela já disponível.
      </p>
    </div>
  );
}
