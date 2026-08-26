"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

/** Lê a preferência de movimento uma vez e acompanha mudanças no sistema. */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return reduced;
}

/**
 * Marca `data-shown` quando o bloco entra na tela, sem mexer na aparência
 * dele. Serve para disparar o que já está escrito em CSS — trilhos que se
 * preenchem, traços que se desenham — em elementos que não devem eles
 * próprios aparecer com fade.
 */
export function InView({
  children,
  className = "",
  threshold = 0.15,
}: {
  children: ReactNode;
  className?: string;
  threshold?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      const id = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(id);
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            io.disconnect();
          }
        }
      },
      { threshold, rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  return (
    <div ref={ref} className={className} data-shown={shown ? "true" : "false"}>
      {children}
    </div>
  );
}

/**
 * Foco de luz que segue o ponteiro dentro de uma grade de cartões.
 *
 * Um único listener no contêiner alimenta as variáveis `--sx`/`--sy` do
 * cartão sob o cursor. Nada de um listener por item — e nenhum estado em
 * React, porque isso rodaria a cada pixel.
 */
export function SpotlightArea({
  children,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "ul" | "section";
}) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    let frame = 0;
    let pending: { el: HTMLElement; x: number; y: number } | null = null;

    const flush = () => {
      frame = 0;
      if (!pending) return;
      pending.el.style.setProperty("--sx", `${pending.x}px`);
      pending.el.style.setProperty("--sy", `${pending.y}px`);
      pending = null;
    };

    const onMove = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      const card = target?.closest<HTMLElement>(".cr-spot");
      if (!card) return;
      const box = card.getBoundingClientRect();
      pending = {
        el: card,
        x: event.clientX - box.left,
        y: event.clientY - box.top,
      };
      if (!frame) frame = requestAnimationFrame(flush);
    };

    root.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      root.removeEventListener("pointermove", onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <Tag
      ref={ref as React.Ref<never>}
      className={className}
      // O gradiente do `.cr-spot` lê estas variáveis; começam no centro.
      style={{ "--sx": "50%", "--sy": "50%" } as CSSProperties}
    >
      {children}
    </Tag>
  );
}

/**
 * Paralaxe de ponteiro para o fundo do hero.
 *
 * Publica `--px` e `--py` entre -1 e 1 conforme o cursor atravessa a
 * seção; quem se move são só as manchas de luz do fundo, pela
 * propriedade `translate` — assim a animação de deriva, que usa
 * `transform`, continua rodando por baixo sem conflito.
 *
 * Só existe em ponteiro fino: no toque não há cursor para seguir, e
 * gastar bateria com isso seria trocar autonomia por nada.
 */
export function PointerAura({
  children,
  className = "",
  id,
  as: Tag = "section",
}: {
  children: ReactNode;
  className?: string;
  id?: string;
  as?: "section" | "div";
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    let frame = 0;
    let px = 0;
    let py = 0;

    const flush = () => {
      frame = 0;
      root.style.setProperty("--px", px.toFixed(3));
      root.style.setProperty("--py", py.toFixed(3));
    };

    const onMove = (event: PointerEvent) => {
      const box = root.getBoundingClientRect();
      px = ((event.clientX - box.left) / box.width) * 2 - 1;
      py = ((event.clientY - box.top) / box.height) * 2 - 1;
      if (!frame) frame = requestAnimationFrame(flush);
    };

    const onLeave = () => {
      px = 0;
      py = 0;
      if (!frame) frame = requestAnimationFrame(flush);
    };

    root.addEventListener("pointermove", onMove, { passive: true });
    root.addEventListener("pointerleave", onLeave, { passive: true });
    return () => {
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <Tag
      ref={ref as React.Ref<never>}
      id={id}
      className={className}
      style={{ "--px": 0, "--py": 0 } as CSSProperties}
    >
      {children}
    </Tag>
  );
}

/**
 * Filete de progresso de leitura no topo do cabeçalho.
 *
 * Onde houver `animation-timeline: scroll()` quem anima é o compositor,
 * sem tocar no thread principal. Nos demais navegadores, um listener
 * passivo com `requestAnimationFrame` faz o mesmo trabalho.
 */
export function ReadingProgress({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const supported =
      typeof CSS !== "undefined" &&
      CSS.supports?.("animation-timeline", "scroll()");
    // Sem estado em React: o atributo é a única coisa que muda.
    el.dataset.native = supported ? "true" : "false";
    if (supported) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const el = ref.current;
      if (!el) return;
      const max =
        document.documentElement.scrollHeight - window.innerHeight;
      const ratio = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
      el.style.setProperty("--cr-read", ratio.toFixed(4));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-native="true"
      className={`cr-progress bg-brand pointer-events-none h-[2px] w-full origin-left ${className}`}
    />
  );
}

/**
 * Conta até um número quando o bloco entra na tela.
 * Usado apenas para valores que já existem no texto — nunca para inventar
 * métricas: o número renderiza inteiro no HTML e a animação é enfeite.
 */
export function CountUp({
  to,
  duration = 1100,
  prefix = "",
  suffix = "",
  className = "",
}: {
  to: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState(to);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (typeof IntersectionObserver === "undefined") return;

    let frame = 0;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        const start = performance.now();
        const step = (now: number) => {
          const t = Math.min((now - start) / duration, 1);
          // easeOutExpo: chega rápido e assenta.
          const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
          setValue(Math.round(to * eased));
          if (t < 1) frame = requestAnimationFrame(step);
        };
        setValue(0);
        frame = requestAnimationFrame(step);
      },
      { threshold: 0.4 },
    );

    io.observe(el);
    return () => {
      io.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [to, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {value.toLocaleString("pt-BR")}
      {suffix}
    </span>
  );
}
