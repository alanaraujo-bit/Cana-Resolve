"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { LogoMark } from "@/components/logo";
import { ThemeToggle } from "@/components/theme";
import {
  IconCatalog,
  IconChart,
  IconFunnel,
  IconGear,
  IconHandoff,
  IconInbox,
  IconMore,
  IconNetwork,
  IconPulse,
  IconRequest,
  IconUser,
} from "@/components/ops/icons";
import { cx } from "@/components/ui";
import { activeNav, opsNav, type NavItem } from "@/lib/ops-nav";

/**
 * A casca do Operations.
 *
 * Duas experiências de verdade, não uma esticada:
 *
 * - **No desktop**, uma coluna fixa à esquerda com todos os destinos sempre
 *   visíveis. Quem trabalha aqui o dia inteiro precisa alcançar qualquer área
 *   em um clique, sem abrir menu.
 * - **No celular**, uma barra inferior com os quatro destinos do dia a dia e
 *   uma folha para o resto. O polegar alcança tudo, nada depende de hover e a
 *   estrutura não se mexe quando o teclado abre.
 */

const icons = {
  pulse: IconPulse,
  funnel: IconFunnel,
  inbox: IconInbox,
  network: IconNetwork,
  request: IconRequest,
  handoff: IconHandoff,
  catalog: IconCatalog,
  chart: IconChart,
  gear: IconGear,
};

function NavIcon({ name, className }: { name: NavItem["icon"]; className?: string }) {
  const Icon = icons[name];
  return <Icon className={className} />;
}

function SidebarLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      title={item.hint}
      aria-current={active ? "page" : undefined}
      className={cx(
        "group relative flex items-center gap-2.5 rounded-lg px-2.5 py-[7px]",
        "text-[0.875rem] transition-colors duration-150",
        active
          ? "bg-surface-3 text-ink font-medium"
          : "text-muted hover:text-ink hover:bg-surface-2",
      )}
    >
      {/* A marca do item ativo é um filete, não um bloco de cor. */}
      <span
        aria-hidden="true"
        className={cx(
          "bg-brand absolute top-1.5 bottom-1.5 -left-2 w-[3px] rounded-full transition-opacity",
          active ? "opacity-100" : "opacity-0",
        )}
      />
      <NavIcon
        name={item.icon}
        className={cx("h-[18px] w-[18px] shrink-0", active ? "text-brand-ink" : "")}
      />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function UserMenu({
  user,
  onSair,
}: {
  user: { name: string; email: string; role: string };
  onSair: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const initials = user.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={cx(
          "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left",
          "hover:bg-surface-2 transition-colors",
        )}
      >
        <span className="bg-brand-soft text-brand-ink grid h-8 w-8 shrink-0 place-items-center rounded-full text-[0.75rem] font-semibold">
          {initials || <IconUser className="h-4 w-4" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="text-ink block truncate text-[0.8125rem] font-medium">
            {user.name}
          </span>
          <span className="text-faint block truncate text-[0.75rem]">
            {user.role === "owner" ? "Responsável" : "Operador"}
          </span>
        </span>
      </button>

      {open ? (
        <div
          role="menu"
          className="border-line bg-surface shadow-lift absolute right-0 bottom-full left-0 z-30 mb-2 rounded-xl border p-1.5"
        >
          <p className="text-faint truncate px-2.5 py-1.5 text-[0.75rem]">
            {user.email}
          </p>
          <Link
            href="/ops/config"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="text-muted hover:text-ink hover:bg-surface-2 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[0.8125rem] transition-colors"
          >
            <IconGear className="h-4 w-4" />
            Configurações
          </Link>
          <div className="border-line my-1.5 border-t" />
          {onSair}
        </div>
      ) : null}
    </div>
  );
}

export function OpsShell({
  user,
  sairButton,
  children,
}: {
  user: { name: string; email: string; role: string };
  sairButton: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const current = activeNav(pathname);
  const [maisAberto, setMaisAberto] = useState(false);

  const primarios = opsNav.filter((item) => item.primary);
  const secundarios = opsNav.filter((item) => !item.primary);

  return (
    <div className="ops-root bg-bg flex min-h-[100dvh] flex-col lg:flex-row">
      {/* ---------- coluna do desktop ---------- */}
      <aside className="border-line bg-surface-2 sticky top-0 hidden h-[100dvh] w-[15rem] shrink-0 flex-col border-r lg:flex">
        <div className="px-5 pt-5 pb-4">
          <Link href="/ops" className="flex items-center gap-2.5">
            <LogoMark className="h-7 w-7" />
            <span className="min-w-0">
              <span className="text-ink block font-sans text-[0.875rem] leading-tight font-semibold">
                Canaã Resolve
              </span>
              <span className="text-faint block text-[0.6875rem] leading-tight tracking-[0.1em] uppercase">
                Operations
              </span>
            </span>
          </Link>
        </div>

        <nav aria-label="Áreas do Operations" className="flex-1 overflow-y-auto px-5 pb-4">
          <ul className="space-y-0.5">
            {opsNav.map((item) => (
              <li key={item.href}>
                <SidebarLink item={item} active={current?.href === item.href} />
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-line space-y-1 border-t px-3 py-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-faint text-[0.75rem]">Tema</span>
            <ThemeToggle />
          </div>
          <UserMenu user={user} onSair={sairButton} />
        </div>
      </aside>

      {/* ---------- barra do celular ---------- */}
      <header className="border-line bg-surface/85 sticky top-0 z-30 flex items-center justify-between gap-3 border-b px-4 py-2.5 backdrop-blur-md lg:hidden">
        <Link href="/ops" className="flex min-w-0 items-center gap-2">
          <LogoMark className="h-6 w-6 shrink-0" />
          <span className="text-ink truncate font-sans text-[0.875rem] font-semibold">
            {current?.label ?? "Operations"}
          </span>
        </Link>
        <ThemeToggle />
      </header>

      {/* ---------- conteúdo ---------- */}
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 px-4 pt-5 pb-[calc(4.75rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-8 lg:py-7 lg:pb-10">
          <div className="mx-auto w-full max-w-[84rem]">{children}</div>
        </main>
      </div>

      {/* ---------- barra inferior do celular ---------- */}
      <nav
        aria-label="Navegação principal"
        className="border-line bg-surface/92 fixed inset-x-0 bottom-0 z-30 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
      >
        <ul className="grid grid-cols-5">
          {primarios.map((item) => {
            const active = current?.href === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cx(
                    "flex flex-col items-center gap-1 py-2 transition-colors",
                    active ? "text-brand-ink" : "text-faint",
                  )}
                >
                  <NavIcon name={item.icon} className="h-[21px] w-[21px]" />
                  <span className="text-[0.6875rem] leading-none font-medium">
                    {item.short}
                  </span>
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setMaisAberto(true)}
              aria-expanded={maisAberto}
              className={cx(
                "flex w-full flex-col items-center gap-1 py-2 transition-colors",
                secundarios.some((item) => item.href === current?.href)
                  ? "text-brand-ink"
                  : "text-faint",
              )}
            >
              <IconMore className="h-[21px] w-[21px]" />
              <span className="text-[0.6875rem] leading-none font-medium">Mais</span>
            </button>
          </li>
        </ul>
      </nav>

      {/* ---------- folha "Mais" ---------- */}
      {maisAberto ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Fechar"
            onClick={() => setMaisAberto(false)}
            className="absolute inset-0 bg-[rgb(0_0_0/0.4)] backdrop-blur-[2px]"
          />
          <div className="border-line bg-surface animate-[cr-sheet_.22s_cubic-bezier(.22,1,.36,1)] absolute inset-x-0 bottom-0 rounded-t-2xl border-t px-4 pt-2 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <span
              aria-hidden="true"
              className="bg-line-strong mx-auto mb-3 block h-1 w-9 rounded-full"
            />
            <ul className="space-y-0.5 pb-2">
              {secundarios.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    // A folha fecha no toque, e não num efeito depois da
                    // navegação: assim o destino nunca aparece coberto.
                    onClick={() => setMaisAberto(false)}
                    className={cx(
                      "flex items-center gap-3 rounded-lg px-2.5 py-3 transition-colors",
                      current?.href === item.href
                        ? "bg-surface-3 text-ink font-medium"
                        : "text-muted",
                    )}
                  >
                    <NavIcon name={item.icon} className="h-5 w-5 shrink-0" />
                    <span className="min-w-0">
                      <span className="block text-[0.9375rem] leading-tight">
                        {item.label}
                      </span>
                      <span className="text-faint block text-[0.8125rem] leading-tight">
                        {item.hint}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="border-line flex items-center justify-between border-t pt-3">
              <span className="min-w-0">
                <span className="text-ink block truncate text-[0.875rem] font-medium">
                  {user.name}
                </span>
                <span className="text-faint block truncate text-[0.75rem]">
                  {user.email}
                </span>
              </span>
              {sairButton}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
