"use client";

import { useCallback, useSyncExternalStore } from "react";
import { IconDevice, IconMoon, IconSun } from "./icons";
import { cx } from "./ui";
import { THEME_KEY as KEY } from "@/lib/theme-script";

export type ThemePref = "light" | "system" | "dark";

const EVENT = "cr:theme";

function resolvedIsDark(pref: ThemePref) {
  return (
    pref === "dark" ||
    (pref === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)
  );
}

function apply(pref: ThemePref) {
  const root = document.documentElement;
  root.setAttribute("data-theme", resolvedIsDark(pref) ? "dark" : "light");
  root.setAttribute("data-theme-pref", pref);
}

/**
 * A preferência vive no atributo que o script inline já escreveu no <html>.
 * Ler dali evita um segundo estado em React — e a piscada que vem com ele.
 */
function subscribe(onChange: () => void) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const onSystemChange = () => {
    const pref = document.documentElement.getAttribute("data-theme-pref");
    if (pref === "system" || pref === null) apply("system");
    onChange();
  };
  window.addEventListener(EVENT, onChange);
  mq.addEventListener("change", onSystemChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    mq.removeEventListener("change", onSystemChange);
  };
}

function getSnapshot(): ThemePref {
  const v = document.documentElement.getAttribute("data-theme-pref");
  return v === "light" || v === "dark" ? v : "system";
}

/**
 * A troca de tema abre em círculo a partir do botão tocado.
 *
 * Onde a View Transitions API não existe — ou onde o movimento está
 * reduzido — a mudança acontece do mesmo jeito, só que instantânea.
 * O `data-vt` limita as regras de `::view-transition` a este momento,
 * sem interferir na transição entre páginas.
 */
function withCircularWipe(origin: DOMRect | null, mutate: () => void) {
  const root = document.documentElement;
  const start =
    (document as Document & {
      startViewTransition?: (cb: () => void) => { finished: Promise<void> };
    }).startViewTransition;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!start || !origin || reduced) {
    mutate();
    return;
  }

  const x = origin.left + origin.width / 2;
  const y = origin.top + origin.height / 2;
  const radius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  );

  root.style.setProperty("--cr-vt-x", `${x}px`);
  root.style.setProperty("--cr-vt-y", `${y}px`);
  root.style.setProperty("--cr-vt-r", `${radius}px`);
  root.setAttribute("data-vt", "tema");

  const transition = start.call(document, mutate);
  transition.finished.finally(() => root.removeAttribute("data-vt"));
}

const options: { id: ThemePref; label: string; Icon: typeof IconSun }[] = [
  { id: "light", label: "Tema claro", Icon: IconSun },
  { id: "system", label: "Seguir o dispositivo", Icon: IconDevice },
  { id: "dark", label: "Tema escuro", Icon: IconMoon },
];

export function ThemeToggle({ className = "" }: { className?: string }) {
  const pref = useSyncExternalStore<ThemePref>(
    subscribe,
    getSnapshot,
    () => "system",
  );

  const choose = useCallback((next: ThemePref, origin: DOMRect | null) => {
    withCircularWipe(origin, () => {
      try {
        localStorage.setItem(KEY, next);
      } catch {}
      apply(next);
      window.dispatchEvent(new Event(EVENT));
    });
  }, []);

  const index = Math.max(
    options.findIndex((o) => o.id === pref),
    0,
  );

  return (
    <div
      role="radiogroup"
      aria-label="Aparência"
      className={cx(
        "border-line bg-surface-2 relative inline-flex items-center gap-0.5 rounded-full border p-0.5",
        className,
      )}
    >
      {/* Marcador que desliza até a opção escolhida. */}
      <span
        aria-hidden="true"
        className="bg-raised shadow-hair absolute top-0.5 left-0.5 h-7 w-7 rounded-full transition-transform duration-300 ease-[cubic-bezier(0.22,1.35,0.36,1)]"
        style={{ transform: `translateX(${index * 1.875}rem)` }}
      />
      {options.map(({ id, label, Icon }) => {
        const active = pref === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={(event) =>
              choose(id, event.currentTarget.getBoundingClientRect())
            }
            className={cx(
              "relative z-10 grid h-7 w-7 place-items-center rounded-full transition-colors duration-200",
              active ? "text-brand-ink" : "text-faint hover:text-ink",
            )}
          >
            <Icon
              className={cx(
                "h-[15px] w-[15px] transition-transform duration-300 ease-[cubic-bezier(0.22,1.35,0.36,1)]",
                active ? "scale-110" : "scale-100",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
