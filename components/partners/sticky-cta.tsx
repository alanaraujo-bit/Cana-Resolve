"use client";

import { useEffect, useState } from "react";
import { IconArrowRight } from "@/components/icons";
import { buttonClass } from "@/components/ui";
import { track } from "@/lib/analytics";
import { founder } from "@/lib/partners";

/**
 * Barra de ação fixa no mobile.
 *
 * Aparece só depois que o hero sai da tela e some quando o formulário
 * entra — ninguém precisa de um botão insistindo enquanto preenche o
 * cadastro. No desktop não existe: o CTA do topo continua acessível.
 */
export function StickyCta({
  watchId = "cadastro",
  heroId = "topo-parceiros",
}: {
  watchId?: string;
  heroId?: string;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const hero = document.getElementById(heroId);
    const alvo = document.getElementById(watchId);
    if (!hero || typeof IntersectionObserver === "undefined") return;

    const estado = { hero: true, alvo: false };
    const aplicar = () => setVisible(!estado.hero && !estado.alvo);

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.target === hero) estado.hero = entry.isIntersecting;
          if (entry.target === alvo) estado.alvo = entry.isIntersecting;
        }
        aplicar();
      },
      { threshold: 0 },
    );

    io.observe(hero);
    if (alvo) io.observe(alvo);
    return () => io.disconnect();
  }, [watchId, heroId]);

  return (
    <>
      {/* Espaço para que a barra nunca cubra o fim do conteúdo. */}
      <div aria-hidden="true" className="h-16 lg:hidden" />

      {visible ? (
        <div className="cr-dock border-line bg-bg/92 fixed inset-x-0 bottom-0 z-40 border-t px-4 pt-3 backdrop-blur-md lg:hidden">
          <div className="mx-auto flex max-w-lg items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-ink text-[0.8125rem] leading-tight font-medium">
                Parceiro Fundador
              </p>
              <p className="text-faint text-[0.75rem] leading-tight">
                {founder.price} por {founder.period}
              </p>
            </div>
            <a
              href={`#${watchId}`}
              onClick={() =>
                track("parceiros_cta_click", { local: "barra-fixa", destino: `#${watchId}` })
              }
              className={buttonClass("brand", "md", "shrink-0")}
            >
              Quero ser parceiro
              <IconArrowRight className="h-[18px] w-[18px]" />
            </a>
          </div>
        </div>
      ) : null}
    </>
  );
}
