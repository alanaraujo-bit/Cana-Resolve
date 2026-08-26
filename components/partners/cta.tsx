"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { buttonClass } from "@/components/ui";
import { track } from "@/lib/analytics";

type Props = {
  href: string;
  children: ReactNode;
  /** Onde na página o botão está, para separar os cliques no funil. */
  local: string;
  variant?: "brand" | "accent" | "outline" | "ghost" | "surface";
  size?: "sm" | "md" | "lg";
  className?: string;
  external?: boolean;
};

/**
 * CTA da área de parceiros. Além de navegar, registra o clique — é assim
 * que vamos descobrir qual seção realmente convence.
 */
export function PartnerCta({
  href,
  children,
  local,
  variant = "brand",
  size = "lg",
  className = "",
  external = false,
}: Props) {
  const cls = buttonClass(variant, size, className);

  function onClick() {
    track(external ? "parceiros_whatsapp_click" : "parceiros_cta_click", {
      local,
      destino: href,
    });
  }

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClick}
        className={cls}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} onClick={onClick} scroll className={cls}>
      {children}
    </Link>
  );
}
