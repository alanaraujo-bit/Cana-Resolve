"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { cx } from "@/components/ui";

/**
 * Filtros que vivem na URL.
 *
 * Isso não é detalhe técnico: significa que uma busca pode ser guardada nos
 * favoritos, mandada para outra pessoa e sobreviver ao "voltar" do navegador.
 * O estado do trabalho fica no endereço, não escondido dentro de um componente.
 */

function useAtualizarFiltro() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pendente, startTransition] = useTransition();

  const atualizar = (mudancas: Record<string, string | null>) => {
    const proximos = new URLSearchParams(params.toString());
    for (const [chave, valor] of Object.entries(mudancas)) {
      if (valor === null || valor === "") proximos.delete(chave);
      else proximos.set(chave, valor);
    }
    // Qualquer filtro novo devolve à primeira página: continuar na página 7 de
    // um resultado que agora tem duas páginas só mostraria uma tela vazia.
    proximos.delete("pagina");
    startTransition(() => {
      router.replace(proximos.size ? `${pathname}?${proximos}` : pathname, {
        scroll: false,
      });
    });
  };

  return { atualizar, params, pendente };
}

export function SearchInput({
  placeholder = "Buscar…",
  param = "busca",
}: {
  placeholder?: string;
  param?: string;
}) {
  const { atualizar, params } = useAtualizarFiltro();
  const [valor, setValor] = useState(params.get(param) ?? "");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // A URL só muda quando a pessoa para de digitar: uma navegação por tecla
  // deixaria a lista piscando a cada letra.
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if ((params.get(param) ?? "") !== valor) atualizar({ [param]: valor || null });
    }, 320);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor]);

  return (
    <div className="relative w-full min-w-0 sm:w-auto sm:flex-1 sm:max-w-xs">
      <input
        type="search"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={cx(
          "border-line-strong bg-field text-ink placeholder:text-faint h-9 w-full rounded-lg border",
          "px-3 text-[0.875rem] outline-none transition-[border-color,box-shadow] duration-200",
          "focus:border-brand focus:shadow-[0_0_0_3px_var(--cr-brand-soft)]",
        )}
      />
    </div>
  );
}

export type Opcao = { id: string; label: string };

export function FilterSelect({
  param,
  label,
  opcoes,
  todos = "Todos",
  soDesktop = false,
}: {
  param: string;
  label: string;
  opcoes: Opcao[];
  todos?: string;
  /** Some no celular — para o que os filtros rápidos já cobrem. */
  soDesktop?: boolean;
}) {
  const { atualizar, params } = useAtualizarFiltro();
  const valor = params.get(param) ?? "";

  return (
    <label
      className={cx(
        "relative items-center",
        soDesktop ? "hidden sm:inline-flex" : "inline-flex",
      )}
    >
      <span className="sr-only">{label}</span>
      <select
        value={valor}
        onChange={(e) => atualizar({ [param]: e.target.value || null })}
        className={cx(
          "border-line-strong bg-field text-ink h-9 appearance-none rounded-lg border",
          "cursor-pointer py-0 pr-8 pl-3 text-[0.875rem] outline-none",
          "focus:border-brand focus:shadow-[0_0_0_3px_var(--cr-brand-soft)]",
          valor && "border-brand-line bg-brand-soft text-brand-ink",
        )}
      >
        <option value="">{todos}</option>
        {opcoes.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
      <span
        aria-hidden="true"
        className="text-faint pointer-events-none absolute right-3 text-[0.625rem]"
      >
        ▼
      </span>
    </label>
  );
}

/** Filtros rápidos: os cortes que a operação usa todo dia, a um toque. */
export function QuickFilters({
  param,
  opcoes,
  padrao = "",
}: {
  param: string;
  opcoes: Opcao[];
  padrao?: string;
}) {
  const { atualizar, params } = useAtualizarFiltro();
  const valor = params.get(param) ?? padrao;

  return (
    <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5">
      {opcoes.map((o) => {
        const ativo = valor === o.id;
        return (
          <button
            key={o.id || "todos"}
            type="button"
            onClick={() => atualizar({ [param]: o.id || null })}
            aria-pressed={ativo}
            className={cx(
              "h-8 shrink-0 rounded-lg border px-3 text-[0.8125rem] font-medium whitespace-nowrap",
              "transition-colors duration-150",
              ativo
                ? "border-brand-line bg-brand-soft text-brand-ink"
                : "border-line text-muted hover:border-line-strong hover:text-ink",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function FilterBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">{children}</div>
  );
}
