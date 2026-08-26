"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";

/**
 * Transição entre páginas.
 *
 * A primeira renderização nunca anima: quem acabou de abrir o site já
 * esperou o suficiente, e atrasar o conteúdo com um fade seria pagar em
 * velocidade por um efeito. A partir da segunda rota, cada troca entra
 * com o mesmo gesto curto do resto do site.
 *
 * O sinalizador vive no módulo, não em estado: ele só precisa sobreviver
 * entre navegações do cliente e voltar a `false` num recarregamento.
 */
let jaMontou = false;

export function RouteTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const animar = jaMontou;

  useEffect(() => {
    jaMontou = true;
  }, []);

  return (
    <div key={pathname} className={animar ? "cr-page-enter" : undefined}>
      {children}
    </div>
  );
}
