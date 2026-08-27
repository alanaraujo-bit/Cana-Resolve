import Link from "next/link";
import type { ReactNode } from "react";

import { IconExit, IconHandoff, IconPlus, IconUser } from "@/components/ops/icons";
import { IconBell, IconHome } from "@/components/icons";
import { Logo, LogoMark } from "@/components/logo";
import { ThemeToggle } from "@/components/theme";
import { cx } from "@/components/ui";
import { leavePartner, leaveResident } from "@/app/actions/audience";

/**
 * A casca dos dois apps de consumidor — Morador e Parceiro.
 *
 * Não é a mesma tela do Operations, redecorada. Lá o público passa horas
 * operando; aqui alguém entra, resolve uma coisa e sai. Por isso a densidade
 * é menor, os alvos de toque são maiores e a barra inferior é a navegação
 * principal, não um resumo da lateral.
 *
 * Mas é o mesmo Canaã Resolve: a marca, os tokens de cor, o mesmo componente
 * de tema. `PortalShell` é o esqueleto comum; `ResidentShell` e `PartnerShell`
 * só escolhem a navegação e o rótulo — cada público continua com a própria
 * interface, como pede o princípio de "identidade única, telas distintas".
 */

type NavIconName = "inicio" | "pedir" | "oportunidades" | "perfil" | "atualizacoes";

type NavItem = { href: string; label: string; icon: NavIconName };

const icons = {
  inicio: IconHome,
  pedir: IconPlus,
  oportunidades: IconHandoff,
  perfil: IconUser,
  atualizacoes: IconBell,
};

function NavIcon({ name, className }: { name: NavIconName; className?: string }) {
  const Icon = icons[name];
  return <Icon className={className} />;
}

function PortalShell({
  nav,
  eyebrow,
  leaveAction,
  leaveLabel,
  title,
  children,
}: {
  nav: NavItem[];
  eyebrow: string;
  leaveAction: () => Promise<void>;
  leaveLabel: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="bg-bg min-h-dvh pb-[calc(5.25rem+env(safe-area-inset-bottom))] lg:pb-0">
      <header className="border-line bg-bg/90 sticky top-0 z-30 border-b backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-2 px-4 sm:gap-4 sm:px-6">
          <Logo className="shrink-0" />
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <span className="text-faint hidden text-xs sm:block">{eyebrow}</span>
            <ThemeToggle />
            <form action={leaveAction}>
              <button
                type="submit"
                title={leaveLabel}
                className="text-muted hover:text-ink hover:bg-surface-2 grid h-9 w-9 place-items-center rounded-lg transition-colors"
              >
                <IconExit className="h-4 w-4" />
                <span className="sr-only">{leaveLabel}</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      {/*
        `grid` só entra a partir de `lg:` — de propósito. Abaixo disso a
        `<aside>` está `hidden`, então um `grid` incondicional aqui vira uma
        grade de uma coluna só sem `grid-template-columns` definido, e essa
        coluna se dimensiona pelo max-content do texto mais longo lá dentro
        (a descrição de uma solicitação ou oportunidade), estourando a
        largura da tela. Sem `grid` no mobile, `<main>` é só um bloco comum e
        preenche 100% do contêiner, como qualquer `<div>`.
      */}
      <div className="mx-auto max-w-6xl lg:grid lg:grid-cols-[13rem_1fr] lg:gap-10 lg:px-6">
        <aside className="hidden py-8 lg:block">
          <nav className="space-y-1">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-muted hover:bg-surface-2 hover:text-ink flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium"
              >
                <NavIcon name={item.icon} className="h-[18px] w-[18px] shrink-0" />
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="px-4 py-7 sm:px-6 sm:py-9 lg:px-0">
          <h1 className="sr-only">{title}</h1>
          {children}
        </main>
      </div>

      <nav
        aria-label="Navegação principal"
        className={cx(
          "border-line bg-surface/95 fixed inset-x-0 bottom-0 z-40 grid border-t px-2 pt-1 backdrop-blur lg:hidden",
          "pb-[env(safe-area-inset-bottom)]",
          nav.length === 4 ? "grid-cols-4" : "grid-cols-3",
        )}
      >
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="text-muted hover:text-brand-ink flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-center text-[0.6875rem] font-medium"
          >
            <NavIcon name={item.icon} className="h-5 w-5" />
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

const residentNav: NavItem[] = [
  { href: "/acompanhar", label: "Início", icon: "inicio" },
  { href: "/solicitar", label: "Pedir ajuda", icon: "pedir" },
  { href: "/acompanhar/notificacoes", label: "Atualizações", icon: "atualizacoes" },
];

const partnerNav: NavItem[] = [
  { href: "/parceiro", label: "Início", icon: "inicio" },
  { href: "/parceiro/oportunidades", label: "Oportunidades", icon: "oportunidades" },
  { href: "/parceiro/perfil", label: "Perfil", icon: "perfil" },
  { href: "/parceiro/notificacoes", label: "Atualizações", icon: "atualizacoes" },
];

export function ResidentShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <PortalShell nav={residentNav} eyebrow="Seu espaço" leaveAction={leaveResident} leaveLabel="Sair deste aparelho" title={title}>
      {children}
    </PortalShell>
  );
}

export function PartnerShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <PortalShell nav={partnerNav} eyebrow="Sua empresa" leaveAction={leavePartner} leaveLabel="Sair" title={title}>
      {children}
    </PortalShell>
  );
}

/** Cabeçalho mínimo para telas fora de sessão — sem navegação nem "sair". */
export function PortalHeader() {
  return (
    <header className="px-4 py-[max(1.5rem,env(safe-area-inset-top))] sm:px-6">
      <div className="mx-auto flex max-w-4xl items-center justify-between">
        <LogoMark className="h-8 w-8" />
        <ThemeToggle />
      </div>
    </header>
  );
}
