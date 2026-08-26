"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Logo } from "./logo";
import { IconClose, IconMenu } from "./icons";
import { ThemeToggle } from "./theme";
import { buttonClass, Container, cx } from "./ui";
import { nav } from "@/lib/site";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

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
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <header
        className={cx(
          "sticky top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-300",
          scrolled || open
            ? "border-line bg-bg/85 border-b backdrop-blur-md"
            : "border-b border-transparent",
        )}
      >
        <Container>
          <div className="flex h-16 items-center justify-between gap-4 sm:h-[4.5rem]">
            <Link
              href="/"
              className="-m-1 rounded-lg p-1"
              aria-label="Canaã Resolve — início"
            >
              <Logo markClassName="h-[30px] w-[30px]" />
            </Link>

            <nav aria-label="Principal" className="hidden lg:block">
              <ul className="flex items-center gap-1">
                {nav.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-muted hover:text-ink hover:bg-surface-2 rounded-lg px-3 py-2 text-[0.9375rem] transition-colors"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="hidden items-center gap-2 lg:flex">
              <ThemeToggle />
              <Link
                href="/entrar"
                className={buttonClass("ghost", "sm", "px-3")}
              >
                Entrar
              </Link>
              <Link
                href="/solicitar"
                className={buttonClass("brand", "sm", "px-4")}
              >
                Solicitar serviço
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
                className="border-line text-ink hover:bg-surface-2 grid h-10 w-10 place-items-center rounded-xl border transition-colors"
              >
                <span className="sr-only">
                  {open ? "Fechar menu" : "Abrir menu"}
                </span>
                {open ? (
                  <IconClose className="h-5 w-5" />
                ) : (
                  <IconMenu className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </Container>
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
            {nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="border-line text-ink flex items-center justify-between border-b py-4 font-display text-xl"
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/entrar"
                onClick={() => setOpen(false)}
                className="border-line text-ink flex items-center justify-between border-b py-4 font-display text-xl"
              >
                Entrar
              </Link>
            </li>
          </ul>

          <div className="mt-8 flex flex-col gap-3">
            <Link
              href="/solicitar"
              onClick={() => setOpen(false)}
              className={buttonClass("brand", "lg", "w-full")}
            >
              Solicitar serviço
            </Link>
            <Link
              href="/parceiros"
              onClick={() => setOpen(false)}
              className={buttonClass("outline", "lg", "w-full")}
            >
              Sou profissional
            </Link>
          </div>

          <div className="mt-auto flex items-center justify-between pt-10">
            <span className="text-muted text-sm">Aparência</span>
            <ThemeToggle />
          </div>
        </Container>
      </div>
    </>
  );
}
