import type { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "@/components/ops/login-form";
import { Logo } from "@/components/logo";

export const metadata: Metadata = {
  title: "Entrar no Operations",
  robots: { index: false, follow: false },
};

export default async function OpsLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ proximo?: string }>;
}) {
  const { proximo } = await searchParams;

  return (
    <main className="bg-bg relative isolate flex min-h-[100dvh] items-center justify-center px-5 py-12">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="cr-contour absolute inset-0 opacity-50" />
        <div className="bg-brand absolute top-0 left-1/2 h-[22rem] w-[22rem] -translate-x-1/2 rounded-full opacity-[0.05] blur-[110px] dark:opacity-[0.08]" />
      </div>

      <div className="w-full max-w-[23rem]">
        <div className="flex justify-center">
          <Link href="/" aria-label="Canaã Resolve">
            <Logo className="h-8 w-auto" />
          </Link>
        </div>

        <div className="border-line bg-surface shadow-card mt-8 rounded-2xl border p-6 sm:p-7">
          <h1 className="text-[1.375rem] leading-tight tracking-[-0.02em]">
            Operations
          </h1>
          <p className="text-muted mt-1.5 text-[0.9375rem] leading-relaxed">
            O centro de comando do Canaã Resolve. O acesso é só da equipe.
          </p>

          <div className="mt-6">
            <LoginForm proximo={proximo} />
          </div>
        </div>

        <p className="text-faint mt-6 text-center text-[0.8125rem] leading-relaxed">
          Procurando o site?{" "}
          <Link href="/" className="text-brand-ink hover:text-brand-hover cr-link">
            Voltar ao Canaã Resolve
          </Link>
        </p>
      </div>
    </main>
  );
}
