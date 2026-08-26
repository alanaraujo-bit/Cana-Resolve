"use client";

import { useEffect, useRef } from "react";
import { track, visitSource } from "@/lib/analytics";

/**
 * Instrumentação da página de parceiros: visita (com origem), seções
 * realmente vistas e saída sem conversão. Nada disso aparece para o
 * visitante — serve para evoluir a página com dado em vez de palpite.
 */
export function PartnersAnalytics({ sections = [] }: { sections?: string[] }) {
  /** Uma visita é uma visita — nem remontagem nem StrictMode contam duas. */
  const registrada = useRef(false);

  useEffect(() => {
    if (!registrada.current) {
      registrada.current = true;
      track("parceiros_page_view", visitSource());
    }

    const inicio = Date.now();
    const vistas = new Set<string>();
    let converteu = false;

    const onSubmit = () => {
      converteu = true;
    };
    document.addEventListener("cr:parceiro-enviado", onSubmit);

    let io: IntersectionObserver | undefined;
    if (typeof IntersectionObserver !== "undefined" && sections.length) {
      io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            const id = entry.target.id;
            if (!entry.isIntersecting || vistas.has(id)) continue;
            vistas.add(id);
            track("parceiros_section_view", { secao: id });
          }
        },
        { threshold: 0.35 },
      );
      for (const id of sections) {
        const el = document.getElementById(id);
        if (el) io.observe(el);
      }
    }

    const onLeave = () => {
      if (document.visibilityState !== "hidden" || converteu) return;
      track("parceiros_saida_sem_envio", {
        segundos: Math.round((Date.now() - inicio) / 1000),
        secoes_vistas: vistas.size,
      });
    };
    document.addEventListener("visibilitychange", onLeave);

    return () => {
      io?.disconnect();
      document.removeEventListener("visibilitychange", onLeave);
      document.removeEventListener("cr:parceiro-enviado", onSubmit);
    };
  }, [sections]);

  return null;
}
