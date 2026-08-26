"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Logo } from "./logo";
import { IconArrowRight, IconClose, IconMenu } from "./icons";
import { ThemeToggle } from "./theme";
import { ReadingProgress } from "./motion";
import { buttonClass, Container, cx } from "./ui";
import { nav } from "@/lib/site";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    /** O botão voltar do navegador também fecha o painel. */
    const onPop = () => setOpen(false);
    window.addEventListener("popstate", onPop);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    return () => {
      window.removeEventListener("popstate", onPop);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <header
        className={cx(
          "sticky top-0 z-50 transition-[background-color,border-color,backdrop-filter,box-shadow] duration-300",
          scrolled || open
            ? "border-line bg-bg/85 border-b shadow-hair backdrop-blur-md"
            : "border-b border-transparent",
        )}
      >
        <Container>
          <div
            className={cx(
              "flex items-center justify-between gap-4 transition-[height] duration-300",
              open
                ? "h-16"
                : scrolled
                  ? "h-14 sm:h-16"
                  : "h-16 sm:h-[4.5rem]",
            )}
          >
            <Link
              href="/"
              className="group -m-1 rounded-lg p-1"
              aria-label="Canaã Resolve — início"
            >
              <Logo
                markClassName="h-[30px] w-[30px] transition-transform duration-500 ease-[cubic-bezier(0.22,1.35,0.36,1)] group-hover:-rotate-6 group-hover:scale-105"
              />
            </Link>

            <nav aria-label="Principal" className="hidden lg:block">
              <ul className="flex items-center gap-1">
                {nav.map((item) => {
                  const active =
                    item.href.startsWith("/parceiros") &&
                    pathname.startsWith("/parceiros");
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        data-active={active ? "true" : "false"}
                        className={cx(
                          "cr-navlink relative rounded-lg px-3 py-2 text-[0.9375rem] transition-colors",
                          active
                            ? "text-ink"
                            : "text-muted hover:text-ink hover:bg-surface-2",
                        )}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <div className="hidden items-center gap-2 lg:flex">
              <ThemeToggle />
              <Link
                href="/solicitar"
                className={buttonClass("brand", "sm", "cr-sheen px-4")}
              >
                Solicitar serviço
                <IconArrowRight className="cr-nudge h-4 w-4" />
              </Link>
            </div>

            <div className="flex items-center gap-2 lg:hidden">
              <Link href="/solicitar" className={buttonClass("brand", "sm")}>
                <span className="sm:hidden">Solicitar</span>
                <span className="hidden sm:inline">Solicitar serviço</span>
              </Link>
              <button
                ref={triggerRef}
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-controls="menu-mobile"
                className="border-line text-ink hover:bg-surface-2 active:scale-95 grid h-10 w-10 place-items-center rounded-xl border transition-[background-color,transform] duration-200"
              >
                <span className="sr-only">
                  {open ? "Fechar menu" : "Abrir menu"}
                </span>
                <span className="relative grid h-5 w-5 place-items-center">
                  <IconMenu
                    className={cx(
                      "absolute h-5 w-5 transition-all duration-300 ease-[cubic-bezier(0.22,1.35,0.36,1)]",
                      open ? "scale-75 rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100",
                    )}
                  />
                  <IconClose
                    className={cx(
                      "absolute h-5 w-5 transition-all duration-300 ease-[cubic-bezier(0.22,1.35,0.36,1)]",
                      open ? "scale-100 rotate-0 opacity-100" : "scale-75 -rotate-90 opacity-0",
                    )}
                  />
                </span>
              </button>
            </div>
          </div>
        </Container>

        {/* Progresso de leitura: um filete que acompanha a página. */}
        <ReadingProgress className="absolute inset-x-0 bottom-0 opacity-70" />
      </header>

      {/* Painel mobile */}
      <div
        id="menu-mobile"
        ref={panelRef}
        hidden={!open}
        className="border-line bg-bg fixed inset-x-0 top-16 bottom-0 z-40 overflow-y-auto border-t lg:hidden"
      >
        <Container className="flex min-h-full flex-col py-6">
          <ul className="flex flex-col">
            {nav.map((item, i) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="cr-enter border-line text-ink group flex items-center justify-between border-b py-4 font-display text-xl"
                  style={{ "--cr-delay": `${40 + i * 60}ms` } as React.CSSProperties}
                >
                  {item.label}
                  <IconArrowRight className="cr-nudge text-faint h-4 w-4" />
                </Link>
              </li>
            ))}
          </ul>

          <div
            className="cr-enter mt-8 flex flex-col gap-3"
            style={{ "--cr-delay": "240ms" } as React.CSSProperties}
          >
            <Link
              href="/solicitar"
              onClick={() => setOpen(false)}
              className={buttonClass("brand", "lg", "w-full")}
            >
              Solicitar serviço
              <IconArrowRight className="h-[18px] w-[18px]" />
            </Link>
            <Link
              href="/parceiros"
              onClick={() => setOpen(false)}
              className={buttonClass("outline", "lg", "w-full")}
            >
              Sou profissional
            </Link>
          </div>

          <div
            className="cr-enter mt-auto flex items-center justify-between pt-10"
            style={{ "--cr-delay": "300ms" } as React.CSSProperties}
          >
            <span className="text-muted text-sm">Aparência</span>
            <ThemeToggle />
          </div>
        </Container>
      </div>
    </>
  );
}
