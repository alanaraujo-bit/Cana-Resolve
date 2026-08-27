"use client";

import { useEffect, useSyncExternalStore } from "react";

/**
 * Registra o cache mínimo e só informa a ausência de rede quando ela importa.
 *
 * O estado da conexão vem de `useSyncExternalStore`, e não de `useState` mais
 * efeito. Não é preciosismo: `navigator.onLine` é um sistema externo, e o React
 * precisa saber disso para hidratar direito. O instantâneo do servidor é sempre
 * "conectado" — ele não tem como saber, e o Node moderno tem um `navigator`
 * global cujo `onLine` é `undefined`. Ler dali durante a renderização fazia o
 * servidor mandar a faixa de "sem conexão" em toda página e o navegador
 * desmontá-la, quebrando a hidratação do site inteiro.
 */
function assinar(mudou: () => void) {
  window.addEventListener("online", mudou);
  window.addEventListener("offline", mudou);
  return () => {
    window.removeEventListener("online", mudou);
    window.removeEventListener("offline", mudou);
  };
}

export function PwaBootstrap() {
  const offline = useSyncExternalStore(
    assinar,
    () => !navigator.onLine,
    () => false,
  );

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
    }
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      className="bg-accent text-on-accent fixed inset-x-0 bottom-0 z-[70] px-4 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] text-center text-sm font-medium"
    >
      Você está sem conexão. Dados já abertos continuam disponíveis; ações serão
      retomadas quando a internet voltar.
    </div>
  );
}
