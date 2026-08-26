"use client";

import { useEffect, useRef } from "react";
import { track } from "@/lib/analytics";

/** Eventos agregados do caminho de quem procura um serviço, sem dados do pedido. */
export function ConsumerAnalytics({ page }: { page: "home" | "solicitar" }) {
  const registered = useRef(false);

  useEffect(() => {
    if (registered.current) return;
    registered.current = true;
    track("consumidor_page_view", { pagina_origem: page });
  }, [page]);

  return null;
}
