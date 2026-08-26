"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type ReactNode,
  type Ref,
} from "react";

export type RevealAnim = "up" | "blur" | "scale" | "left" | "right";

/**
 * Revela o conteúdo quando ele entra na tela. Em `prefers-reduced-motion`
 * o CSS já neutraliza a transição, então nada aqui precisa ser desligado.
 *
 * O atributo `data-shown` também serve de gatilho para o que estiver
 * dentro: traços de SVG (`.cr-draw`) e trilhos (`.cr-rail`) escutam o
 * mesmo sinal, de modo que um bloco inteiro entra em cena junto.
 */
export function Reveal({
  children,
  delay = 0,
  anim = "up",
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  delay?: number;
  anim?: RevealAnim;
  className?: string;
  as?: ElementType;
}) {
  const ref = useRef<HTMLElement | null>(null);
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
      { rootMargin: "0px 0px -12% 0px", threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as Ref<HTMLElement>}
      className={`cr-reveal ${className}`}
      data-anim={anim}
      data-shown={shown ? "true" : "false"}
      style={delay ? ({ "--cr-delay": `${delay}ms` } as CSSProperties) : undefined}
    >
      {children}
    </Tag>
  );
}
