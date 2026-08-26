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

  const choose = useCallback((next: ThemePref) => {
    try {
      localStorage.setItem(KEY, next);
    } catch {}
    apply(next);
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return (
    <div
      role="radiogroup"
      aria-label="Aparência"
      className={cx(
        "border-line bg-surface-2 inline-flex items-center gap-0.5 rounded-full border p-0.5",
        className,
      )}
    >
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
            onClick={() => choose(id)}
            className={cx(
              "grid h-7 w-7 place-items-center rounded-full transition-colors duration-150",
              active ? "bg-raised text-brand-ink shadow-hair" : "text-faint hover:text-ink",
            )}
          >
            <Icon className="h-[15px] w-[15px]" />
          </button>
        );
      })}
    </div>
  );
}
